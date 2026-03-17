"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, SectionTitle } from "@ui/components";

import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";

import { isApiError } from "@/lib/api/apiError";
import { useSession } from "@/components/providers/session";
import RequireAuth from "@/components/auth/RequireAuth";
import {
  useDeleteNotification,
  useNotificationsList,
  useReadAllNotifications,
  useReadNotifications,
} from "@/lib/queries/notifications";

function NotificationsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { me } = useSession();
  const loginHref = useMemo(() => {
    const qs = sp.toString();
    const next = `${pathname}${qs ? `?${qs}` : ""}`;
    return `/login?next=${encodeURIComponent(next)}`;
  }, [pathname, sp]);

  const notifications = useNotificationsList({ enabled: Boolean(me), limit: 20 });
  const readAll = useReadAllNotifications();
  const readOne = useReadNotifications();
  const removeOne = useDeleteNotification();

  const items = useMemo(
    () => (notifications.data?.pages ?? []).flatMap((page) => page.items),
    [notifications.data?.pages],
  );

  return (
    <RequireAuth title="Уведомления" skeletonRows={4}>
      {notifications.isLoading ? (
        <PageStateSkeleton rows={6} />
      ) : notifications.isError ? (
        isApiError(notifications.error) && notifications.error.status === 401 ? (
          <PageStateEmpty
            title="Вы не вошли"
            hint="Авторизуйтесь, чтобы видеть уведомления."
            actionText="Войти"
            onAction={() => router.push(loginHref)}
          />
        ) : (
          <PageStateError
            message={`${notifications.error.code}: ${notifications.error.message}`}
            onRetry={() => notifications.refetch()}
          />
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionTitle
              title="Уведомления"
              hint="Все сообщения для вашего аккаунта."
            />
            <Button
              variant="secondary"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending || items.length === 0}
            >
              {readAll.isPending ? "Читаем…" : "Прочитать все"}
            </Button>
          </div>

          {items.length === 0 ? (
            <PageStateEmpty
              title="Пока нет уведомлений"
              hint="Возвращайтесь позже — новые сообщения появятся здесь."
            />
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const createdAt = new Date(item.createdAt).toLocaleString();
                return (
                  <Card key={item.id}>
                    <CardBody className="space-y-3">
                      <div className="space-y-1">
                        <div
                          className={
                            item.isRead
                              ? "text-sm font-semibold text-lp-muted"
                              : "text-sm font-semibold text-lp-text"
                          }
                        >
                          {item.title}
                        </div>
                        {item.message ? (
                          <div className="text-sm text-lp-text">
                            {item.message}
                          </div>
                        ) : null}
                        <div className="text-xs text-lp-muted">{createdAt}</div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => readOne.mutate([item.id])}
                          disabled={item.isRead || readOne.isPending}
                        >
                          {item.isRead ? "Прочитано" : "Прочитать"}
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => removeOne.mutate(item.id)}
                          disabled={removeOne.isPending}
                        >
                          Удалить
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex justify-center py-2">
            {notifications.hasNextPage ? (
              <Button
                variant="secondary"
                onClick={() => notifications.fetchNextPage()}
                disabled={notifications.isFetchingNextPage}
              >
                {notifications.isFetchingNextPage ? "Загрузка…" : "Показать ещё"}
              </Button>
            ) : items.length > 0 ? (
              <div className="text-sm text-lp-muted">Это все уведомления.</div>
            ) : null}
          </div>
        </div>
      )}
    </RequireAuth>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageStateSkeleton rows={4} />}>
      <NotificationsPageContent />
    </Suspense>
  );
}
