import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
  type FavoriteItem,
} from "@/lib/api/favorites";
import type { CursorPage } from "@/lib/api/types";

const DEFAULT_LIMIT = 100;

type UseFavoritesOptions = {
  limit?: number;
  enabled?: boolean;
  autoLoadAll?: boolean;
};

export function useFavorites(options: UseFavoritesOptions = {}) {
  const { limit = DEFAULT_LIMIT, enabled = true, autoLoadAll = true } = options;

  const query = useInfiniteQuery<
    CursorPage<FavoriteItem>,
    ApiError,
    InfiniteData<CursorPage<FavoriteItem>>,
    readonly ["favorites"],
    string | null
  >({
    queryKey: ["favorites"] as const,
    enabled,
    initialPageParam: null,
    queryFn: ({ pageParam }) => listFavorites({ limit, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const {
    isLoading,
    isFetchingNextPage,
    isError,
    hasNextPage,
    fetchNextPage,
  } = query;

  useEffect(() => {
    if (!autoLoadAll || !enabled) return;
    if (isLoading || isFetchingNextPage || isError) return;
    if (!hasNextPage) return;
    void fetchNextPage();
  }, [
    autoLoadAll,
    enabled,
    isLoading,
    isFetchingNextPage,
    isError,
    hasNextPage,
    fetchNextPage,
  ]);

  return query;
}

type ToggleFavoriteParams = {
  productId: string;
  isFavorite: boolean;
};

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation<FavoriteItem | void, ApiError, ToggleFavoriteParams>({
    mutationFn: ({ productId, isFavorite }) =>
      isFavorite ? removeFavorite(productId) : addFavorite(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
