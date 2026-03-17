import { useInfiniteQuery, useQuery, type InfiniteData } from "@tanstack/react-query";
import { useMemo } from "react";
import { ApiError } from "@/lib/api/apiError";
import {
  getProduct,
  listProducts,
  type ListProductsQuery,
  type ProductDetails,
  type ProductListItem,
} from "@/lib/api/products";
import type { CursorPage } from "@/lib/api/types";
import { mapWithConcurrencyLimit } from "@/lib/utils/mapWithConcurrencyLimit";

export type ProductsFeedParams = Omit<ListProductsQuery, "cursor">;

export function useProductsFeed(params: ProductsFeedParams) {
  return useInfiniteQuery<
    CursorPage<ProductListItem>,
    ApiError,
    InfiniteData<CursorPage<ProductListItem>>,
    readonly ["products", ProductsFeedParams],
    string | null
  >({
    queryKey: ["products", params] as const,
    initialPageParam: null,
    queryFn: ({ pageParam }) => listProducts({ ...params, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export type ProductsByIdsError = {
  id: string;
  error: Error;
};

export type ProductsByIdsResult = {
  items: ProductDetails[];
  errors: ProductsByIdsError[];
};

const PRODUCTS_BY_IDS_CONCURRENCY_LIMIT = 4;

export function useProductsByIds(ids: string[], enabled: boolean) {
  const normalizedIds = useMemo(
    () => Array.from(new Set(ids.filter(Boolean))),
    [ids],
  );

  return useQuery<ProductsByIdsResult, ApiError>({
    queryKey: ["products", "byIds", normalizedIds] as const,
    enabled: enabled && normalizedIds.length > 0,
    queryFn: async () => {
      const errors: ProductsByIdsError[] = [];

      const results = await mapWithConcurrencyLimit(
        normalizedIds,
        PRODUCTS_BY_IDS_CONCURRENCY_LIMIT,
        async (id) => {
          try {
            const item = await getProduct(id);
            return { id, item };
          } catch (error) {
            const normalizedError =
              error instanceof Error ? error : new Error("Unknown error");
            errors.push({ id, error: normalizedError });
            return null;
          }
        },
      );

      const items = results
        .filter(
          (result): result is { id: string; item: ProductDetails } =>
            result !== null,
        )
        .map((result) => result.item);

      return { items, errors };
    },
  });
}
