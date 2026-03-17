"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Input, SectionTitle } from "@ui/components";
import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import { isApiError } from "@/lib/api/apiError";
import type { SellerStatus } from "@/lib/api/sellers";
import { useCategories, useSubcategories } from "@/lib/queries/categories";
import { useMe } from "@/lib/queries/me";
import { useOfferTypes } from "@/lib/queries/offerTypes";
import { useMySeller } from "@/lib/queries/seller";
import { useCreateSellerProduct } from "@/src/lib/queries/sellerProducts";
import SellerImagesField from "@/src/components/seller/SellerImagesField";

const SELLER_STATUS_LABELS: Record<SellerStatus, string> = {
  pending: "На модерации",
  active: "Активен",
  rejected: "Отклонен",
  suspended: "Приостановлен",
};

const selectClassName =
  "w-full rounded-2xl border border-lp-border bg-white px-4 py-3 text-sm text-lp-text outline-none focus:ring-2 focus:ring-lp-primary focus:ring-offset-2";

const textareaClassName =
  "min-h-[120px] w-full rounded-2xl border border-lp-border bg-white px-4 py-3 text-sm text-lp-text outline-none focus:ring-2 focus:ring-lp-primary focus:ring-offset-2";

export default function SellerProductCreatePage() {
  const router = useRouter();
  const meQuery = useMe();
  const me = meQuery.data ?? null;
  const hasSellerRole =
    me?.roles?.some((role) => role === "seller" || role === "admin") ?? false;
  const sellerQuery = useMySeller(Boolean(me));
  const seller = sellerQuery.data ?? null;

  const createMutation = useCreateSellerProduct();
  const categoriesQuery = useCategories();
  const [categoryId, setCategoryId] = useState<string>("");
  const subcategoriesQuery = useSubcategories(categoryId || null);
  const offerTypesQuery = useOfferTypes();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [price, setPrice] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [offerTypeId, setOfferTypeId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const isActiveSeller = seller?.status === "active";

  const createError = useMemo(() => {
    if (!createMutation.error) return null;
    return isApiError(createMutation.error)
      ? `${createMutation.error.code}: ${createMutation.error.message}`
      : "Не удалось создать товар.";
  }, [createMutation.error]);

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
        hint="Авторизуйтесь, чтобы создать товар."
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const oldPriceValue = Number(oldPrice);
    const priceValue = Number(price);

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
      const res = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
        oldPrice: oldPriceValue,
        price: priceValue,
        mainCategoryId: categoryId,
        subcategoryId: subcategoryId || undefined,
        offerTypeId,
        externalUrl: externalUrl.trim() || undefined,
        status: "draft",
      });
      router.push(`/seller/products/${res.id}/edit`);
    } catch {
      // Ошибка отображается через createError
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Новый товар"
        hint="Заполните карточку товара и отправьте на модерацию."
      />

      <Card>
        <CardBody>
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
              disabled={createMutation.isPending}
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

            {createError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {createError}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Создание..." : "Создать"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/seller/products")}
              >
                Отмена
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
