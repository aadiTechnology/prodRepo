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

  markModuleRead: async (
    module: NotificationModule
  ): Promise<{ message: string; module: NotificationModule; marked_count: number }> => {
    const res = await apiClient.post(`${BASE}/modules/${module}/mark-read`);
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
      general: true,
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
      general: true,
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

  /** Tenant admin: holiday/exam reminder + day schedule configuration. */
  getScheduleConfig: async (): Promise<NotificationScheduleConfig> => {
    const res = await apiClient.get<NotificationScheduleConfigApi>(`${BASE}/admin/schedule-config`);
    return mapScheduleConfig(res.data);
  },

  updateScheduleConfig: async (
    payload: Partial<NotificationScheduleConfig>
  ): Promise<NotificationScheduleConfig> => {
    const res = await apiClient.put<NotificationScheduleConfigApi>(
      `${BASE}/admin/schedule-config`,
      payload
    );
    return mapScheduleConfig(res.data);
  },

  /** Tenant admin: run scheduled holiday/exam processing now (idempotent). */
  processScheduled: async (): Promise<{
    tenantsProcessed: number;
    eventsProcessed: number;
    notificationsCreated: number;
    message: string;
  }> => {
    const res = await apiClient.post<{
      tenants_processed: number;
      events_processed: number;
      notifications_created: number;
      message: string;
    }>(`${BASE}/admin/process-scheduled`);
    const d = res.data;
    return {
      tenantsProcessed: Number(d?.tenants_processed ?? 0),
      eventsProcessed: Number(d?.events_processed ?? 0),
      notificationsCreated: Number(d?.notifications_created ?? 0),
      message: d?.message || "Scheduled notifications processed",
    };
  },
};

export type ScheduleModuleConfig = {
  reminder_enabled: boolean;
  reminder_days_before: number;
  day_enabled: boolean;
  push_enabled: boolean;
};

export type NotificationScheduleConfig = {
  holiday: ScheduleModuleConfig;
  exam: ScheduleModuleConfig;
};

type NotificationScheduleConfigApi = {
  holiday: ScheduleModuleConfig;
  exam: ScheduleModuleConfig;
};

function mapScheduleConfig(data: NotificationScheduleConfigApi): NotificationScheduleConfig {
  const mapModule = (m?: Partial<ScheduleModuleConfig> | null): ScheduleModuleConfig => ({
    reminder_enabled: m?.reminder_enabled !== false,
    reminder_days_before:
      typeof m?.reminder_days_before === "number" && m.reminder_days_before >= 0
        ? Math.min(30, Math.floor(m.reminder_days_before))
        : 1,
    day_enabled: m?.day_enabled !== false,
    push_enabled: m?.push_enabled !== false,
  });
  return {
    holiday: mapModule(data?.holiday),
    exam: mapModule(data?.exam),
  };
}

export default notificationService;
