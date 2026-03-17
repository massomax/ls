import { ApiError, type ApiErrorPayload } from "./apiError";
import { clearAccessToken, getAccessToken, setAccessToken } from "./tokenStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ApiRequestOptions = {
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * По умолчанию true: добавляем Authorization, если есть токен.
   * Для публичных ручек можно оставить как есть — если токена нет, заголовка не будет.
   */
  auth?: boolean;
  /**
   * По умолчанию true: при 401 пробуем refresh один раз и повторяем запрос.
   * Для /auth/refresh ставим false (иначе зациклится).
   */
  retryAuth?: boolean;
};

let refreshInFlight: Promise<string | null> | null = null;

function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(cleanPath, base);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  return url.toString();
}

async function parseJsonSafe(res: Response): Promise<unknown | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  // Ставим "замок", чтобы при множественных 401 был один refresh.
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const url = buildUrl("/auth/refresh");
      const res = await fetch(url, {
        method: "POST",
        credentials: "include", // refreshToken cookie
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "cache-control": "no-cache",
          pragma: "no-cache",
        },
      });

      if (!res.ok) {
        // refresh не удался — значит сессии нет
        clearAccessToken({ persist: true });
        return null;
      }

      const data = (await parseJsonSafe(res)) as {
        accessToken?: string;
      } | null;
      const token = data?.accessToken ?? null;

      if (token) setAccessToken(token, { persist: true });
      else clearAccessToken({ persist: true });

      return token;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  opts: ApiRequestOptions = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const url = buildUrl(path, opts.query);

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  const isFormData =
    typeof FormData !== "undefined" && opts.body instanceof FormData;
  const wantJson =
    opts.body !== undefined &&
    opts.body !== null &&
    method !== "GET" &&
    !isFormData;
  if (wantJson && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }

  if (opts.auth !== false) {
    const token = getAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const body: BodyInit | null | undefined =
    opts.body !== undefined && opts.body !== null && method !== "GET"
      ? isFormData
        ? (opts.body as FormData)
        : JSON.stringify(opts.body)
      : undefined;

  const res = await fetch(url, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...headers,
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
    body,
  });

  if (res.ok) {
    // 204 No Content
    if (res.status === 204) return undefined as T;

    const data = await parseJsonSafe(res);
    // Если контент не JSON — вернем текст (редко, но пусть будет)
    if (data === null) return (await res.text()) as unknown as T;
    return data as T;
  }

  // Ошибка
  const payload = ((await parseJsonSafe(res)) ?? {
    error: "RequestFailed",
    message: `HTTP ${res.status}`,
  }) as ApiErrorPayload;

  // 401 -> пробуем refresh и повторяем запрос один раз
  if (res.status === 401 && opts.retryAuth !== false) {
    const token = await refreshAccessToken();
    if (token) {
      return apiRequest<T>(path, { ...opts, retryAuth: false });
    }
  }

  throw new ApiError(res.status, payload);
}

// Удобные алиасы
export const apiGet = <T>(path: string, query?: ApiRequestOptions["query"]) =>
  apiRequest<T>(path, { method: "GET", query });

export const apiPost = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "POST", body });

export const apiPatch = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "PATCH", body });

export const apiDelete = <T>(path: string) =>
  apiRequest<T>(path, { method: "DELETE" });
