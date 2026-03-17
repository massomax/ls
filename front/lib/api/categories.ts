import { apiGet } from "./http";

export type ItemsResponse<T> = {
  items: T[];
};

export type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
  svgUrl: string;
  sortOrder: number;
  description: string | null;
};

export type SubcategoryListItem = {
  id: string;
  name: string;
  slug?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceSubcategories(payload: unknown): SubcategoryListItem[] {
  const items = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : null;

  if (!items) return [];

  const results: SubcategoryListItem[] = [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const { id, name, slug } = item;
    if (typeof id !== "string" || typeof name !== "string") continue;
    results.push({
      id,
      name,
      slug: typeof slug === "string" ? slug : undefined,
    });
  }
  return results;
}

export async function listCategories(): Promise<ItemsResponse<CategoryListItem>> {
  return apiGet<ItemsResponse<CategoryListItem>>("/categories");
}

export async function listSubcategories(
  categoryId: string,
): Promise<SubcategoryListItem[]> {
  const res = await apiGet<unknown>(
    `/categories/${encodeURIComponent(categoryId)}/subcategories`,
  );
  return coerceSubcategories(res);
}
