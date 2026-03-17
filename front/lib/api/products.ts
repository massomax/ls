import { apiGet, apiPost } from "./http";
import type { CursorPage } from "./types";

export type ProductSort = "rank" | "new" | "popular";

export type PublicSeller = {
  id: string;
  companyName: string;
  website?: string;
};

export type ProductListItem = {
  id: string;
  title: string;
  photos: string[];
  price: number;
  oldPrice: number;
  discountPercent: number;
  isHot: boolean;
  offerTypeId: string;
  mainCategoryId: string;
  subcategoryId: string | null;
  rankScore: number;
  views7d: number;
  favoritesCount: number;
  createdAt: string;
  externalUrl?: string | null;
  seller: PublicSeller;
};

export type ListProductsQuery = {
  limit?: number;
  sort?: ProductSort;
  category?: string;
  subcategory?: string;
  offerTypeSlug?: string;
  hot?: boolean;
  cursor?: string | null;
};

export async function listProducts(
  q: ListProductsQuery,
): Promise<CursorPage<ProductListItem>> {
  return apiGet<CursorPage<ProductListItem>>("/products", {
    limit: q.limit,
    sort: q.sort,
    category: q.category,
    subcategory: q.subcategory,
    offerTypeSlug: q.offerTypeSlug,
    hot: q.hot ? 1 : undefined,
    cursor: q.cursor ?? undefined,
  });
}

export type ProductDetails = {
  id: string;
  title: string;
  description?: string;
  photos: string[];
  price: number;
  oldPrice: number;
  discountPercent: number;
  isHot: boolean;
  offerTypeId: string;
  mainCategoryId: string;
  subcategoryId: string | null;
  rankScore: number;
  views7d: number;
  favoritesCount: number;
  createdAt: string;
  externalUrl?: string | null;
  seller: PublicSeller;
};

export type SimilarProductListItem = {
  id: string;
  title: string;
  photos: string[];
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  isHot: boolean;
};

export async function getProduct(id: string): Promise<ProductDetails> {
  return apiGet<ProductDetails>(`/products/${encodeURIComponent(id)}`);
}

export async function listSimilarProducts(
  id: string,
): Promise<{ items: SimilarProductListItem[] }> {
  return apiGet<{ items: SimilarProductListItem[] }>(
    `/products/similar/${encodeURIComponent(id)}`,
  );
}

export type ProductClickResponse = { externalUrl: string };

export async function recordProductClick(
  id: string,
): Promise<ProductClickResponse> {
  return apiPost<ProductClickResponse>(
    `/products/${encodeURIComponent(id)}/click`,
  );
}
