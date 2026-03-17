import { apiDelete, apiGet, apiPost } from "./http";
import type { CursorPage } from "./types";

export type FavoriteItem = {
  id: string;
  productId: string;
  createdAt: string;
};

export type ListFavoritesQuery = {
  limit?: number;
  cursor?: string | null;
};

export async function listFavorites(
  q: ListFavoritesQuery,
): Promise<CursorPage<FavoriteItem>> {
  return apiGet<CursorPage<FavoriteItem>>("/users/me/favorites", {
    limit: q.limit,
    cursor: q.cursor ?? undefined,
  });
}

export async function addFavorite(productId: string): Promise<FavoriteItem> {
  return apiPost<FavoriteItem>("/users/me/favorites", { productId });
}

export async function removeFavorite(productId: string): Promise<void> {
  return apiDelete<void>(
    `/users/me/favorites/${encodeURIComponent(productId)}`,
  );
}
