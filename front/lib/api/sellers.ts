import { apiGet, apiPost } from "./http";

export type SellerStatus = "pending" | "active" | "rejected" | "suspended";

export type SellerProfile = {
  id: string;
  status: SellerStatus;
  companyName: string;
  inn: string;
  contactEmail: string | null;
  moderationNote: string | null;
  isVerified: boolean;
  tier: "free" | "plus" | "pro";
  createdAt: string;
  updatedAt: string;
  ogrn?: string | null;
  legalAddress?: string | null;
  website?: string | null;
  contactName?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  suspendedAt?: string | null;
};

export type SellerStatsPeriod = "7d" | "30d";

export type SellerStatsResponse = {
  period: "live";
  products: {
    total: number;
    active: number;
    archived: number;
  };
  views7d: number;
  views30d: number;
  favorites: number;
  clicks7d: number;
};

export type SellerApplyInput = {
  companyName: string;
  inn: string;
  ogrn?: string;
  legalAddress?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
};

export type SellerApplyResponse = {
  id: string;
  status: SellerStatus;
};

export async function getMySeller(): Promise<SellerProfile> {
  return apiGet<SellerProfile>("/sellers/me");
}

export async function applySeller(
  body: SellerApplyInput,
): Promise<SellerApplyResponse> {
  return apiPost<SellerApplyResponse>("/sellers/apply", body);
}

export async function getMySellerStats(
  period: SellerStatsPeriod = "7d",
): Promise<SellerStatsResponse> {
  return apiGet<SellerStatsResponse>("/sellers/me/stats", { period });
}
