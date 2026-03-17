export type ApiErrorPayload = {
  error: string;
  message?: string;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message ?? payload.error ?? "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = payload.error ?? "UnknownError";
    this.details = payload.details;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function isApiError(e: unknown): e is ApiError {
  if (e instanceof ApiError) return true;
  if (!isRecord(e)) return false;
  return (
    e["name"] === "ApiError" &&
    typeof e["status"] === "number" &&
    typeof e["code"] === "string"
  );
}
