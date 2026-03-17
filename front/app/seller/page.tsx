"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@ui/components";
import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import SellerStatusBadge from "@/components/account/SellerStatusBadge";
import { isApiError } from "@/lib/api/apiError";
import { useMe } from "@/lib/queries/me";
import { useMySeller } from "@/lib/queries/seller";

export default function SellerPage() {
  const router = useRouter();
  const meQuery = useMe();
  const me = meQuery.data ?? null;
  const hasSellerRole =
    me?.roles?.some((role) => role === "seller" || role === "admin") ?? false;
  const sellerQuery = useMySeller(Boolean(me));
  const seller = sellerQuery.data ?? null;
  const shouldRedirect =
    hasSellerRole && seller?.status === "active";

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/seller/products");
    }
  }, [router, shouldRedirect]);

  if (meQuery.isLoading) {
    return <PageStateSkeleton rows={4} />;
  }

  const authError = meQuery.error;
  const isAnon =
    isApiError(authError) && authError.status === 401;

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

  if (!seller) {
    return (
      <PageStateEmpty
        title="Профиль продавца не найден"
        hint="Оставьте заявку в личном кабинете, чтобы получить доступ."
        actionText="В аккаунт"
        onAction={() => router.push("/account")}
      />
    );
  }

  if (seller.status !== "active") {
    return (
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold text-lp-text">
              Статус продавца
            </div>
            <SellerStatusBadge status={seller.status} />
          </div>
          <div className="text-sm text-lp-muted">
            Доступ к кабинету появится после активации профиля.
          </div>
          <div className="pt-1">
            <Button onClick={() => router.push("/account")}>
              В аккаунт
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return <PageStateSkeleton rows={4} />;
}
