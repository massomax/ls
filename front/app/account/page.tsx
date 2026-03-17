"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  SectionTitle,
} from "@ui/components";
import RequireAuth from "@/components/auth/RequireAuth";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";
import SellerApplyForm from "@/components/account/SellerApplyForm";
import SellerStatusBadge from "@/components/account/SellerStatusBadge";
import { clearAccessToken } from "@/lib/api/tokenStore";
import { isApiError } from "@/lib/api/apiError";
import { useLogout } from "@/lib/queries/auth";
import { usePatchMe } from "@/lib/queries/me";
import {
  useApplySeller,
  useMySeller,
  useMySellerStats,
} from "@/lib/queries/seller";
import { useSession } from "@/components/providers/session";
import type { SellerApplyInput, SellerStatsPeriod } from "@/lib/api/sellers";

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const { me } = useSession();
  const patchMe = usePatchMe();
  const logout = useLogout();
  const sellerQuery = useMySeller();
  const applySeller = useApplySeller();

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<SellerStatsPeriod>("7d");

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setGender(me.gender ?? "");
    setBirthDate(toDateInput(me.birthDate));
  }, [me]);

  const saveError = useMemo(() => {
    if (!patchMe.error) return null;
    return isApiError(patchMe.error)
      ? `${patchMe.error.code}: ${patchMe.error.message}`
      : "Не удалось сохранить профиль.";
  }, [patchMe.error]);

  const applyError = useMemo(() => {
    if (!applySeller.error) return null;
    if (isApiError(applySeller.error)) {
      if (applySeller.error.code === "AlreadyAppliedOrActive") {
        return "Заявка уже отправлена. Мы покажем статус, как только сервер ответит.";
      }
      return `${applySeller.error.code}: ${applySeller.error.message}`;
    }
    return "Не удалось отправить заявку.";
  }, [applySeller.error]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await patchMe.mutateAsync({
        name: name.trim() || undefined,
        gender: gender.trim() || undefined,
        birthDate: birthDate.trim() || undefined,
      });
    } catch {
      // Ошибка отображается через saveError
    }
  };

  const onLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // Даже если logout упадет, очищаем локальный токен
    } finally {
      clearAccessToken({ persist: true });
      router.replace("/login");
    }
  };

  const handleApply = async (input: SellerApplyInput) => {
    try {
      await applySeller.mutateAsync(input);
      setShowApplyForm(false);
    } catch {
      // Ошибка отображается через applyError
    }
  };

  const seller = sellerQuery.data ?? null;
  const sellerStatus = seller?.status;
  const canShowStats =
    sellerStatus === "active" &&
    Boolean(me?.roles?.some((role) => role === "seller" || role === "admin"));

  const sellerStats = useMySellerStats(statsPeriod, canShowStats);

  return (
    <Suspense fallback={<PageStateSkeleton rows={6} />}>
      <RequireAuth title="Аккаунт" hint="Войдите, чтобы увидеть данные.">
        <div className="space-y-4">
          <SectionTitle title="Аккаунт" hint="Профиль, роли и статус продавца." />

        <Card>
          <CardBody className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-sm text-lp-muted">Телефон</div>
                <div className="text-base font-semibold text-lp-text">
                  {me?.phone ?? "—"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-lp-muted">Роли</div>
                <div className="text-sm text-lp-text">
                  {me?.roles?.length ? me.roles.join(", ") : "Нет ролей"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-lp-muted">Создан</div>
                <div className="text-sm font-semibold text-lp-text">
                  {formatDateTime(me?.createdAt)}
                </div>
              </div>
            </div>

            <div className="border-t border-lp-border pt-4">
              <div className="text-sm font-semibold text-lp-text">Профиль</div>
              <div className="text-xs text-lp-muted">
                Обновите персональные данные.
              </div>
            </div>

            <form className="space-y-3" onSubmit={onSave}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-lp-text">Имя</label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ваше имя"
                  autoComplete="name"
                  disabled={patchMe.isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-lp-text">Пол</label>
                <Input
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  placeholder="Например: женский"
                  autoComplete="sex"
                  disabled={patchMe.isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-lp-text">
                  Дата рождения
                </label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  disabled={patchMe.isPending}
                />
              </div>

              {saveError ? (
                <div className="text-sm text-lp-danger">{saveError}</div>
              ) : null}

              {patchMe.isSuccess && !saveError ? (
                <div className="text-sm text-lp-success">Сохранено.</div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={patchMe.isPending}>
                  {patchMe.isPending ? "Сохраняем…" : "Сохранить"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onLogout}
                  disabled={logout.isPending}
                >
                  {logout.isPending ? "Выходим…" : "Выйти"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <SectionTitle title="Быстрые действия" hint="Переходы и сессия." />

        <Card>
          <CardBody className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push("/favorites")}
            >
              Избранное
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/notifications")}
            >
              Уведомления
            </Button>
            <Button variant="secondary" onClick={() => router.push("/search")}>
              Поиск
            </Button>
          </CardBody>
        </Card>

        <SectionTitle title="Seller" hint="Заявка и доступ к кабинету." />

        <Card>
          <CardBody className="space-y-4">
            {sellerQuery.isLoading ? (
              <div className="text-sm text-lp-muted">
                Загружаем статус продавца…
              </div>
            ) : null}

            {sellerQuery.isError ? (
              <div className="space-y-3">
                <div className="text-sm text-lp-danger">
                  {sellerQuery.error.code}: {sellerQuery.error.message}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => sellerQuery.refetch()}
                >
                  Повторить
                </Button>
              </div>
            ) : null}

            {!seller && !sellerQuery.isLoading && !sellerQuery.isError ? (
              <div className="space-y-3">
                <div className="text-sm text-lp-muted">
                  Вы можете стать продавцом и публиковать товары.
                </div>
                <Button onClick={() => setShowApplyForm((prev) => !prev)}>
                  Стать продавцом
                </Button>
              </div>
            ) : null}

            {seller ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-lp-muted">Статус</div>
                    <SellerStatusBadge status={seller.status} />
                  </div>
                  {seller.status === "active" ? (
                    <Button onClick={() => router.push("/seller")}>
                      Кабинет продавца
                    </Button>
                  ) : null}
                  {seller.status === "rejected" ? (
                    <Button onClick={() => setShowApplyForm(true)}>
                      Отправить заново
                    </Button>
                  ) : null}
                </div>

                {seller.status === "pending" ? (
                  <div className="text-sm text-lp-muted">
                    Заявка отправлена и ожидает модерации.
                  </div>
                ) : null}

                {seller.status === "suspended" ? (
                  <div className="text-sm text-lp-muted">
                    Доступ к кабинету приостановлен. Свяжитесь с поддержкой.
                  </div>
                ) : null}

                {seller.status === "rejected" && seller.moderationNote ? (
                  <div className="rounded-xl border border-lp-border bg-slate-50 p-3 text-sm text-lp-text">
                    Комментарий модерации: {seller.moderationNote}
                  </div>
                ) : null}
              </div>
            ) : null}

            {showApplyForm ? (
              <SellerApplyForm
                key={seller?.id ?? "new"}
                initial={
                  seller
                    ? {
                        companyName: seller.companyName,
                        inn: seller.inn,
                        contactEmail: seller.contactEmail ?? undefined,
                        contactName: seller.contactName ?? undefined,
                        website: seller.website ?? undefined,
                        legalAddress: seller.legalAddress ?? undefined,
                        ogrn: seller.ogrn ?? undefined,
                      }
                    : undefined
                }
                onSubmit={handleApply}
                isSubmitting={applySeller.isPending}
                errorText={applyError}
                onCancel={() => setShowApplyForm(false)}
              />
            ) : null}
          </CardBody>
        </Card>

        {canShowStats ? (
          <>
            <SectionTitle title="Статистика" hint="По товарам продавца." />
            <Card>
              <CardBody className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(["7d", "30d"] as const).map((period) => (
                    <Chip
                      key={period}
                      active={statsPeriod === period}
                      onClick={() => setStatsPeriod(period)}
                    >
                      {period}
                    </Chip>
                  ))}
                </div>

                {sellerStats.isLoading ? (
                  <div className="text-sm text-lp-muted">
                    Загружаем статистику…
                  </div>
                ) : null}
                {sellerStats.isError ? (
                  <div className="text-sm text-lp-danger">
                    {sellerStats.error.code}: {sellerStats.error.message}
                  </div>
                ) : null}
                {sellerStats.data ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-lp-border bg-white p-3">
                      <div className="text-xs text-lp-muted">Товаров всего</div>
                      <div className="text-base font-semibold text-lp-text">
                        {sellerStats.data.products.total}
                      </div>
                    </div>
                    <div className="rounded-xl border border-lp-border bg-white p-3">
                      <div className="text-xs text-lp-muted">
                        Активные товары
                      </div>
                      <div className="text-base font-semibold text-lp-text">
                        {sellerStats.data.products.active}
                      </div>
                    </div>
                    <div className="rounded-xl border border-lp-border bg-white p-3">
                      <div className="text-xs text-lp-muted">
                        Архивные товары
                      </div>
                      <div className="text-base font-semibold text-lp-text">
                        {sellerStats.data.products.archived}
                      </div>
                    </div>
                    <div className="rounded-xl border border-lp-border bg-white p-3">
                      <div className="text-xs text-lp-muted">
                        {statsPeriod === "7d" ? "Просмотры 7d" : "Просмотры 30d"}
                      </div>
                      <div className="text-base font-semibold text-lp-text">
                        {statsPeriod === "7d"
                          ? sellerStats.data.views7d
                          : sellerStats.data.views30d}
                      </div>
                    </div>
                    <div className="rounded-xl border border-lp-border bg-white p-3">
                      <div className="text-xs text-lp-muted">Избранное</div>
                      <div className="text-base font-semibold text-lp-text">
                        {sellerStats.data.favorites}
                      </div>
                    </div>
                    <div className="rounded-xl border border-lp-border bg-white p-3">
                      <div className="text-xs text-lp-muted">
                        Клики 7d
                      </div>
                      <div className="text-base font-semibold text-lp-text">
                        {sellerStats.data.clicks7d}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </>
        ) : null}
        </div>
      </RequireAuth>
    </Suspense>
  );
}
