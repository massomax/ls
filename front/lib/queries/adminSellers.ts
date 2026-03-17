import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  approveAdminSeller,
  getAdminSeller,
  listAdminSellers,
  rejectAdminSeller,
  setAdminSellerTier,
  suspendAdminSeller,
  unsuspendAdminSeller,
  type AdminSellerApproveResponse,
  type AdminSellerDetail,
  type AdminSellerListItem,
  type AdminSellerStatusResponse,
  type AdminSellerTier,
  type AdminSellerTierResponse,
  type AdminSellerStatusFilter,
} from "@/lib/api/adminSellers";
import type { CursorPage } from "@/lib/api/types";

type AdminSellersListFilters = {
  status?: AdminSellerStatusFilter;
  q?: string;
  limit?: number;
};

const ADMIN_SELLERS_KEY = ["admin", "sellers"] as const;

const adminSellersListKey = (filters: AdminSellersListFilters) =>
  ["admin", "sellers", "list", filters] as const;

const adminSellerKey = (id: string) =>
  ["admin", "sellers", "detail", id] as const;

export function useAdminSellersList(filters: AdminSellersListFilters) {
  return useInfiniteQuery<
    CursorPage<AdminSellerListItem>,
    ApiError,
    InfiniteData<CursorPage<AdminSellerListItem>>,
    ReturnType<typeof adminSellersListKey>,
    string | null
  >({
    queryKey: adminSellersListKey(filters),
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      listAdminSellers({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useAdminSeller(id: string, enabled = true) {
  return useQuery<AdminSellerDetail, ApiError>({
    queryKey: adminSellerKey(id),
    enabled: enabled && Boolean(id),
    queryFn: () => getAdminSeller(id),
  });
}

function useInvalidateAdminSellers() {
  const queryClient = useQueryClient();

  return {
    invalidateList: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_SELLERS_KEY }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: adminSellerKey(id) }),
  };
}

export function useApproveAdminSeller() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminSellers();

  return useMutation<AdminSellerApproveResponse, ApiError, string>({
    mutationFn: approveAdminSeller,
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateDetail(id);
    },
  });
}

export function useRejectAdminSeller() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminSellers();

  return useMutation<
    AdminSellerStatusResponse,
    ApiError,
    { id: string; reason?: string }
  >({
    mutationFn: ({ id, reason }) => rejectAdminSeller(id, reason),
    onSuccess: (_data, variables) => {
      invalidateList();
      invalidateDetail(variables.id);
    },
  });
}

export function useSuspendAdminSeller() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminSellers();

  return useMutation<AdminSellerStatusResponse, ApiError, string>({
    mutationFn: suspendAdminSeller,
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateDetail(id);
    },
  });
}

export function useUnsuspendAdminSeller() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminSellers();

  return useMutation<AdminSellerApproveResponse, ApiError, string>({
    mutationFn: unsuspendAdminSeller,
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateDetail(id);
    },
  });
}

export function useSetAdminSellerTier() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminSellers();

  return useMutation<
    AdminSellerTierResponse,
    ApiError,
    { id: string; tier: AdminSellerTier }
  >({
    mutationFn: ({ id, tier }) => setAdminSellerTier(id, tier),
    onSuccess: (_data, variables) => {
      invalidateList();
      invalidateDetail(variables.id);
    },
  });
}
