/**
 * In-app notifications API (inbox + module settings).
 */

import { apiClient } from "../client";
import type {
  AppNotification,
  NotificationModule,
  NotificationModuleSettings,
} from "../../pages/notifications/notification.types";

const BASE = "/api/notifications";

export type NotificationApiItem = {
  id: string;
  module: NotificationModule;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  kind: "reminder" | "day" | "general";
  entity_id?: number | null;
};

export type NotificationListApiResponse = {
  items: NotificationApiItem[];
  total: number;
  page: number;
  size: number;
};

export type NotificationSettingsApiResponse = {
  syllabus: boolean;
  holiday: boolean;
  notice: boolean;
  exam: boolean;
};

function mapNotification(item: NotificationApiItem): AppNotification {
  return {
    id: String(item.id),
    module: item.module,
    title: item.title,
    message: item.message,
    createdAt:
      typeof item.created_at === "string"
        ? item.created_at
        : new Date(item.created_at as unknown as string).toISOString(),
    isRead: Boolean(item.is_read),
    kind: item.kind || "general",
  };
}

const notificationService = {
  list: async (params?: {
    page?: number;
    size?: number;
  }): Promise<{ items: AppNotification[]; total: number; page: number; size: number }> => {
    const res = await apiClient.get<NotificationListApiResponse>(BASE, { params });
    const data = res.data;
    return {
      items: (data.items || []).map(mapNotification),
      total: data.total ?? 0,
      page: data.page ?? 0,
      size: data.size ?? 50,
    };
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get<{ count: number }>(`${BASE}/unread-count`);
    return Number(res.data?.count ?? 0);
  },

  markRead: async (
    id: string
  ): Promise<{ message: string; notification_id: string; already_read: boolean }> => {
    const res = await apiClient.post(`${BASE}/${id}/mark-read`);
    return res.data;
  },

  getSettings: async (): Promise<NotificationModuleSettings> => {
    const res = await apiClient.get<NotificationSettingsApiResponse>(`${BASE}/settings`);
    const d = res.data;
    return {
      syllabus: d.syllabus !== false,
      holiday: d.holiday !== false,
      notice: d.notice !== false,
      exam: d.exam !== false,
    };
  },

  updateSettings: async (
    partial: Partial<NotificationModuleSettings>
  ): Promise<NotificationModuleSettings> => {
    const res = await apiClient.put<NotificationSettingsApiResponse>(`${BASE}/settings`, partial);
    const d = res.data;
    return {
      syllabus: d.syllabus !== false,
      holiday: d.holiday !== false,
      notice: d.notice !== false,
      exam: d.exam !== false,
    };
  },

  /**
   * Register or refresh the current user's FCM device token (native apps).
   * Idempotent on the backend when the same fcm_token is posted again.
   */
  registerDevice: async (payload: {
    fcm_token: string;
    platform: "android" | "ios" | "web";
  }): Promise<{
    id: number;
    fcm_token: string;
    platform: string;
    is_active: boolean;
    message: string;
  }> => {
    const res = await apiClient.post(`${BASE}/devices`, payload);
    return res.data;
  },
};

export default notificationService;
