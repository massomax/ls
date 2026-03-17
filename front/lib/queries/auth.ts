import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, isApiError } from "@/lib/api/apiError";
import {
  loginSmsRequest,
  loginSmsVerify,
  logout,
  type LoginSmsRequestBody,
  type LoginSmsVerifyBody,
  type LoginSmsVerifyResponse,
} from "@/lib/api/auth";
import { setAccessToken } from "@/lib/api/tokenStore";
import { addFavorite } from "@/lib/api/favorites";

function parseLocalFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

async function syncLocalFavoritesToServer() {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem("lp_favorites");
  const ids = parseLocalFavorites(raw);
  if (ids.length === 0) return;

  for (const productId of ids) {
    try {
      await addFavorite(productId);
    } catch (error) {
      if (isApiError(error) && error.code === "AlreadyInFavorites") continue;
    }
  }

  window.localStorage.removeItem("lp_favorites");
}

export function useLoginSmsRequest() {
  return useMutation<void, ApiError, LoginSmsRequestBody>({
    mutationFn: loginSmsRequest,
  });
}

export function useLoginSmsVerify() {
  const queryClient = useQueryClient();

  return useMutation<LoginSmsVerifyResponse, ApiError, LoginSmsVerifyBody>({
    mutationFn: loginSmsVerify,
    onSuccess: (data) => {
      setAccessToken(data.accessToken, { persist: true });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      void syncLocalFavoritesToServer().then(() => {
        void queryClient.invalidateQueries({ queryKey: ["favorites"] });
      });
    },
  });
}

export function useLogout() {
  return useMutation<void, ApiError>({
    mutationFn: logout,
  });
}
