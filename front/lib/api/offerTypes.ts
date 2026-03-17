import { apiGet } from "./http";
import type { CursorPage } from "./types";

export type OfferTypeListItem = {
  id: string;
  name: string;
  slug: string;
  badgeText?: string;
  badgeColor?: string;
};

export async function listOfferTypes(
  limit = 200,
): Promise<CursorPage<OfferTypeListItem>> {
  return apiGet<CursorPage<OfferTypeListItem>>("/offer-types", { limit });
}
