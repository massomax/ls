"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Input } from "@ui/components";
import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import SellerProductCard from "@/src/components/seller/SellerProductCard";
import { isApiError } from "@/lib/api/apiError";
import { useMe } from "@/lib/queries/me";
import { useMySeller } from "@/lib/queries/seller";
import {
  useArchiveSellerProduct,
  usePublishSellerProduct,
  useSellerProductsList,
  useUnpublishSellerProduct,
  type SellerProductsListParams,
} from "@/src/lib/queries/sellerProducts";
import type { SellerProductsListStatus } from "@/src/lib/api/sellerProducts";
import type { SellerStatus } from "@/lib/api/sellers";

const SELLER_STATUS_LABELS: Record<SellerStatus, string> = {
  pending: "На модерации",
  active: "Активен",
  rejected: "Отклонен",
  suspended: "Приостановлен",
};

const FILTERS: Array<{ value: SellerProductsListStatus; label: string }> = [
  { value: "all", label: "Все" },
  { value: "draft", label: "Черновики" },
  { value: "active", label: "Активные" },
  { value: "archived", label: "Архив" },
];

export default function SellerProductsPage() {
  const router = useRouter();
  const meQuery = useMe();
  const me = meQuery.data ?? null;
  const hasSellerRole =
    me?.roles?.some((role) => role === "seller" || role === "admin") ?? false;
  const sellerQuery = useMySeller(Boolean(me));
  const seller = sellerQuery.data ?? null;
  const isActiveSeller = seller?.status === "active";

  const [status, setStatus] = useState<SellerProductsListStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const trimmed = search.trim();
    const handle = window.setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const listParams: SellerProductsListParams = useMemo(
    () => ({
      status,
      q: debouncedQuery || undefined,
      limit: 12,
      enabled: Boolean(me) && hasSellerRole && isActiveSeller,
    }),
    [debouncedQuery, hasSellerRole, isActiveSeller, me, status],
  );

  const listQuery = useSellerProductsList(listParams);
  const publishMutation = usePublishSellerProduct();
  const unpublishMutation = useUnpublishSellerProduct();
  const archiveMutation = useArchiveSellerProduct();
  const [archivingIds, setArchivingIds] = useState<Set<string>>(
    () => new Set(),
  );

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
        hint="Авторизуйтесь, чтобы открыть кабинет продавца."
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

  if (!seller || seller.status !== "active") {
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

  if (listQuery.isLoading) {
    return <PageStateSkeleton rows={6} />;
  }

  if (listQuery.isError) {
    return (
      <PageStateError
        title="Не удалось загрузить товары"
        message="Попробуйте повторить запрос."
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const items = (listQuery.data?.pages ?? []).flatMap((page) => page.items);
  const isArchiving = (id: string) => archivingIds.has(id);

  const onArchive = (id: string) => {
    if (!window.confirm("Архивировать товар? Он исчезнет из витрины.")) {
      return;
    }

    setArchivingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    archiveMutation.mutate(id, {
      onSettled: () => {
        setArchivingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <Chip
              key={filter.value}
              active={status === filter.value}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </Chip>
          ))}
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по товарам"
            className="md:w-72"
          />
          <Button onClick={() => router.push("/seller/products/new")}>
            Создать товар
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <PageStateEmpty
          title="Товаров пока нет"
          hint="Создайте первый товар и отправьте его на модерацию."
          actionText="Создать товар"
          onAction={() => router.push("/seller/products/new")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((product) => (
            <SellerProductCard
              key={product.id}
              product={product}
              onEdit={() => router.push(`/seller/products/${product.id}/edit`)}
              onView={() => router.push(`/seller/products/${product.id}`)}
              onPublish={() => publishMutation.mutate(product.id)}
              onUnpublish={() => unpublishMutation.mutate(product.id)}
              onArchive={() => onArchive(product.id)}
              isPublishing={publishMutation.isPending}
              isUnpublishing={unpublishMutation.isPending}
              isArchiving={isArchiving(product.id)}
            />
          ))}
        </div>
      )}

      {listQuery.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => listQuery.fetchNextPage()}
            disabled={listQuery.isFetchingNextPage}
          >
            {listQuery.isFetchingNextPage ? "Загрузка..." : "Показать еще"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
