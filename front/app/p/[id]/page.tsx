"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  Sheet,
  SectionTitle,
  ProductCard,
  type Product as UiProduct,
} from "@ui/components";
import { Icon } from "@ui/components/layout/icons";
import { useLocalStorageState } from "@ui/hooks/useLocalStorage";

import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";

import type { SimilarProductListItem } from "@/lib/api/products";
import { isApiError } from "@/lib/api/apiError";
import { useProduct, useSimilarProducts } from "@/lib/queries/product";
import { useOfferTypes } from "@/lib/queries/offerTypes";
import { useProductsByIds } from "@/lib/queries/products";
import { listSubcategories, type SubcategoryListItem } from "@/lib/api/categories";
import { useCategories } from "@/lib/queries/categories";
import { useSession } from "@/components/providers/session";
import { useFavorites, useToggleFavorite } from "@/lib/queries/favorites";
import { openProductExternal } from "@/lib/routing/external";

const rubFmt = new Intl.NumberFormat("ru-RU");
function rub(n: number) {
  return `${rubFmt.format(n)} ₽`;
}

function pct(discountPercent: number) {
  if (!Number.isFinite(discountPercent)) return 0;
  if (discountPercent <= 1) return Math.round(discountPercent * 100);
  return Math.round(discountPercent);
}

function toUiSimilar(item: SimilarProductListItem): UiProduct {
  const oldPrice = typeof item.oldPrice === "number" ? item.oldPrice : item.price;
  return {
    id: item.id,
    title: item.title,
    photos: item.photos,
    price: item.price,
    oldPrice,
    discountPercent: item.discountPercent ?? 0,
    isHot: item.isHot,
    offerTypeId: "",
    views7d: 0,
    favoritesCount: 0,
    createdAt: "",
  };
}

