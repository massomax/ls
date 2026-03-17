import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, isApiError } from "@/lib/api/apiError";
import {
  applySeller,
  getMySeller,
  getMySellerStats,
  type SellerApplyInput,
  type SellerApplyResponse,
  type SellerProfile,
  type SellerStatsPeriod,
  type SellerStatsResponse,
} from "@/lib/api/sellers";

export function useMySeller(enabled = true) {
  return useQuery<SellerProfile | null, ApiError>({
    queryKey: ["seller", "me"],
    queryFn: async () => {
      try {
        return await getMySeller();
      } catch (error) {
        if (isApiError(error)) {
          if (
            error.code === "SellerProfileNotFound" ||
            error.status === 404 ||
            error.message === "SellerProfileNotFound"
          ) {
            return null;
          }
        }
        throw error;
      }
    },
    enabled,
  });
}

export function useApplySeller() {
  const queryClient = useQueryClient();

  return useMutation<SellerApplyResponse, ApiError, SellerApplyInput>({
    mutationFn: applySeller,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["seller", "stats"] });
    },
  });
}

export function useMySellerStats(
  period: SellerStatsPeriod,
  enabled = true,
) {
  return useQuery<SellerStatsResponse, ApiError>({
    queryKey: ["seller", "stats", period],
    queryFn: () => getMySellerStats(period),
    enabled,
  });
}
