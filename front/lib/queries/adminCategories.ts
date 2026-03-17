import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  archiveAdminCategory,
  createAdminCategory,
  restoreAdminCategory,
  updateAdminCategory,
  type AdminCategoryCreateInput,
  type AdminCategoryCreateResponse,
  type AdminCategoryStatusResponse,
  type AdminCategoryUpdateInput,
  type AdminCategoryUpdateResponse,
} from "@/lib/api/adminCategories";

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: ["categories"],
    });
}

export function useCreateAdminCategory() {
  const invalidate = useInvalidateCategories();

  return useMutation<AdminCategoryCreateResponse, ApiError, AdminCategoryCreateInput>(
    {
      mutationFn: createAdminCategory,
      onSuccess: () => invalidate(),
    },
  );
}

export function useUpdateAdminCategory() {
  const invalidate = useInvalidateCategories();

  return useMutation<
    AdminCategoryUpdateResponse,
    ApiError,
    { id: string; payload: AdminCategoryUpdateInput }
  >({
    mutationFn: ({ id, payload }) => updateAdminCategory(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useArchiveAdminCategory() {
  const invalidate = useInvalidateCategories();

  return useMutation<AdminCategoryStatusResponse, ApiError, string>({
    mutationFn: archiveAdminCategory,
    onSuccess: () => invalidate(),
  });
}

export function useRestoreAdminCategory() {
  const invalidate = useInvalidateCategories();

  return useMutation<AdminCategoryStatusResponse, ApiError, string>({
    mutationFn: restoreAdminCategory,
    onSuccess: () => invalidate(),
  });
}