function ProductPhotoGallery({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const selectedPhoto = photos[selectedPhotoIndex];
  const showMainImage = Boolean(selectedPhoto) && !imageError;

  return (
    <div className="flex h-[520px] max-h-[600px] w-full gap-4 md:h-[600px]">
      <div className="w-20 shrink-0 overflow-y-auto pr-1">
        <div className="flex flex-col gap-2">
          {photos.map((photo, index) => {
            const isActive = index === selectedPhotoIndex;
            return (
              <button
                type="button"
                key={`${photo}-${index}`}
                onClick={() => {
                  setSelectedPhotoIndex(index);
                  setImageError(false);
                }}
                className={`relative h-20 w-full overflow-hidden rounded-lg border-2 bg-slate-100 ${
                  isActive ? "border-lp-primary ring-2 ring-lp-primary/30" : "border-lp-border"
                }`}
                aria-label={`Показать фото ${index + 1}`}
              >
                <img
                  src={photo}
                  alt={title}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative h-full aspect-[3/4] rounded-[24px] bg-slate-100 overflow-hidden">
        {showMainImage ? (
          <img
            src={selectedPhoto}
            alt={title}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}

export default function ProductPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string | string[] }>();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam ?? "";
  const loginHref = useMemo(
    () => `/login?next=${encodeURIComponent(pathname)}`,
    [pathname],
  );

  const productQ = useProduct(id);
  const similarQ = useSimilarProducts(id);
  const offerTypesQ = useOfferTypes();
  const categoriesQ = useCategories();
  const { me } = useSession();
  const favoritesQ = useFavorites({ enabled: Boolean(me) });
  const toggleFavoriteMutation = useToggleFavorite();

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

  const toggleFavorite = (pid: string) => {
    if (me) {
      toggleFavoriteMutation.mutate({
        productId: pid,
        isFavorite: activeFavoriteSet.has(pid),
      });
      return;
    }

    setFavoriteIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
  };

  const p = productQ.data ?? null;
  const similarItems = similarQ.data?.items ?? [];
  const similarIds = useMemo(
    () => similarItems.map((item) => item.id),
    [similarItems],
  );
  const similarDetailsQ = useProductsByIds(similarIds, similarIds.length > 0);
  const similarOfferTypeMap = useMemo(() => {
    const entries = similarDetailsQ.data?.items ?? [];
    return new Map(entries.map((entry) => [entry.id, entry.offerTypeId]));
  }, [similarDetailsQ.data?.items]);
  const offerTypes = offerTypesQ.data ?? [];
  const [parentCategory, setParentCategory] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [subcategory, setSubcategory] = useState<SubcategoryListItem | null>(
    null,
  );
  const DETAILS_MAX_HEIGHT = 600;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const detailsMeasureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const measureEl = detailsMeasureRef.current;
    if (!measureEl) return;

    const update = () => {
      const height = measureEl.getBoundingClientRect().height;
      setShowMoreDetails(height > DETAILS_MAX_HEIGHT + 1);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [p?.title, p?.description]);

  useEffect(() => {
    const product = p;
    if (!product || !categoriesQ.data) return;

    const parent =
      categoriesQ.data.find((item) => item.id === product.mainCategoryId) ??
      null;
    setParentCategory(
      parent ? { id: parent.id, name: parent.name, slug: parent.slug } : null,
    );

    if (!product.subcategoryId || !parent) {
      setSubcategory(null);
      return;
    }

    let active = true;
    listSubcategories(parent.id)
      .then((items) => {
        if (!active) return;
        setSubcategory(
          items.find((item) => item.id === product.subcategoryId) ?? null,
        );
      })
      .catch(() => {
        if (active) setSubcategory(null);
      });

    return () => {
      active = false;
    };
  }, [categoriesQ.data, p]);
  if (productQ.isLoading) return <PageStateSkeleton rows={4} />;

  if (productQ.isError) {
    if (isApiError(productQ.error) && productQ.error.status === 401) {
      return (
        <PageStateEmpty
          title="Вы не вошли"
          hint="Авторизуйтесь, чтобы видеть карточку."
          actionText="Войти"
          onAction={() => router.push(loginHref)}
        />
      );
    }

    return (
      <PageStateError
        title="Товар не загрузился"
        message={`${productQ.error.code}: ${productQ.error.message}`}
        onRetry={() => productQ.refetch()}
      />
    );
  }

  if (!p) return <PageStateSkeleton rows={4} />;
  const goExternal = async (pid: string) => {
    const externalUrl = p.externalUrl ?? "";
    await openProductExternal(pid, externalUrl);
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Карточка товара" />

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-lp-muted">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-lp-border bg-white/90 text-lp-text transition hover:bg-white"
              aria-label="Назад"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <Link href="/" className="transition hover:text-lp-text">
              Главная
            </Link>
            {parentCategory ? (
              <>
                <span>/</span>
                <Link
                  href={`/category/${encodeURIComponent(
                    `${parentCategory.slug}-${parentCategory.id}`,
                  )}`}
                  className="transition hover:text-lp-text"
                >
                  {parentCategory.name}
                </Link>
              </>
            ) : null}
            {subcategory ? (
              <>
                <span>/</span>
                <Link
                  href={`/subcategory/${encodeURIComponent(
                    `${subcategory.slug?.trim() || "subcategory"}-${subcategory.id}`,
                  )}`}
                  className="transition hover:text-lp-text"
                >
                  {subcategory.name}
                </Link>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="w-full lg:w-[520px]">
              <ProductPhotoGallery
                key={p.id}
                photos={p.photos ?? []}
                title={p.title}
              />
            </div>

            <div className="relative flex w-full flex-col gap-4 lg:flex-1">
              <div
                ref={detailsRef}
                className="flex flex-col gap-3 lg:max-h-[600px] lg:overflow-hidden"
              >
                <div className="text-2xl font-semibold text-lp-text line-clamp-2">
                  {p.title}
                </div>
                <h2 className="text-2xl font-semibold text-lp-text">О товаре</h2>
                {p.description ? (
                  <div className="text-base text-lp-text line-clamp-6">
                    {p.description}
                  </div>
                ) : (
                  <div className="text-base text-lp-muted">Описание отсутствует.</div>
                )}
              </div>
              <div
                ref={detailsMeasureRef}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 w-full opacity-0"
              >
                <div className="text-2xl font-semibold text-lp-text">
                  {p.title}
                </div>
                <h2 className="text-2xl font-semibold text-lp-text">О товаре</h2>
                {p.description ? (
                  <div className="text-base text-lp-text">{p.description}</div>
                ) : (
                  <div className="text-base text-lp-muted">Описание отсутствует.</div>
                )}
              </div>
              {showMoreDetails ? (
                <Button variant="ghost" onClick={() => setDetailsOpen(true)}>
                  Смотреть полностью
                </Button>
              ) : null}

              <div className="pt-2" />
            </div>

            <div className="w-full rounded-2xl border border-lp-border bg-white p-4 shadow-lp-sm lg:w-[320px]">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-lp-text">
                  {rub(p.price)}
                </div>
                {typeof p.oldPrice === "number" ? (
                  <div className="text-sm text-lp-muted line-through">
                    {rub(p.oldPrice)}
                  </div>
                ) : null}
              </div>
              {typeof p.discountPercent === "number" ? (
                <div className="mt-2 inline-flex rounded-full bg-lp-accent px-3 py-1 text-sm font-semibold text-lp-primary">
                  −{pct(p.discountPercent)}%
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-lp-border bg-slate-50 px-3 py-2 text-sm text-lp-text">
                <div className="text-base font-semibold">Продавец</div>
                <div className="mt-1 text-base">{p.seller.companyName}</div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={() => void goExternal(p.id)}>Перейти</Button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(p.id)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-lp-border bg-white/90 backdrop-blur hover:bg-white"
                  style={{
                    color: activeFavoriteSet.has(p.id)
                      ? "var(--lp-danger)"
                      : "var(--lp-text)",
                  }}
                  aria-label={
                    activeFavoriteSet.has(p.id)
                      ? "Убрать из избранного"
                      : "Добавить в избранное"
                  }
                >
                  <Icon name="heart" />
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Sheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={p.title}
        subtitle="Описание товара"
      >
        <div className="space-y-4 text-sm text-lp-text">
          <div className="text-lg font-semibold">{p.title}</div>
          {p.description ? (
            <div className="whitespace-pre-line">{p.description}</div>
          ) : (
            <div className="text-lp-muted">Описание отсутствует.</div>
          )}
        </div>
      </Sheet>

      <SectionTitle title="Похожие предложения" />

      {similarQ.isLoading ? (
        <PageStateSkeleton rows={6} />
      ) : similarQ.isError ? (
        isApiError(similarQ.error) && similarQ.error.status === 401 ? (
          <PageStateEmpty
            title="Вы не вошли"
            hint="Авторизуйтесь, чтобы видеть похожие товары."
            actionText="Войти"
            onAction={() => router.push(loginHref)}
          />
        ) : (
          <PageStateError
            title="Похожие не загрузились"
            message={`${similarQ.error.code}: ${similarQ.error.message}`}
            onRetry={() => similarQ.refetch()}
          />
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 bg-white p-3 rounded-4xl">
          {similarItems.map((item) => {
            const ui = toUiSimilar(item);
            const offerTypeId = similarOfferTypeMap.get(ui.id);
            return (
              <ProductCard
                key={ui.id}
                p={{
                  ...ui,
                  offerTypeId: offerTypeId ?? ui.offerTypeId,
                }}
                offerTypes={offerTypes}
                favorite={activeFavoriteSet.has(ui.id)}
                onToggleFavorite={() => toggleFavorite(ui.id)}
                onOpen={() => router.push(`/p/${ui.id}`)}
                onGo={() => {}}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
