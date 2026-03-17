import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  archiveSellerProduct,
  createSellerProduct,
  getSellerProduct,
  listSellerProducts,
  publishSellerProduct,
  unpublishSellerProduct,
  updateSellerProduct,
  type CreateInput,
  type ListResponse,
  type SellerProductDetail,
  type SellerProductsListStatus,
  type SellerProductStatus,
  type UpdateInput,
} from "../api/sellerProducts";

export type SellerProductsListParams = {
  status?: SellerProductsListStatus;
  q?: string;
  limit?: number;
  enabled?: boolean;
};

export function useSellerProductsList(params: SellerProductsListParams) {
  const { enabled = true } = params;
  const keyParams = {
    status: params.status,
    q: params.q,
    limit: params.limit,
  };
  return useInfiniteQuery<
    ListResponse,
    ApiError,
    InfiniteData<ListResponse>,
    readonly ["sellerProducts", "list", typeof keyParams],
    string | null
  >({
    queryKey: ["sellerProducts", "list", keyParams] as const,
    enabled,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      listSellerProducts({
        status: params.status,
        q: params.q,
        limit: params.limit,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useSellerProduct(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery<SellerProductDetail, ApiError>({
    queryKey: ["sellerProducts", "detail", id],
    queryFn: () => getSellerProduct(id ?? ""),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateSellerProduct() {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, ApiError, CreateInput>({
    mutationFn: createSellerProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["sellerProducts", "list"],
      });
    },
  });
}

type UpdateMutationParams = {
  id: string;
  patch: UpdateInput;
};

export function useUpdateSellerProduct() {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, ApiError, UpdateMutationParams>({
    mutationFn: ({ id, patch }) => updateSellerProduct(id, patch),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["sellerProducts", "list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["sellerProducts", "detail", variables.id],
      });
    },
  });
}

export function usePublishSellerProduct() {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; status: SellerProductStatus },
    ApiError,
    string
  >({
    mutationFn: (id) => publishSellerProduct(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: ["sellerProducts", "list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["sellerProducts", "detail", id],
      });
    },
  });
}

export function useUnpublishSellerProduct() {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; status: SellerProductStatus },
    ApiError,
    string
  >({
    mutationFn: (id) => unpublishSellerProduct(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: ["sellerProducts", "list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["sellerProducts", "detail", id],
      });
    },
  });
}

export function useArchiveSellerProduct() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => archiveSellerProduct(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: ["sellerProducts", "list"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["sellerProducts", "detail", id],
      });
    },
  });
}
