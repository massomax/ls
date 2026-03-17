import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  getProduct,
  listSimilarProducts,
  type ProductDetails,
  type SimilarProductListItem,
} from "@/lib/api/products";

export function useProduct(id?: string) {
  const safeId = id ?? "";
  return useQuery<ProductDetails, ApiError>({
    queryKey: ["product", safeId] as const,
    queryFn: () => getProduct(safeId),
    enabled: safeId.length > 0,
    staleTime: 60_000,
  });
}

export function useSimilarProducts(id?: string) {
  const safeId = id ?? "";
  return useQuery<{ items: SimilarProductListItem[] }, ApiError>({
    queryKey: ["productSimilar", safeId] as const,
    queryFn: () => listSimilarProducts(safeId),
    enabled: safeId.length > 0,
    staleTime: 60_000,
  });
}
