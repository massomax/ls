import { apiDelete, apiGet, apiPatch } from "./http";
import type { Cursor, CursorPage } from "./types";

export type AdminProductStatus =
  | "draft"
  | "pending"
  | "active"
  | "rejected"
  | "archived";

export type AdminProductTag = "best" | "popular" | "new";

export type AdminProductListItem = {
  id: string;
  title: string;
  status: AdminProductStatus;
  price: number;
  oldPrice: number;
  discountPercent: number;
  sellerId: string;
  mainCategoryId: string;
  subcategoryId: string | null;
  offerTypeId: string;
  isFeatured: boolean;
  featuredUntil: string | null;
  adminTags: AdminProductTag[];
  rankScore: number;
  promotionUntil: string | null;
  rankAdminBoost: number;
  createdAt: string;
};

export type AdminProductReference = {
  id: string;
  name: string;
};

export type AdminProductOfferType = {
  id: string;
  name: string;
  slug: string;
};

export type AdminProductSellerRef = {
  id: string;
  companyName: string;
  status: string;
};

export type AdminProductDetail = {
  id: string;
  sellerId: string;
  title: string;
  description?: string;
  photos: string[];
  oldPrice: number;
  price: number;
  mainCategoryId: string;
  subcategoryId?: string;
  offerTypeId: string;
  externalUrl?: string;
  status: AdminProductStatus;
  deletedAt?: string;
  moderationNote?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  moderatedBy?: string | null;
  views7d: number;
  views30d: number;
  favoritesCount: number;
  clicksToExternal7d: number;
  rankScore: number;
  shuffleKey: number;
  isFeatured: boolean;
  featuredUntil?: string | null;
  adminTags: AdminProductTag[];
  rankAdminBoost: number;
  promotionUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  seller: AdminProductSellerRef | null;
  category: AdminProductReference | null;
  subcategory: AdminProductReference | null;
  offerType: AdminProductOfferType | null;
};

export type AdminProductStatusResponse = {
  id: string;
  status: AdminProductStatus;
};

export type AdminProductRejectResponse = AdminProductStatusResponse & {
  reason: string | null;
};

export type AdminProductFeatureResponse = {
  id: string;
  isFeatured: boolean;
  featuredUntil: string | null;
};

export type AdminProductTagsResponse = {
  id: string;
  adminTags: AdminProductTag[];
};

export type AdminProductPromotionResponse = {
  id: string;
  rankAdminBoost: number;
  promotionUntil: string | null;
  rankScore: number;
};

export type ListAdminProductsParams = {
  status?: AdminProductStatus | "all";
  q?: string;
  sellerId?: string;
  categoryId?: string;
  subcategoryId?: string;
  offerTypeId?: string;
  featured?: boolean;
  hot?: boolean;
  limit?: number;
  cursor?: Cursor;
};

export async function listAdminProducts(
  params: ListAdminProductsParams,
): Promise<CursorPage<AdminProductListItem>> {
  return apiGet<CursorPage<AdminProductListItem>>("/admin/products", {
    status: params.status,
    q: params.q,
    sellerId: params.sellerId,
    categoryId: params.categoryId,
    subcategoryId: params.subcategoryId,
    offerTypeId: params.offerTypeId,
    featured: params.featured ? 1 : undefined,
    hot: params.hot ? 1 : undefined,
    limit: params.limit,
    cursor: params.cursor ?? undefined,
  });
}

export async function getAdminProduct(
  id: string,
): Promise<AdminProductDetail> {
  return apiGet<AdminProductDetail>(`/admin/products/${id}`);
}

export async function approveAdminProduct(
  id: string,
): Promise<AdminProductStatusResponse> {
  return apiPatch<AdminProductStatusResponse>(`/admin/products/${id}/approve`);
}

export async function rejectAdminProduct(
  id: string,
  reason?: string,
): Promise<AdminProductRejectResponse> {
  return apiPatch<AdminProductRejectResponse>(`/admin/products/${id}/reject`, {
    reason,
  });
}

export async function publishAdminProduct(
  id: string,
): Promise<AdminProductStatusResponse> {
  return apiPatch<AdminProductStatusResponse>(`/admin/products/${id}/publish`);
}

export async function unpublishAdminProduct(
  id: string,
): Promise<AdminProductStatusResponse> {
  return apiPatch<AdminProductStatusResponse>(
    `/admin/products/${id}/unpublish`,
  );
}

export async function archiveAdminProduct(
  id: string,
): Promise<AdminProductStatusResponse> {
  return apiPatch<AdminProductStatusResponse>(`/admin/products/${id}/archive`);
}

export async function restoreAdminProduct(
  id: string,
): Promise<AdminProductStatusResponse> {
  return apiPatch<AdminProductStatusResponse>(`/admin/products/${id}/restore`);
}

export async function setAdminProductFeature(
  id: string,
  featured: boolean,
  featuredUntil?: string,
): Promise<AdminProductFeatureResponse> {
  return apiPatch<AdminProductFeatureResponse>(`/admin/products/${id}/feature`, {
    featured,
    featuredUntil,
  });
}

export async function setAdminProductTags(
  id: string,
  tags: AdminProductTag[],
): Promise<AdminProductTagsResponse> {
  return apiPatch<AdminProductTagsResponse>(`/admin/products/${id}/tags`, {
    tags,
  });
}

export async function setAdminProductPromotion(
  id: string,
  rankAdminBoost: number,
  until?: string,
): Promise<AdminProductPromotionResponse> {
  return apiPatch<AdminProductPromotionResponse>(
    `/admin/products/${id}/promotion`,
    {
      rankAdminBoost,
      until,
    },
  );
}

export async function hardDeleteAdminProduct(id: string): Promise<void> {
  return apiDelete<void>(`/admin/products/${id}`);
}
