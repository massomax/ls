import { apiGet, apiPatch } from "./http";
import type { Cursor, CursorPage } from "./types";

export type AdminSellerStatus =
  | "pending"
  | "active"
  | "rejected"
  | "suspended";

export type AdminSellerTier = "free" | "plus" | "pro";

export type AdminSellerStatusFilter = AdminSellerStatus | "all";

export type AdminSellerListItem = {
  id: string;
  userId: string;
  phone: string | null;
  roles: string[];
  status: AdminSellerStatus;
  isVerified: boolean;
  tier: AdminSellerTier;
  companyName: string;
  inn: string;
  contactEmail: string | null;
  createdAt: string;
};

export type AdminSellerDetail = {
  id: string;
  userId: string;
  phone: string | null;
  roles: string[];
  status: AdminSellerStatus;
  isVerified: boolean;
  tier: AdminSellerTier;
  companyName: string;
  inn: string;
  ogrn: string | null;
  legalAddress: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  moderationNote: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListAdminSellersParams = {
  status?: AdminSellerStatusFilter;
  q?: string;
  limit?: number;
  cursor?: Cursor;
};

export type AdminSellerStatusResponse = {
  id: string;
  status: AdminSellerStatus;
};

export type AdminSellerApproveResponse = AdminSellerStatusResponse & {
  isVerified: boolean;
};

export type AdminSellerTierResponse = {
  id: string;
  tier: AdminSellerTier;
};

export async function listAdminSellers(
  params: ListAdminSellersParams,
): Promise<CursorPage<AdminSellerListItem>> {
  return apiGet<CursorPage<AdminSellerListItem>>(
    "/admin/sellers",
    params,
  );
}

export async function getAdminSeller(
  id: string,
): Promise<AdminSellerDetail> {
  return apiGet<AdminSellerDetail>(`/admin/sellers/${id}`);
}

export async function approveAdminSeller(
  id: string,
): Promise<AdminSellerApproveResponse> {
  return apiPatch<AdminSellerApproveResponse>(`/admin/sellers/${id}/approve`);
}

export async function rejectAdminSeller(
  id: string,
  reason?: string,
): Promise<AdminSellerStatusResponse> {
  return apiPatch<AdminSellerStatusResponse>(`/admin/sellers/${id}/reject`, {
    reason,
  });
}

export async function suspendAdminSeller(
  id: string,
): Promise<AdminSellerStatusResponse> {
  return apiPatch<AdminSellerStatusResponse>(`/admin/sellers/${id}/suspend`);
}

export async function unsuspendAdminSeller(
  id: string,
): Promise<AdminSellerApproveResponse> {
  return apiPatch<AdminSellerApproveResponse>(
    `/admin/sellers/${id}/unsuspend`,
  );
}

export async function setAdminSellerTier(
  id: string,
  tier: AdminSellerTier,
): Promise<AdminSellerTierResponse> {
  return apiPatch<AdminSellerTierResponse>(`/admin/sellers/${id}/tier`, {
    tier,
  });
}
