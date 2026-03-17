import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  approveAdminProduct,
  archiveAdminProduct,
  getAdminProduct,
  hardDeleteAdminProduct,
  listAdminProducts,
  publishAdminProduct,
  rejectAdminProduct,
  restoreAdminProduct,
  setAdminProductFeature,
  setAdminProductPromotion,
  setAdminProductTags,
  unpublishAdminProduct,
  type AdminProductDetail,
  type AdminProductFeatureResponse,
  type AdminProductListItem,
  type AdminProductPromotionResponse,
  type AdminProductRejectResponse,
  type AdminProductStatus,
  type AdminProductStatusResponse,
  type AdminProductTag,
  type AdminProductTagsResponse,
} from "@/lib/api/adminProducts";
import type { CursorPage } from "@/lib/api/types";

type AdminProductsListFilters = {
  status?: AdminProductStatus | "all";
  q?: string;
  sellerId?: string;
  categoryId?: string;
  subcategoryId?: string;
  offerTypeId?: string;
  featured?: boolean;
  hot?: boolean;
  limit?: number;
};

export const adminProductsListKey = (filters: AdminProductsListFilters) =>
  ["adminProducts", filters] as const;

export const adminProductKey = (id: string) =>
  ["adminProduct", id] as const;

export function useAdminProductsList(filters: AdminProductsListFilters) {
  return useInfiniteQuery<
    CursorPage<AdminProductListItem>,
    ApiError,
    InfiniteData<CursorPage<AdminProductListItem>>,
    ReturnType<typeof adminProductsListKey>,
    string | null
  >({
    queryKey: adminProductsListKey(filters),
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      listAdminProducts({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useAdminProduct(id: string, enabled = true) {
  return useQuery<AdminProductDetail, ApiError>({
    queryKey: adminProductKey(id),
    enabled: enabled && Boolean(id),
    queryFn: () => getAdminProduct(id),
  });
}

function useInvalidateAdminProducts() {
  const queryClient = useQueryClient();

  return {
    invalidateList: () =>
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: adminProductKey(id) }),
  };
}

export function useApproveAdminProduct() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<AdminProductStatusResponse, ApiError, string>({
    mutationFn: approveAdminProduct,
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateDetail(id);
    },
  });
}

export function useRejectAdminProduct() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<
    AdminProductRejectResponse,
    ApiError,
    { id: string; reason?: string }
  >({
    mutationFn: ({ id, reason }) => rejectAdminProduct(id, reason),
    onSuccess: (_data, variables) => {
      invalidateList();
      invalidateDetail(variables.id);
    },
  });
}

export function usePublishAdminProduct() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<AdminProductStatusResponse, ApiError, string>({
    mutationFn: publishAdminProduct,
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateDetail(id);
    },
  });
}

export function useUnpublishAdminProduct() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<AdminProductStatusResponse, ApiError, string>({
    mutationFn: unpublishAdminProduct,
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateDetail(id);
    },
  });
}

export function useArchiveAdminProduct() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<AdminProductStatusResponse, ApiError, string>({
    mutationFn: archiveAdminProduct,
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateDetail(id);
    },
  });
}

export function useRestoreAdminProduct() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<AdminProductStatusResponse, ApiError, string>({
    mutationFn: restoreAdminProduct,
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateDetail(id);
    },
  });
}

export function useSetAdminProductFeature() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<
    AdminProductFeatureResponse,
    ApiError,
    { id: string; featured: boolean; featuredUntil?: string }
  >({
    mutationFn: ({ id, featured, featuredUntil }) =>
      setAdminProductFeature(id, featured, featuredUntil),
    onSuccess: (_data, variables) => {
      invalidateList();
      invalidateDetail(variables.id);
    },
  });
}

export function useSetAdminProductTags() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<
    AdminProductTagsResponse,
    ApiError,
    { id: string; tags: AdminProductTag[] }
  >({
    mutationFn: ({ id, tags }) => setAdminProductTags(id, tags),
    onSuccess: (_data, variables) => {
      invalidateList();
      invalidateDetail(variables.id);
    },
  });
}

export function useSetAdminProductPromotion() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<
    AdminProductPromotionResponse,
    ApiError,
    { id: string; rankAdminBoost: number; until?: string }
  >({
    mutationFn: ({ id, rankAdminBoost, until }) =>
      setAdminProductPromotion(id, rankAdminBoost, until),
    onSuccess: (_data, variables) => {
      invalidateList();
      invalidateDetail(variables.id);
    },
  });
}

export function useHardDeleteAdminProduct() {
  const { invalidateList, invalidateDetail } = useInvalidateAdminProducts();

  return useMutation<void, ApiError, string>({
    mutationFn: hardDeleteAdminProduct,
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateDetail(id);
    },
  });
}
