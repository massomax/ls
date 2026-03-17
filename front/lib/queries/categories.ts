import { useQuery } from "@tanstack/react-query";
import {
  listCategories,
  listSubcategories,
  type SubcategoryListItem,
} from "@/lib/api/categories";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await listCategories();
      return res.items;
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
  });
}

export function useSubcategories(parentId: string | null) {
  const enabled = Boolean(parentId);
  return useQuery<SubcategoryListItem[]>({
    queryKey: ["subcategories", parentId],
    queryFn: () => listSubcategories(parentId as string),
    enabled,
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
  });
}
