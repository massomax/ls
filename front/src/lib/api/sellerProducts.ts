import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/http";

export type SellerProductStatus =
  | "draft"
  | "pending"
  | "active"
  | "rejected"
  | "archived";

export type SellerProductsListStatus = "all" | "draft" | "active" | "archived";

export type SellerProductListItem = {
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
  status: SellerProductStatus;
  createdAt: string;
  views7d: number;
  favoritesCount: number;
  moderationNote?: string | null;
};

export type SellerProductDetail = {
  id: string;
  title: string;
  description?: string | null;
  photos: string[];
  price: number;
  oldPrice: number;
  discountPercent: number;
  isHot: boolean;
  offerTypeId: string;
  mainCategoryId: string;
  subcategoryId: string | null;
  status: SellerProductStatus;
  createdAt: string;
  updatedAt?: string | null;
  views7d: number;
  favoritesCount: number;
  externalUrl?: string | null;
  moderationNote?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  suspendedAt?: string | null;
};

export type ListResponse = {
  items: SellerProductListItem[];
  nextCursor: string | null;
};

export type CreateInput = {
  title: string;
  description?: string;
  photos?: string[];
  oldPrice: number;
  price: number;
  mainCategoryId: string;
  subcategoryId?: string;
  offerTypeId: string;
  externalUrl?: string;
  status: SellerProductStatus;
};

export type UpdateInput = Partial<
  Pick<
    CreateInput,
    | "title"
    | "description"
    | "photos"
    | "oldPrice"
    | "price"
    | "mainCategoryId"
    | "subcategoryId"
    | "offerTypeId"
    | "externalUrl"
  >
>;

export type ListSellerProductsParams = {
  status?: SellerProductsListStatus;
  limit?: number;
  cursor?: string | null;
  q?: string;
};

export async function listSellerProducts(
  params: ListSellerProductsParams,
): Promise<ListResponse> {
  return apiGet<ListResponse>("/seller/products", {
    status: params.status,
    limit: params.limit,
    cursor: params.cursor ?? undefined,
    q: params.q,
  });
}

export async function createSellerProduct(
  input: CreateInput,
): Promise<{ id: string }> {
  return apiPost<{ id: string }>("/seller/products", input);
}

export async function getSellerProduct(
  id: string,
): Promise<SellerProductDetail> {
  return apiGet<SellerProductDetail>(
    `/seller/products/${encodeURIComponent(id)}`,
  );
}

export async function updateSellerProduct(
  id: string,
  patch: UpdateInput,
): Promise<{ id: string }> {
  return apiPatch<{ id: string }>(
    `/seller/products/${encodeURIComponent(id)}`,
    patch,
  );
}

export async function publishSellerProduct(
  id: string,
): Promise<{ id: string; status: SellerProductStatus }> {
  return apiPatch<{ id: string; status: SellerProductStatus }>(
    `/seller/products/${encodeURIComponent(id)}/publish`,
  );
}

export async function unpublishSellerProduct(
  id: string,
): Promise<{ id: string; status: SellerProductStatus }> {
  return apiPatch<{ id: string; status: SellerProductStatus }>(
    `/seller/products/${encodeURIComponent(id)}/unpublish`,
  );
}

export async function archiveSellerProduct(id: string): Promise<void> {
  return apiDelete<void>(`/seller/products/${encodeURIComponent(id)}`);
}
