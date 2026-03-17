import type { ProductSort } from "@/lib/api/products";

export type FeedFilters = {
  sort: ProductSort;
  hot: boolean;
  offerTypeSlug: string | null;
  category: string | null;
  subcategory: string | null;
};

export function parseFilters(sp: URLSearchParams): FeedFilters {
  const sortRaw = sp.get("sort");
  const sort: ProductSort =
    sortRaw === "new" || sortRaw === "popular" || sortRaw === "rank"
      ? sortRaw
      : "rank";

  const hot = sp.get("hot") === "1";

  const offerTypeSlug = sp.get("offerTypeSlug");
  const category = sp.get("category");
  const subcategory = sp.get("subcategory");

  return {
    sort,
    hot,
    offerTypeSlug: offerTypeSlug && offerTypeSlug.length > 0 ? offerTypeSlug : null,
    category: category && category.length > 0 ? category : null,
    subcategory: subcategory && subcategory.length > 0 ? subcategory : null,
  };
}

export function writeFilters(base: URLSearchParams, next: Partial<FeedFilters>) {
  const sp = new URLSearchParams(base);

  if (next.sort) sp.set("sort", next.sort);
  if (typeof next.hot === "boolean") sp.set("hot", next.hot ? "1" : "0");

  if (next.offerTypeSlug === null) sp.delete("offerTypeSlug");
  else if (typeof next.offerTypeSlug === "string")
    sp.set("offerTypeSlug", next.offerTypeSlug);

  if (next.category === null) sp.delete("category");
  else if (typeof next.category === "string") sp.set("category", next.category);

  if (next.subcategory === null) sp.delete("subcategory");
  else if (typeof next.subcategory === "string")
    sp.set("subcategory", next.subcategory);

  if (Object.prototype.hasOwnProperty.call(next, "category") && !next.category) {
    sp.delete("subcategory");
  }

  return sp;
}
