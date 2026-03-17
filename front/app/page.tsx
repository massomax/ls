"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { useProductsFeed, type ProductsFeedParams } from "@/lib/queries/products";
import { openProductExternal } from "@/lib/routing/external";
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

function HomePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { query, setQuery } = useSearch();
  const loginHref = useMemo(() => {
    const next = `${pathname}`;
    return `/login?next=${encodeURIComponent(next)}`;
  }, [pathname]);

  const offerTypesQ = useOfferTypes();
  const { me } = useSession();
  const favoritesQ = useFavorites({ enabled: Boolean(me) });
  const toggleFavoriteMutation = useToggleFavorite();

  const feedParams = useMemo<ProductsFeedParams>(
    () => ({
      limit: 20,
      sort: "rank",
    }),
    [],
  );

  const feed = useProductsFeed(feedParams);

  const [favoriteIds, setFavoriteIds] = useLocalStorageState<string[]>(
    "lp_favorites",
    [],
  );
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const serverFavoriteSet = useMemo(() => {
    const items = favoritesQ.data?.pages ?? [];
    return new Set(
      items.flatMap((page) => page.items.map((it) => it.productId)),
    );
  }, [favoritesQ.data?.pages]);
  const activeFavoriteSet = me ? serverFavoriteSet : favoriteSet;

  const allItems = useMemo(() => {
    return (feed.data?.pages ?? []).flatMap((p) => p.items);
  }, [feed.data?.pages]);

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
          hint="Авторизуйтесь, чтобы видеть ленту."
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

  if (uiItems.length === 0) {
    return (
      <div className="space-y-4">
        <SectionTitle
          title="Витрина"
          hint="Скидки и остатки — по лучшим условиям"
        />
        <PageStateEmpty
          title={q ? "По запросу ничего не найдено" : "Пока нет товаров"}
          hint={
            q
              ? "Поиск сейчас фильтрует только загруженные товары. Попробуйте другой запрос."
              : "Вернитесь чуть позже."
          }
          actionText={q ? "Очистить поиск" : "Обновить"}
          onAction={q ? () => setQuery("") : () => feed.refetch()}
        />
      </div>
    );
  }

  const offerTypes = offerTypesQ.data ?? [];

  return (
    <div className="space-y-4">
      <SectionTitle
        title={q ? "Витрина" : ""}
        hint={
          q
            ? "Поиск сейчас работает по загруженным товарам (API пока без параметра q)."
            : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 bg-white p-3 rounded-4xl">
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
            disabled={feed.isFetchingNextPage}>
            {feed.isFetchingNextPage ? "Загрузка…" : "Показать ещё"}
          </Button>
        ) : (
          <div className="text-sm text-lp-muted">Это все предложения.</div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageStateSkeleton rows={8} />}>
      <HomePageContent />
    </Suspense>
  );
}
