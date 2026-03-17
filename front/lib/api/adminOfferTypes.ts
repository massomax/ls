import { apiPatch, apiPost } from "./http";

export type AdminOfferTypeCreateInput = {
  name: string;
  slug: string;
  sortOrder: number;
  boostMultiplier: number;
  badgeText?: string;
  badgeColor?: string;
  description?: string;
  status?: "active" | "archived";
};

export type AdminOfferTypeUpdateInput = Partial<AdminOfferTypeCreateInput>;

export type AdminOfferTypeCreateResponse = {
  id: string;
};

export type AdminOfferTypeUpdateResponse = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "archived";
  sortOrder: number;
  boostMultiplier: number;
  badgeText: string | null;
  badgeColor: string | null;
  description: string | null;
};

export type AdminOfferTypeStatusResponse = {
  id: string;
  status: "active" | "archived";
};

export type AdminOfferTypeMergeResponse = {
  mergedFrom: string;
  mergedTo: string;
};

export async function createAdminOfferType(
  payload: AdminOfferTypeCreateInput,
): Promise<AdminOfferTypeCreateResponse> {
  return apiPost<AdminOfferTypeCreateResponse>("/offer-types", payload);
}

export async function updateAdminOfferType(
  id: string,
  payload: AdminOfferTypeUpdateInput,
): Promise<AdminOfferTypeUpdateResponse> {
  return apiPatch<AdminOfferTypeUpdateResponse>(
    `/offer-types/${id}`,
    payload,
  );
}

export async function archiveAdminOfferType(
  id: string,
): Promise<AdminOfferTypeStatusResponse> {
  return apiPatch<AdminOfferTypeStatusResponse>(
    `/offer-types/${id}/archive`,
  );
}

export async function restoreAdminOfferType(
  id: string,
): Promise<AdminOfferTypeStatusResponse> {
  return apiPatch<AdminOfferTypeStatusResponse>(
    `/offer-types/${id}/restore`,
  );
}

export async function mergeAdminOfferType(
  id: string,
  targetId: string,
): Promise<AdminOfferTypeMergeResponse> {
  return apiPatch<AdminOfferTypeMergeResponse>(
    `/offer-types/${id}/merge`,
    { targetId },
  );
}
