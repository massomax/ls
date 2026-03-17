"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  ProductCard,
  SectionTitle,
  type Product as UiProduct,
} from "@ui/components";
import { useLocalStorageState } from "@ui/hooks/useLocalStorage";
import { useQueryClient } from "@tanstack/react-query";

import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";

import type { ProductDetails } from "@/lib/api/products";
import { isApiError } from "@/lib/api/apiError";
import { useOfferTypes } from "@/lib/queries/offerTypes";
import { useProductsByIds } from "@/lib/queries/products";
import { useSession } from "@/components/providers/session";
import { useFavorites, useToggleFavorite } from "@/lib/queries/favorites";
import { openProductExternal } from "@/lib/routing/external";
import { mapWithConcurrencyLimit } from "@/lib/utils/mapWithConcurrencyLimit";
import { removeFavorite } from "@/lib/api/favorites";

function toUiProduct(p: ProductDetails): UiProduct {
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

function FavoritesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const queryClient = useQueryClient();
  const { me, status } = useSession();
  const loginHref = useMemo(() => {
    const qs = sp.toString();
    const next = `${pathname}${qs ? `?${qs}` : ""}`;
    return `/login?next=${encodeURIComponent(next)}`;
  }, [pathname, sp]);
  const favoritesQ = useFavorites({ enabled: Boolean(me) });
  const toggleFavoriteMutation = useToggleFavorite();
  const [isRemovingUnavailable, setIsRemovingUnavailable] = useState(false);

  const [favoriteIds, setFavoriteIds] = useLocalStorageState<string[]>(
    "lp_favorites",
    [],
  );
  const serverFavoriteIds = useMemo(() => {
    const items = favoritesQ.data?.pages ?? [];
    return items.flatMap((page) => page.items.map((it) => it.productId));
  }, [favoritesQ.data?.pages]);
  const activeFavoriteIds = me ? serverFavoriteIds : favoriteIds;
  const activeFavoriteSet = useMemo(
    () => new Set(activeFavoriteIds),
    [activeFavoriteIds],
  );

  const offerTypesQ = useOfferTypes();

  const shouldLoadProducts =
    status !== "loading" &&
    activeFavoriteIds.length > 0 &&
    (!me || favoritesQ.isSuccess);
  const productsByIdsQ = useProductsByIds(activeFavoriteIds, shouldLoadProducts);
  const unavailableIds = useMemo(() => {
    const errors = productsByIdsQ.data?.errors ?? [];
    const unique = new Set(errors.map((entry) => entry.id));
    return Array.from(unique);
  }, [productsByIdsQ.data?.errors]);

  const uiItems = useMemo(
    () =>
      (productsByIdsQ.data?.items ?? []).map((item) => ({
        item,
        ui: toUiProduct(item),
      })),
    [productsByIdsQ.data?.items],
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

  const goExternal = async (item: ProductDetails) => {
    await openProductExternal(item.id, item.externalUrl ?? "");
  };

  const removeUnavailable = async () => {
    if (unavailableIds.length === 0 || isRemovingUnavailable) return;

    if (!me) {
      const unavailableSet = new Set(unavailableIds);
      setFavoriteIds((prev) => prev.filter((id) => !unavailableSet.has(id)));
      return;
    }

    setIsRemovingUnavailable(true);

    try {
      await mapWithConcurrencyLimit(unavailableIds, 4, async (id) => {
        try {
          await removeFavorite(id);
        } catch {
          // Ignore failures; user can retry cleanup.
        }
      });
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } finally {
      setIsRemovingUnavailable(false);
    }
  };

  if (status === "loading") return <PageStateSkeleton rows={4} />;

  if (favoritesQ.isLoading && me) return <PageStateSkeleton rows={4} />;

  if (favoritesQ.isError && me) {
    if (isApiError(favoritesQ.error) && favoritesQ.error.status === 401) {
      return (
        <PageStateEmpty
          title="Вы не вошли"
          hint="Авторизуйтесь, чтобы видеть серверное избранное."
          actionText="Войти"
          onAction={() => router.push(loginHref)}
        />
      );
    }

    return (
      <PageStateError
        message={`${favoritesQ.error.code}: ${favoritesQ.error.message}`}
        onRetry={() => favoritesQ.refetch()}
      />
    );
  }

  if (activeFavoriteIds.length === 0) {
    return (
      <div className="space-y-4">
        <SectionTitle
          title="Избранное"
          hint={me ? "Серверное избранное" : "Избранное"}
        />
        <PageStateEmpty
          title="Пока пусто"
          hint="Добавьте товары в избранное на витрине."
          actionText="На главную"
          onAction={() => router.push("/")}
        />
      </div>
    );
  }

  if (productsByIdsQ.isLoading) return <PageStateSkeleton rows={8} />;

  if (productsByIdsQ.isError) {
    return (
      <PageStateError
        message="Не удалось загрузить избранные товары."
        onRetry={() => productsByIdsQ.refetch()}
      />
    );
  }

  const offerTypes = offerTypesQ.data ?? [];
  const showUnavailableBanner = unavailableIds.length > 0;

  return (
    <div className="space-y-4">
      <SectionTitle title="Избранное" hint={`Товаров: ${uiItems.length}`} />

      {showUnavailableBanner ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div>Некоторые товары недоступны.</div>
          <Button
            variant="secondary"
            onClick={() => void removeUnavailable()}
            disabled={isRemovingUnavailable}
          >
            {isRemovingUnavailable ? "Убираем..." : "Убрать недоступные"}
          </Button>
        </div>
      ) : null}

      {uiItems.length === 0 ? (
        <PageStateEmpty
          title="Товары недоступны"
          hint="Удалите недоступные товары из избранного."
          actionText="Убрать недоступные"
          onAction={() => void removeUnavailable()}
        />
      ) : (
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
      )}

    </div>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={<PageStateSkeleton rows={4} />}>
      <FavoritesPageContent />
    </Suspense>
  );
}
