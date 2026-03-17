import { apiGet, apiPatch } from "./http";
import type { Cursor, CursorPage } from "./types";

export type AdminSubcategoryStatus = "pending" | "active" | "archived";

export type AdminSubcategoryListItem = {
  id: string;
  parentCategoryId: string;
  name: string;
  slug: string;
  createdBy: string;
  proposedBySellerId: string | null;
  description: string | null;
  createdAt: string;
};

export type ListPendingAdminSubcategoriesParams = {
  categoryId?: string;
  limit?: number;
  cursor?: Cursor;
};

export type AdminSubcategoryStatusResponse = {
  id: string;
  status: AdminSubcategoryStatus;
};

export type AdminSubcategoryApprovePayload = {
  name?: string;
  slug?: string;
  description?: string;
};

export type AdminSubcategoryApproveResponse = {
  id: string;
  status: AdminSubcategoryStatus;
  name: string;
  slug: string;
};

export type AdminSubcategoryMergeResponse = {
  mergedFrom: string;
  mergedTo: string;
  movedProducts: number;
};

export async function listPendingAdminSubcategories(
  params: ListPendingAdminSubcategoriesParams,
): Promise<CursorPage<AdminSubcategoryListItem>> {
  return apiGet<CursorPage<AdminSubcategoryListItem>>(
    "/admin/subcategories/pending",
    {
      categoryId: params.categoryId,
      limit: params.limit,
      cursor: params.cursor ?? undefined,
    },
  );
}

export async function approveAdminSubcategory(
  id: string,
  payload?: AdminSubcategoryApprovePayload,
): Promise<AdminSubcategoryApproveResponse> {
  return apiPatch<AdminSubcategoryApproveResponse>(
    `/admin/subcategories/${id}/approve`,
    payload ?? {},
  );
}

export async function rejectAdminSubcategory(
  id: string,
  reason?: string,
): Promise<AdminSubcategoryStatusResponse> {
  return apiPatch<AdminSubcategoryStatusResponse>(
    `/admin/subcategories/${id}/reject`,
    {
      reason,
    },
  );
}

export async function mergeAdminSubcategory(
  id: string,
  targetId: string,
): Promise<AdminSubcategoryMergeResponse> {
  return apiPatch<AdminSubcategoryMergeResponse>(
    `/admin/subcategories/${id}/merge`,
    {
      targetId,
    },
  );
}

export async function archiveAdminSubcategory(
  id: string,
  reason?: string,
): Promise<AdminSubcategoryStatusResponse> {
  return apiPatch<AdminSubcategoryStatusResponse>(
    `/admin/subcategories/${id}/archive`,
    {
      reason,
    },
  );
}

export async function restoreAdminSubcategory(
  id: string,
): Promise<AdminSubcategoryStatusResponse> {
  return apiPatch<AdminSubcategoryStatusResponse>(
    `/admin/subcategories/${id}/restore`,
  );
}
