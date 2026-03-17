import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/apiError";
import {
  deleteNotification,
  listNotifications,
  readAllNotifications,
  readNotifications,
  type NotificationItem,
  type ReadNotificationsResponse,
} from "@/lib/api/notifications";
import type { CursorPage } from "@/lib/api/types";

type NotificationsListOptions = {
  enabled?: boolean;
  limit?: number;
};

const NOTIFICATIONS_KEY = ["notifications"] as const;

export function useNotificationsList(options: NotificationsListOptions = {}) {
  const { enabled = true, limit = 20 } = options;

  return useInfiniteQuery<
    CursorPage<NotificationItem>,
    ApiError,
    InfiniteData<CursorPage<NotificationItem>>,
    typeof NOTIFICATIONS_KEY,
    string | null
  >({
    queryKey: NOTIFICATIONS_KEY,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      listNotifications({ limit, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
  });
}

export function useReadAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation<ReadNotificationsResponse, ApiError>({
    mutationFn: readAllNotifications,
    onSuccess: () => {
      queryClient.setQueryData<
        InfiniteData<CursorPage<NotificationItem>>
      >(NOTIFICATIONS_KEY, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => ({
              ...item,
              isRead: true,
            })),
          })),
        };
      });
    },
  });
}

export function useReadNotifications() {
  const queryClient = useQueryClient();

  return useMutation<ReadNotificationsResponse, ApiError, string[]>({
    mutationFn: readNotifications,
    onSuccess: (_data, ids) => {
      const idSet = new Set(ids);
      queryClient.setQueryData<
        InfiniteData<CursorPage<NotificationItem>>
      >(NOTIFICATIONS_KEY, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              idSet.has(item.id)
                ? { ...item, isRead: true }
                : item,
            ),
          })),
        };
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: deleteNotification,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<
        InfiniteData<CursorPage<NotificationItem>>
      >(NOTIFICATIONS_KEY, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== id),
          })),
        };
      });
    },
  });
}
