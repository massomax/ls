"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  ProductCard,
  SectionTitle,
  type Product as UiProduct,
} from "@ui/components";
import { useLocalStorageState } from "@ui/hooks/useLocalStorage";

import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import { useSearch } from "@/components/providers/search";
import { isApiError } from "@/lib/api/apiError";

import type { ProductListItem } from "@/lib/api/products";
import { useOfferTypes } from "@/lib/queries/offerTypes";
import { useProductsFeed } from "@/lib/queries/products";
import { useCategories, useSubcategories } from "@/lib/queries/categories";
import { parseFilters, writeFilters, type FeedFilters } from "@/lib/routing/filters";
import { openProductExternal } from "@/lib/routing/external";
import FeedFiltersChips from "@/components/filters/FeedFiltersChips";
import { useSession } from "@/components/providers/session";
import { useFavorites, useToggleFavorite } from "@/lib/queries/favorites";

function toUiProduct(p: ProductListItem): UiProduct {
  return {
    id: p.id,
    title: p.title,
    photos: p.photos,
    price: p.price,
    oldPrice: p.oldPrice,
    discountPercent: p.discountPercent,
    isHot: p.isHot,
    offerTypeId: p.offerTypeId,
    views7d: p.views7d,
    favoritesCount: p.favoritesCount,
    createdAt: p.createdAt,
  };
}

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { query, setQuery } = useSearch();
  const loginHref = useMemo(() => {
    const qs = sp.toString();
    const next = `${pathname}${qs ? `?${qs}` : ""}`;
    return `/login?next=${encodeURIComponent(next)}`;
  }, [pathname, sp]);

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(sp.toString())),
    [sp],
  );

  const offerTypesQ = useOfferTypes();
  const categoriesQ = useCategories();
  const subcategoriesQ = useSubcategories(filters.category);
  const { me } = useSession();
  const favoritesQ = useFavorites({ enabled: Boolean(me) });
  const toggleFavoriteMutation = useToggleFavorite();

  const feedParams = useMemo(
    () => ({
      limit: 20,
      sort: filters.sort,
      hot: filters.hot,
      offerTypeSlug: filters.offerTypeSlug ?? undefined,
      category: filters.category ?? undefined,
      subcategory: filters.subcategory ?? undefined,
    }),
    [filters],
  );
  const feed = useProductsFeed(feedParams);

  const [favoriteIds, setFavoriteIds] = useLocalStorageState<string[]>(
    "lp_favorites",
    [],
  );
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const serverFavoriteSet = useMemo(() => {
    const items = favoritesQ.data?.pages ?? [];
    return new Set(items.flatMap((page) => page.items.map((it) => it.productId)));
  }, [favoritesQ.data?.pages]);
  const activeFavoriteSet = me ? serverFavoriteSet : favoriteSet;

  const allItems = useMemo(
    () => (feed.data?.pages ?? []).flatMap((p) => p.items),
    [feed.data?.pages],
  );

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return allItems;
    return allItems.filter((x) => x.title.toLowerCase().includes(q));
  }, [allItems, q]);

  const uiItems = useMemo(
    () => filtered.map((item) => ({ item, ui: toUiProduct(item) })),
    [filtered],
  );

  const toggleFavorite = (id: string) => {
    if (me) {
      toggleFavoriteMutation.mutate({
        productId: id,
        isFavorite: activeFavoriteSet.has(id),
      });
      return;
    }

    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const goExternal = async (item: ProductListItem) => {
    await openProductExternal(item.id, item.externalUrl ?? "");
  };

  if (feed.isLoading) return <PageStateSkeleton rows={8} />;

  if (feed.isError) {
    if (isApiError(feed.error) && feed.error.status === 401) {
      return (
        <PageStateEmpty
          title="Вы не вошли"
          hint="Авторизуйтесь, чтобы видеть поиск."
          actionText="Войти"
          onAction={() => router.push(loginHref)}
        />
      );
    }

    return (
      <PageStateError
        message={`${feed.error.code}: ${feed.error.message}`}
        onRetry={() => feed.refetch()}
      />
    );
  }

  const offerTypes = offerTypesQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const subcategories = subcategoriesQ.data ?? [];

  const setFiltersInUrl = (next: Partial<FeedFilters>) => {
    const current = new URLSearchParams(sp.toString());
    const merged = writeFilters(current, next);
    const qs = merged.toString();
    router.replace(qs.length ? `${pathname}?${qs}` : pathname);
  };

  const hasActiveFilters =
    filters.hot ||
    Boolean(filters.offerTypeSlug) ||
    Boolean(filters.category) ||
    Boolean(filters.subcategory) ||
    filters.sort !== "rank";

  const titleHint = !q && !hasActiveFilters
    ? "Введите запрос в верхней строке"
    : uiItems.length === 0
      ? "Поиск по названию (client-side)"
      : `Результаты: ${uiItems.length}`;

  return (
    <div className="space-y-4">
      <SectionTitle title="Поиск" hint={titleHint} />

      <FeedFiltersChips
        filters={filters}
        offerTypes={offerTypes}
        categories={categories}
        subcategories={subcategories}
        onChange={setFiltersInUrl}
      />

      {!q && !hasActiveFilters ? (
        <PageStateEmpty
          title="Введите запрос"
          hint="Поиск пока фильтрует загруженные товары на клиенте."
          actionText="Очистить"
          onAction={() => setQuery("")}
        />
      ) : uiItems.length === 0 ? (
        <PageStateEmpty
          title="Ничего не найдено"
          hint="Попробуйте другой запрос или подгрузите ещё товаров."
          actionText={feed.hasNextPage ? "Загрузить ещё" : "Очистить"}
          onAction={
            feed.hasNextPage ? () => feed.fetchNextPage() : () => setQuery("")
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {uiItems.map(({ item, ui }) => (
              <ProductCard
                key={ui.id}
                p={ui}
                offerTypes={offerTypes}
                favorite={activeFavoriteSet.has(ui.id)}
                onToggleFavorite={() => toggleFavorite(ui.id)}
                onOpen={() => router.push(`/p/${ui.id}`)}
                onGo={() => void goExternal(item)}
              />
            ))}
          </div>

          <div className="flex justify-center py-2">
            {feed.hasNextPage ? (
              <Button
                variant="secondary"
                onClick={() => feed.fetchNextPage()}
                disabled={feed.isFetchingNextPage}
              >
                {feed.isFetchingNextPage ? "Загрузка…" : "Показать ещё"}
              </Button>
            ) : (
              <div className="text-sm text-lp-muted">Это все предложения.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageStateSkeleton rows={8} />}>
      <SearchPageContent />
    </Suspense>
  );
}
