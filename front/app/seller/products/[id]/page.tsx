"use client";

import { useParams, useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, SectionTitle } from "@ui/components";
import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import { isApiError } from "@/lib/api/apiError";
import type { SellerStatus } from "@/lib/api/sellers";
import { useMe } from "@/lib/queries/me";
import { useMySeller } from "@/lib/queries/seller";
import { useSellerProduct } from "@/src/lib/queries/sellerProducts";
import type { SellerProductStatus } from "@/src/lib/api/sellerProducts";

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

const rubFmt = new Intl.NumberFormat("ru-RU");

function rub(n: number) {
  return `${rubFmt.format(n)} ₽`;
}

export default function SellerProductViewPage() {
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
        hint="Авторизуйтесь, чтобы просматривать товар."
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

  const createdAt = new Date(product.createdAt);
  const createdLabel = Number.isNaN(createdAt.getTime())
    ? product.createdAt
    : createdAt.toLocaleDateString("ru-RU");
  const showEdit = product.status !== "archived";

  return (
    <div className="space-y-4">
      <SectionTitle title={product.title} hint={`Создан: ${createdLabel}`} />

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium text-lp-text">Статус:</div>
            <Badge className={PRODUCT_STATUS_CLASSES[product.status]}>
              {PRODUCT_STATUS_LABELS[product.status]}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-2xl font-bold text-lp-text">
              {rub(product.price)}
            </div>
            <div className="text-sm text-lp-muted line-through">
              {rub(product.oldPrice)}
            </div>
            <div className="rounded-full bg-lp-accent px-3 py-1 text-sm font-semibold text-lp-primary">
              −{product.discountPercent}%
            </div>
          </div>

          {product.description ? (
            <div className="text-sm text-lp-text">{product.description}</div>
          ) : (
            <div className="text-sm text-lp-muted">Описание отсутствует.</div>
          )}

          <div className="text-xs text-lp-muted">Создан: {createdLabel}</div>

          {product.moderationNote ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {product.moderationNote}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {showEdit ? (
              <Button
                variant="secondary"
                onClick={() => router.push(`/seller/products/${product.id}/edit`)}
              >
                Редактировать
              </Button>
            ) : null}

            <Button
              variant="ghost"
              onClick={() => router.push("/seller/products")}
            >
              Назад
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
