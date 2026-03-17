import { apiPatch, apiPost } from "./http";

export type AdminCategoryCreateInput = {
  name: string;
  slug: string;
  svgUrl: string;
  sortOrder: number;
  description?: string;
  status?: "active" | "archived";
};

export type AdminCategoryUpdateInput = Partial<AdminCategoryCreateInput>;

export type AdminCategoryCreateResponse = {
  id: string;
};

export type AdminCategoryUpdateResponse = {
  id: string;
  name: string;
  slug: string;
  svgUrl: string;
  status: "active" | "archived";
  sortOrder: number;
  description: string | null;
};

export type AdminCategoryStatusResponse = {
  id: string;
  status: "active" | "archived";
};

export async function createAdminCategory(
  payload: AdminCategoryCreateInput,
): Promise<AdminCategoryCreateResponse> {
  return apiPost<AdminCategoryCreateResponse>("/admin/categories", payload);
}

export async function updateAdminCategory(
  id: string,
  payload: AdminCategoryUpdateInput,
): Promise<AdminCategoryUpdateResponse> {
  return apiPatch<AdminCategoryUpdateResponse>(
    `/admin/categories/${id}`,
    payload,
  );
}

export async function archiveAdminCategory(
  id: string,
): Promise<AdminCategoryStatusResponse> {
  return apiPatch<AdminCategoryStatusResponse>(
    `/admin/categories/${id}/archive`,
  );
}

export async function restoreAdminCategory(
  id: string,
): Promise<AdminCategoryStatusResponse> {
  return apiPatch<AdminCategoryStatusResponse>(
    `/admin/categories/${id}/restore`,
  );
}
