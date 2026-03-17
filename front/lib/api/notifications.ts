import { apiDelete, apiGet, apiPost } from "./http";
import type { CursorPage } from "./types";

export type NotificationItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  message?: string | null;
  data?: unknown;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListNotificationsQuery = {
  unread?: boolean;
  limit?: number;
  cursor?: string | null;
};

export async function listNotifications(
  q: ListNotificationsQuery,
): Promise<CursorPage<NotificationItem>> {
  return apiGet<CursorPage<NotificationItem>>("/notifications", {
    unread: q.unread ? 1 : undefined,
    limit: q.limit,
    cursor: q.cursor ?? undefined,
  });
}

export type ReadNotificationsResponse = {
  updated: number;
};

export async function readNotifications(
  ids: string[],
): Promise<ReadNotificationsResponse> {
  return apiPost<ReadNotificationsResponse>("/notifications/read", { ids });
}

export async function readAllNotifications(): Promise<ReadNotificationsResponse> {
  return apiPost<ReadNotificationsResponse>("/notifications/read-all");
}

export async function deleteNotification(id: string): Promise<void> {
  return apiDelete<void>(`/notifications/${encodeURIComponent(id)}`);
}
