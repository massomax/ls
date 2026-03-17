"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, Input, SectionTitle } from "@ui/components";
import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import { isApiError } from "@/lib/api/apiError";
import type { SellerStatus } from "@/lib/api/sellers";
import { useCategories, useSubcategories } from "@/lib/queries/categories";
import { useMe } from "@/lib/queries/me";
import { useOfferTypes } from "@/lib/queries/offerTypes";
import { useMySeller } from "@/lib/queries/seller";
import {
  useArchiveSellerProduct,
  usePublishSellerProduct,
  useSellerProduct,
  useUnpublishSellerProduct,
  useUpdateSellerProduct,
} from "@/src/lib/queries/sellerProducts";
import SellerImagesField from "@/src/components/seller/SellerImagesField";
import type {
  SellerProductDetail,
  SellerProductStatus,
} from "@/src/lib/api/sellerProducts";

const SELLER_STATUS_LABELS: Record<SellerStatus, string> = {
  pending: "На модерации",
  active: "Активен",
  rejected: "Отклонен",
  suspended: "Приостановлен",
};

const PRODUCT_STATUS_LABELS: Record<SellerProductStatus, string> = {
  draft: "Черновик",
  pending: "На модерации",
  active: "Активен",
  rejected: "Отклонен",
  archived: "Архив",
};

const PRODUCT_STATUS_CLASSES: Record<SellerProductStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  archived: "border-slate-200 bg-slate-50 text-slate-600",
};

const selectClassName =
  "w-full rounded-2xl border border-lp-border bg-white px-4 py-3 text-sm text-lp-text outline-none focus:ring-2 focus:ring-lp-primary focus:ring-offset-2";

const textareaClassName =
  "min-h-[120px] w-full rounded-2xl border border-lp-border bg-white px-4 py-3 text-sm text-lp-text outline-none focus:ring-2 focus:ring-lp-primary focus:ring-offset-2";

export default function SellerProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const meQuery = useMe();
  const me = meQuery.data ?? null;
  const hasSellerRole =
    me?.roles?.some((role) => role === "seller" || role === "admin") ?? false;
  const sellerQuery = useMySeller(Boolean(me));
  const seller = sellerQuery.data ?? null;
  const isActiveSeller = seller?.status === "active";

  const canLoadProduct = Boolean(id) && Boolean(me) && hasSellerRole && isActiveSeller;
  const productQuery = useSellerProduct(id, canLoadProduct);

  if (meQuery.isLoading) {
    return <PageStateSkeleton rows={6} />;
  }

  const authError = meQuery.error;
  const isAnon = isApiError(authError) && authError.status === 401;

  if (meQuery.isError && !isAnon) {
    return (
      <PageStateError
        title="Не удалось проверить доступ"
        message="Попробуйте обновить страницу или повторить запрос."
        onRetry={() => meQuery.refetch()}
      />
    );
  }

  if (!me) {
    return (
      <PageStateEmpty
        title="Вы не вошли"
        hint="Авторизуйтесь, чтобы редактировать товар."
        actionText="Войти"
        onAction={() => router.push("/login")}
      />
    );
  }

  if (!hasSellerRole) {
    return (
      <PageStateEmpty
        title="Доступ только продавцам"
        hint="Получите статус продавца в личном кабинете."
        actionText="В аккаунт"
        onAction={() => router.push("/account")}
      />
    );
  }

  if (sellerQuery.isLoading) {
    return <PageStateSkeleton rows={4} />;
  }

  if (sellerQuery.isError) {
    return (
      <PageStateError
        title="Не удалось загрузить профиль продавца"
        message="Попробуйте повторить запрос."
        onRetry={() => sellerQuery.refetch()}
      />
    );
  }

  if (!seller || !isActiveSeller) {
    const statusLabel = seller?.status
      ? SELLER_STATUS_LABELS[seller.status]
      : "Не найден";

    return (
      <PageStateEmpty
        title="Кабинет продавца недоступен"
        hint={`Статус продавца: ${statusLabel}. Завершите настройку профиля в аккаунте.`}
        actionText="В аккаунт"
        onAction={() => router.push("/account")}
      />
    );
  }

  if (productQuery.isLoading) {
    return <PageStateSkeleton rows={6} />;
  }

  if (productQuery.isError) {
    return (
      <PageStateError
        title="Не удалось загрузить товар"
        message="Попробуйте повторить запрос."
        onRetry={() => productQuery.refetch()}
      />
    );
  }

  const product = productQuery.data;

  if (!product) {
    return (
      <PageStateEmpty
        title="Товар не найден"
        hint="Попробуйте выбрать другой товар."
        actionText="К списку"
        onAction={() => router.push("/seller/products")}
      />
    );
  }
  return <SellerProductEditForm key={product.id} product={product} />;
}

