import { alarmAxios } from "./alarmAxiosInstance";

export type NotificationType =
  | "COMMENT"
  | "REPLY"
  | "POST_LIKE"
  | "NEW_POST"
  | "ANNOUNCEMENT"
  | "FRAME_ACQUIRED";

export interface NotificationItem {
  id: number;
  receiverId: number;
  type: NotificationType;
  title: string;
  content: string;
  relatedId: number;
  isRead: boolean;
  createdAt: string;
}

export const fetchNotifications = (page = 0, size = 20) =>
  alarmAxios<{ content: NotificationItem[]; totalElements: number }>({
    url: "/notifications",
    method: "GET",
    params: { page, size },
  });

export const fetchUnreadCount = () =>
  alarmAxios<{ count: number }>({
    url: "/notifications/unread-count",
    method: "GET",
  });

export const markAsRead = (id: number) =>
  alarmAxios({
    url: `/notifications/${id}/read`,
    method: "PATCH",
  });

export const markAllAsRead = () =>
  alarmAxios({
    url: "/notifications/read-all",
    method: "PATCH",
  });

export const deleteNotification = (id: number) =>
  alarmAxios({
    url: `/notifications/${id}`,
    method: "DELETE",
  });

export const deleteAllNotifications = () =>
  alarmAxios({
    url: "/notifications",
    method: "DELETE",
  });

export const fetchSettings = () =>
  alarmAxios<Record<NotificationType, boolean>>({
    url: "/settings",
    method: "GET",
  });

export const updateSetting = (type: NotificationType, enabled: boolean) =>
  alarmAxios({
    url: `/settings/${type}`,
    method: "PATCH",
    params: { enabled },
  });

export interface BoardMenu {
  menuId: number;
  name: string;
}

export const fetchAvailableBoards = () =>
  alarmAxios<BoardMenu[]>({ url: "/settings/boards/available", method: "GET" });

export const fetchSubscribedBoards = () =>
  alarmAxios<number[]>({ url: "/settings/boards", method: "GET" });

export const subscribeBoard = (menuId: number) =>
  alarmAxios({ url: `/settings/boards/${menuId}`, method: "POST" });

export const unsubscribeBoard = (menuId: number) =>
  alarmAxios({ url: `/settings/boards/${menuId}`, method: "DELETE" });
