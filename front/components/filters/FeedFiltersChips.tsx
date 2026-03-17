"use client";

import { Chip } from "@ui/components";

import type { OfferTypeListItem } from "@/lib/api/offerTypes";
import type { CategoryListItem, SubcategoryListItem } from "@/lib/api/categories";
import type { FeedFilters } from "@/lib/routing/filters";

type FeedFiltersChipsProps = {
  filters: FeedFilters;
  offerTypes: OfferTypeListItem[];
  categories: CategoryListItem[];
  subcategories: SubcategoryListItem[];
  onChange: (next: Partial<FeedFilters>) => void;
};

export default function FeedFiltersChips({
  filters,
  offerTypes,
  categories,
  subcategories,
  onChange,
}: FeedFiltersChipsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          active={filters.sort === "rank"}
          onClick={() => onChange({ sort: "rank" })}
        >
          Рекомендуем
        </Chip>
        <Chip
          active={filters.sort === "new"}
          onClick={() => onChange({ sort: "new" })}
        >
          Новые
        </Chip>
        <Chip
          active={filters.sort === "popular"}
          onClick={() => onChange({ sort: "popular" })}
        >
          Популярные
        </Chip>

        <div className="mx-1 h-5 w-px bg-lp-border" />

        <Chip
          active={filters.hot}
          onClick={() => onChange({ hot: !filters.hot })}
        >
          Hot −50%
        </Chip>

        <div className="mx-1 h-5 w-px bg-lp-border" />

        <Chip
          active={!filters.offerTypeSlug}
          onClick={() => onChange({ offerTypeSlug: null })}
        >
          Все типы
        </Chip>
        {offerTypes.slice(0, 6).map((ot) => (
          <Chip
            key={ot.slug}
            active={filters.offerTypeSlug === ot.slug}
            onClick={() => onChange({ offerTypeSlug: ot.slug })}
          >
            {ot.badgeText || ot.name}
          </Chip>
        ))}
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Chip
            active={!filters.category}
            onClick={() => onChange({ category: null, subcategory: null })}
          >
            Все категории
          </Chip>
          {categories.slice(0, 6).map((c) => (
            <Chip
              key={c.id}
              active={filters.category === c.id}
              onClick={() => onChange({ category: c.id, subcategory: null })}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      ) : null}

      {filters.category && subcategories.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Chip
            active={!filters.subcategory}
            onClick={() => onChange({ subcategory: null })}
          >
            Все подкатегории
          </Chip>
          {subcategories.slice(0, 10).map((c) => (
            <Chip
              key={c.id}
              active={filters.subcategory === c.id}
              onClick={() => onChange({ subcategory: c.id })}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      ) : null}
    </>
  );
}