function SellerProductEditForm({ product }: { product: SellerProductDetail }) {
  const router = useRouter();
  const updateMutation = useUpdateSellerProduct();
  const publishMutation = usePublishSellerProduct();
  const unpublishMutation = useUnpublishSellerProduct();
  const archiveMutation = useArchiveSellerProduct();

  const categoriesQuery = useCategories();
  const offerTypesQuery = useOfferTypes();

  const [title, setTitle] = useState(product.title ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [oldPrice, setOldPrice] = useState(String(product.oldPrice ?? ""));
  const [price, setPrice] = useState(String(product.price ?? ""));
  const [categoryId, setCategoryId] = useState(product.mainCategoryId ?? "");
  const [subcategoryId, setSubcategoryId] = useState(product.subcategoryId ?? "");
  const [offerTypeId, setOfferTypeId] = useState(product.offerTypeId ?? "");
  const [externalUrl, setExternalUrl] = useState(product.externalUrl ?? "");
  const [photos, setPhotos] = useState<string[]>(product.photos ?? []);
  const [formError, setFormError] = useState<string | null>(null);

  const subcategoriesQuery = useSubcategories(categoryId || null);

  const updateError = useMemo(() => {
    if (!updateMutation.error) return null;
    return isApiError(updateMutation.error)
      ? `${updateMutation.error.code}: ${updateMutation.error.message}`
      : "Не удалось сохранить товар.";
  }, [updateMutation.error]);

  const publishError = useMemo(() => {
    if (!publishMutation.error) return null;
    return isApiError(publishMutation.error)
      ? `${publishMutation.error.code}: ${publishMutation.error.message}`
      : "Не удалось отправить на модерацию.";
  }, [publishMutation.error]);

  const unpublishError = useMemo(() => {
    if (!unpublishMutation.error) return null;
    return isApiError(unpublishMutation.error)
      ? `${unpublishMutation.error.code}: ${unpublishMutation.error.message}`
      : "Не удалось снять с витрины.";
  }, [unpublishMutation.error]);

  const archiveError = useMemo(() => {
    if (!archiveMutation.error) return null;
    return isApiError(archiveMutation.error)
      ? `${archiveMutation.error.code}: ${archiveMutation.error.message}`
      : "Не удалось архивировать товар.";
  }, [archiveMutation.error]);

  const createdAt = new Date(product.createdAt);
  const createdLabel = Number.isNaN(createdAt.getTime())
    ? product.createdAt
    : createdAt.toLocaleDateString("ru-RU");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const oldPriceValue = Number(oldPrice);
    const priceValue = Number(price);
    const initialPhotos = product.photos ?? [];
    const photosChanged =
      photos.length !== initialPhotos.length ||
      photos.some((url, index) => url !== initialPhotos[index]);

    if (!title.trim()) {
      setFormError("Укажите название товара.");
      return;
    }

    if (!Number.isFinite(oldPriceValue) || !Number.isFinite(priceValue)) {
      setFormError("Укажите корректные цены.");
      return;
    }

    if (oldPriceValue <= priceValue) {
      setFormError("Старая цена должна быть больше текущей.");
      return;
    }

    if (!categoryId) {
      setFormError("Выберите категорию.");
      return;
    }

    if (!offerTypeId) {
      setFormError("Выберите тип предложения.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: product.id,
        patch: {
          title: title.trim(),
          description: description.trim() || undefined,
          ...(photosChanged ? { photos } : {}),
          oldPrice: oldPriceValue,
          price: priceValue,
          mainCategoryId: categoryId,
          subcategoryId: subcategoryId || undefined,
          offerTypeId,
          externalUrl: externalUrl.trim() || undefined,
        },
      });
    } catch {
      // Ошибка отображается через updateError
    }
  };

  const onArchive = async () => {
    if (!window.confirm("Архивировать товар? Он исчезнет из витрины.")) {
      return;
    }

    try {
      await archiveMutation.mutateAsync(product.id);
      router.push("/seller/products?status=archived");
    } catch {
      // Ошибка отображается через archiveError
    }
  };

  const canPublish = product.status === "draft" || product.status === "rejected";
  const canUnpublish = product.status === "active";

  return (
    <div className="space-y-4">
      <SectionTitle title="Редактирование товара" hint={`Создан: ${createdLabel}`} />

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium text-lp-text">Статус:</div>
            <Badge className={PRODUCT_STATUS_CLASSES[product.status]}>
              {PRODUCT_STATUS_LABELS[product.status]}
            </Badge>
          </div>

          {product.moderationNote ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {product.moderationNote}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <div className="text-sm font-medium text-lp-text">Название</div>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например, кожаная сумка"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-lp-text">Описание</div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Дополнительные детали"
                className={textareaClassName}
              />
            </div>

            <SellerImagesField
              value={photos}
              onChange={setPhotos}
              disabled={updateMutation.isPending}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-lp-text">Старая цена</div>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={oldPrice}
                  onChange={(event) => setOldPrice(event.target.value)}
                  placeholder="Например, 4500"
                  required
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-lp-text">Цена</div>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="Например, 3200"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-lp-text">Категория</div>
                <select
                  className={selectClassName}
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setSubcategoryId("");
                  }}
                  required
                >
                  <option value="">
                    {categoriesQuery.isLoading
                      ? "Загрузка..."
                      : "Выберите категорию"}
                  </option>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-lp-text">Подкатегория</div>
                <select
                  className={selectClassName}
                  value={subcategoryId}
                  onChange={(event) => setSubcategoryId(event.target.value)}
                  disabled={!categoryId}
                >
                  <option value="">
                    {categoryId
                      ? subcategoriesQuery.isLoading
                        ? "Загрузка..."
                        : "Не выбрана"
                      : "Сначала выберите категорию"}
                  </option>
                  {(subcategoriesQuery.data ?? []).map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-lp-text">Тип предложения</div>
              <select
                className={selectClassName}
                value={offerTypeId}
                onChange={(event) => setOfferTypeId(event.target.value)}
                required
              >
                <option value="">
                  {offerTypesQuery.isLoading
                    ? "Загрузка..."
                    : "Выберите тип"}
                </option>
                {(offerTypesQuery.data ?? []).map((offerType) => (
                  <option key={offerType.id} value={offerType.id}>
                    {offerType.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-lp-text">Ссылка на товар</div>
              <Input
                value={externalUrl}
                onChange={(event) => setExternalUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </div>

            {formError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError}
              </div>
            ) : null}

            {updateError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {updateError}
              </div>
            ) : null}

            {publishError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {publishError}
              </div>
            ) : null}

            {unpublishError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {unpublishError}
              </div>
            ) : null}

            {archiveError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {archiveError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>

              {canPublish ? (
                <Button
                  type="button"
                  onClick={() => publishMutation.mutate(product.id)}
                  disabled={publishMutation.isPending}
                >
                  {publishMutation.isPending ? "Отправка..." : "На модерацию"}
                </Button>
              ) : null}

              {canUnpublish ? (
                <Button
                  type="button"
                  onClick={() => unpublishMutation.mutate(product.id)}
                  disabled={unpublishMutation.isPending}
                >
                  {unpublishMutation.isPending ? "Снимаем..." : "Снять"}
                </Button>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                onClick={onArchive}
                disabled={archiveMutation.isPending}
              >
                {archiveMutation.isPending ? "Архивирование..." : "Архивировать"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/seller/products")}
              >
                Назад
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
