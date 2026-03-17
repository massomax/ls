"use client";

import { Suspense, use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ProductCard, SectionTitle, type Product as UiProduct } from "@ui/components";
import { useLocalStorageState } from "@ui/hooks/useLocalStorage";

import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import { useSearch } from "@/components/providers/search";
import { isApiError } from "@/lib/api/apiError";
import {
  listSubcategories,
  type CategoryListItem,
} from "@/lib/api/categories";
import { useCategories, useSubcategories } from "@/lib/queries/categories";
import { useOfferTypes } from "@/lib/queries/offerTypes";
import { useProductsFeed } from "@/lib/queries/products";
import { useSession } from "@/components/providers/session";
import { useFavorites, useToggleFavorite } from "@/lib/queries/favorites";
import { openProductExternal } from "@/lib/routing/external";
import type { ProductListItem, ProductSort } from "@/lib/api/products";

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

function parseSlugId(slugId: string) {
  const parts = slugId.split("-");
  if (parts.length < 2) return { slug: slugId, id: slugId };
  const id = parts[parts.length - 1];
  const slug = parts.slice(0, -1).join("-");
  return { slug, id };
}

function SubcategoryPageContent({ slugId }: { slugId: string }) {
  const router = useRouter();
  const { query, setQuery } = useSearch();
  const { slug, id } = useMemo(() => parseSlugId(slugId), [slugId]);

  const categoriesQ = useCategories();
  const offerTypesQ = useOfferTypes();
  const { me } = useSession();
  const favoritesQ = useFavorites({ enabled: Boolean(me) });
  const toggleFavoriteMutation = useToggleFavorite();
  const [sort, setSort] = useState<ProductSort>("rank");
  const [offerTypeSlug, setOfferTypeSlug] = useState<string>("");

  const [parentCategory, setParentCategory] = useState<CategoryListItem | null>(
    null,
  );
  const [subcategoryName, setSubcategoryName] = useState<string | null>(null);
  const subcategoriesQ = useSubcategories(parentCategory?.id ?? null);

  useEffect(() => {
    let active = true;

    const resolveParent = async () => {
      if (!categoriesQ.data || categoriesQ.data.length === 0) return;
      setParentCategory(null);
      setSubcategoryName(null);

      for (const category of categoriesQ.data) {
        try {
          const subs = await listSubcategories(category.id);
          const match = subs.find((item) => item.id === id);
          if (match) {
            if (active) {
              setParentCategory(category);
              setSubcategoryName(match.name);
            }
            return;
          }
        } catch {
          // Ignore failed category fetch and keep searching.
        }
      }
    };

    void resolveParent();

    return () => {
      active = false;
    };
  }, [categoriesQ.data, id]);

  const feed = useProductsFeed({
    limit: 20,
    sort,
    subcategory: id,
    offerTypeSlug: offerTypeSlug || undefined,
  });

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

  const toggleFavorite = (productId: string) => {
    if (me) {
      toggleFavoriteMutation.mutate({
        productId,
        isFavorite: activeFavoriteSet.has(productId),
      });
      return;
    }

    setFavoriteIds((prev) =>
      prev.includes(productId) ? prev.filter((x) => x !== productId) : [...prev, productId],
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
          hint="Авторизуйтесь, чтобы видеть товары."
          actionText="Войти"
          onAction={() => router.push("/login")}
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-lp-muted">
        <Link href="/" className="transition hover:text-lp-text">
          Главная
        </Link>
        <span>/</span>
        {parentCategory ? (
          <>
            <Link
              href={`/category/${encodeURIComponent(
                `${parentCategory.slug}-${parentCategory.id}`,
              )}`}
              className="transition hover:text-lp-text"
            >
              {parentCategory.name}
            </Link>
            <span>/</span>
          </>
        ) : (
          <>
            <span className="text-lp-text">Категория</span>
            <span>/</span>
          </>
        )}
        <span className="text-lp-text">{subcategoryName ?? slug}</span>
      </div>

      <SectionTitle
        title={subcategoryName ?? slug}
        hint="Подкатегории"
      />

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="sticky top-24 h-fit rounded-4xl bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Сортировка
          </div>
          <select
            className="mt-2 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={sort}
            onChange={(event) => setSort(event.target.value as ProductSort)}
          >
            <option value="rank">Рекомендуем</option>
            <option value="popular">Популярное</option>
            <option value="new">По новизне</option>
          </select>

          <div className="mt-6 text-sm font-semibold text-lp-text">Категории</div>
          <div className="mt-3 flex flex-col gap-1">
            {(categoriesQ.data ?? []).map((item) => {
              const safeSlug = item.slug.trim().length > 0 ? item.slug : "category";
              const isActive = item.id === parentCategory?.id;
              return (
                <div key={item.id} className="rounded-xl">
                  <div
                    className={`rounded-xl px-2 py-2 ${
                      isActive ? "bg-lp-bg" : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/category/${encodeURIComponent(`${safeSlug}-${item.id}`)}`,
                        )
                      }
                      className="w-full text-left text-sm text-lp-text"
                    >
                      {item.name}
                    </button>
                  </div>

                  {isActive ? (
                    <div className="ml-4 mt-1 flex flex-col gap-1">
                      {subcategoriesQ.isLoading ? (
                        <div className="text-sm text-lp-muted">Загружаем...</div>
                      ) : subcategoriesQ.data && subcategoriesQ.data.length > 0 ? (
                        subcategoriesQ.data.map((subcategory) => {
                          const safeSubSlug =
                            subcategory.slug && subcategory.slug.trim().length > 0
                              ? subcategory.slug
                              : "subcategory";
                          const isSubActive = subcategory.id === id;
                          return (
                            <button
                              key={subcategory.id}
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/subcategory/${encodeURIComponent(
                                    `${safeSubSlug}-${subcategory.id}`,
                                  )}`,
                                )
                              }
                              className={`rounded-lg px-3 py-1.5 text-left text-sm ${
                                isSubActive
                                  ? "bg-lp-bg text-lp-text"
                                  : "text-lp-text hover:bg-slate-50"
                              }`}
                            >
                              {subcategory.name}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-sm text-lp-muted">Нет подкатегорий.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-lp-muted">
            Тип предложения
          </div>
          <select
            className="mt-2 w-full rounded-2xl border border-lp-border bg-white px-3 py-2 text-sm text-lp-text"
            value={offerTypeSlug}
            onChange={(event) => setOfferTypeSlug(event.target.value)}
          >
            <option value="">Все бейджи</option>
            {offerTypes.map((ot) => (
              <option key={ot.slug} value={ot.slug}>
                {ot.badgeText || ot.name}
              </option>
            ))}
          </select>
        </aside>

        {uiItems.length === 0 ? (
          <div className="rounded-4xl bg-white p-6 text-center">
            <div className="text-sm font-semibold text-lp-text">
              Пока нет товаров
            </div>
            <div className="mt-1 text-sm text-lp-muted">
              Вернитесь чуть позже.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 bg-white p-3 rounded-4xl">
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
        )}
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
    </div>
  );
}

export default function SubcategoryPage({
  params,
}: {
  params: Promise<{ slugId: string }>;
}) {
  const { slugId } = use(params);
  return (
    <Suspense fallback={<PageStateSkeleton rows={8} />}>
      <SubcategoryPageContent slugId={slugId} />
    </Suspense>
  );
}
