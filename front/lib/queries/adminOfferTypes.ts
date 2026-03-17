import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  archiveAdminOfferType,
  createAdminOfferType,
  mergeAdminOfferType,
  restoreAdminOfferType,
  updateAdminOfferType,
  type AdminOfferTypeCreateInput,
  type AdminOfferTypeCreateResponse,
  type AdminOfferTypeMergeResponse,
  type AdminOfferTypeStatusResponse,
  type AdminOfferTypeUpdateInput,
  type AdminOfferTypeUpdateResponse,
} from "@/lib/api/adminOfferTypes";

function useInvalidateOfferTypes() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: ["offerTypes"],
    });
}

export function useCreateAdminOfferType() {
  const invalidate = useInvalidateOfferTypes();

  return useMutation<AdminOfferTypeCreateResponse, ApiError, AdminOfferTypeCreateInput>(
    {
      mutationFn: createAdminOfferType,
      onSuccess: () => invalidate(),
    },
  );
}

export function useUpdateAdminOfferType() {
  const invalidate = useInvalidateOfferTypes();

  return useMutation<
    AdminOfferTypeUpdateResponse,
    ApiError,
    { id: string; payload: AdminOfferTypeUpdateInput }
  >({
    mutationFn: ({ id, payload }) => updateAdminOfferType(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useArchiveAdminOfferType() {
  const invalidate = useInvalidateOfferTypes();

  return useMutation<AdminOfferTypeStatusResponse, ApiError, string>({
    mutationFn: archiveAdminOfferType,
    onSuccess: () => invalidate(),
  });
}

export function useRestoreAdminOfferType() {
  const invalidate = useInvalidateOfferTypes();

  return useMutation<AdminOfferTypeStatusResponse, ApiError, string>({
    mutationFn: restoreAdminOfferType,
    onSuccess: () => invalidate(),
  });
}

export function useMergeAdminOfferType() {
  const invalidate = useInvalidateOfferTypes();

  return useMutation<
    AdminOfferTypeMergeResponse,
    ApiError,
    { id: string; targetId: string }
  >({
    mutationFn: ({ id, targetId }) => mergeAdminOfferType(id, targetId),
    onSuccess: () => invalidate(),
  });
}
