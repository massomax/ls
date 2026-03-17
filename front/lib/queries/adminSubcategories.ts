import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  approveAdminSubcategory,
  archiveAdminSubcategory,
  listPendingAdminSubcategories,
  mergeAdminSubcategory,
  rejectAdminSubcategory,
  restoreAdminSubcategory,
  type AdminSubcategoryApprovePayload,
  type AdminSubcategoryApproveResponse,
  type AdminSubcategoryListItem,
  type AdminSubcategoryMergeResponse,
  type AdminSubcategoryStatusResponse,
} from "@/lib/api/adminSubcategories";
import {
  proposeSubcategory,
  type ProposeSubcategoryInput,
  type ProposeSubcategoryResponse,
} from "@/lib/api/subcategories";
import type { CursorPage } from "@/lib/api/types";

type PendingAdminSubcategoriesFilters = {
  categoryId?: string;
  limit?: number;
};

export const pendingAdminSubcategoriesKey = (
  filters: PendingAdminSubcategoriesFilters,
) => ["adminSubcategories", "pending", filters] as const;

export function usePendingAdminSubcategories(
  filters: PendingAdminSubcategoriesFilters,
) {
  return useInfiniteQuery<
    CursorPage<AdminSubcategoryListItem>,
    ApiError,
    InfiniteData<CursorPage<AdminSubcategoryListItem>>,
    ReturnType<typeof pendingAdminSubcategoriesKey>,
    string | null
  >({
    queryKey: pendingAdminSubcategoriesKey(filters),
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      listPendingAdminSubcategories({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

function useInvalidatePendingSubcategories() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: ["adminSubcategories", "pending"],
    });
}

export function useApproveAdminSubcategory() {
  const invalidate = useInvalidatePendingSubcategories();

  return useMutation<
    AdminSubcategoryApproveResponse,
    ApiError,
    { id: string; payload?: AdminSubcategoryApprovePayload }
  >({
    mutationFn: ({ id, payload }) => approveAdminSubcategory(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useRejectAdminSubcategory() {
  const invalidate = useInvalidatePendingSubcategories();

  return useMutation<
    AdminSubcategoryStatusResponse,
    ApiError,
    { id: string; reason?: string }
  >({
    mutationFn: ({ id, reason }) => rejectAdminSubcategory(id, reason),
    onSuccess: () => invalidate(),
  });
}

export function useMergeAdminSubcategory() {
  const invalidate = useInvalidatePendingSubcategories();

  return useMutation<
    AdminSubcategoryMergeResponse,
    ApiError,
    { id: string; targetId: string }
  >({
    mutationFn: ({ id, targetId }) => mergeAdminSubcategory(id, targetId),
    onSuccess: () => invalidate(),
  });
}

export function useArchiveAdminSubcategory() {
  const invalidate = useInvalidatePendingSubcategories();

  return useMutation<
    AdminSubcategoryStatusResponse,
    ApiError,
    { id: string; reason?: string }
  >({
    mutationFn: ({ id, reason }) => archiveAdminSubcategory(id, reason),
    onSuccess: () => invalidate(),
  });
}

export function useRestoreAdminSubcategory() {
  const invalidate = useInvalidatePendingSubcategories();

  return useMutation<AdminSubcategoryStatusResponse, ApiError, string>({
    mutationFn: restoreAdminSubcategory,
    onSuccess: () => invalidate(),
  });
}

export function useCreateAdminSubcategory() {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; slug: string },
    ApiError,
    { payload: ProposeSubcategoryInput; approvePayload?: AdminSubcategoryApprovePayload }
  >({
    mutationFn: async ({ payload, approvePayload }) => {
      const proposed: ProposeSubcategoryResponse = await proposeSubcategory(payload);
      const approved = await approveAdminSubcategory(proposed.id, approvePayload);
      return { id: approved.id, slug: approved.slug };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["adminSubcategories", "pending"] });
      queryClient.invalidateQueries({
        queryKey: ["subcategories", variables.payload.parentCategoryId],
      });
    },
  });
}
