import { useQuery } from "@tanstack/react-query";
import type { OfferType as UiOfferType } from "@ui/components";
import { listOfferTypes, type OfferTypeListItem } from "@/lib/api/offerTypes";

function toUiOfferType(x: OfferTypeListItem): UiOfferType {
  return {
    id: x.id,
    name: x.name,
    slug: x.slug,
    badgeText: x.badgeText,
    badgeColor: x.badgeColor,
  };
}

export function useOfferTypes() {
  return useQuery({
    queryKey: ["offerTypes"],
    queryFn: async () => {
      const res = await listOfferTypes(200);
      return res.items.map(toUiOfferType);
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
  });
}
