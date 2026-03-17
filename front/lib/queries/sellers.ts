import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
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

type UseSellerProfileOptions = {
  enabled?: boolean;
};

export function useSellerProfile(options: UseSellerProfileOptions = {}) {
  const { enabled = true } = options;
  return useQuery<SellerProfile, ApiError>({
    queryKey: ["seller-profile"],
    queryFn: getMySeller,
    enabled,
    retry: false,
  });
}

type UseSellerStatsOptions = {
  enabled?: boolean;
  period?: SellerStatsPeriod;
};

export function useSellerStats(options: UseSellerStatsOptions = {}) {
  const { enabled = true, period = "7d" } = options;
  return useQuery<SellerStatsResponse, ApiError>({
    queryKey: ["seller-stats", period],
    queryFn: () => getMySellerStats(period),
    enabled,
    retry: false,
  });
}

export function useApplySeller() {
  const queryClient = useQueryClient();

  return useMutation<SellerApplyResponse, ApiError, SellerApplyInput>({
    mutationFn: applySeller,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["seller-stats"] });
    },
  });
}
