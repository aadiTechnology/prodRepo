/**
 * In-app notification state — loads from /api/notifications (tenant + user scoped).
 * Shared by header bell, notification list, and module settings.
 * Unread badge always uses GET /api/notifications/unread-count (server truth).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import notificationService from "../../api/services/notificationService";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_NOTIFICATION_SETTINGS } from "./notifications.mock";
import type {
  AppNotification,
  NotificationModule,
  NotificationModuleSettings,
} from "./notification.types";

export type NotificationContextValue = {
  notifications: AppNotification[];
  visibleNotifications: AppNotification[];
  settings: NotificationModuleSettings;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markModuleAsRead: (module: NotificationModule) => Promise<void>;
  setModuleEnabled: (module: NotificationModule, enabled: boolean) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationModuleSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.tenant_id) {
      setNotifications([]);
      setSettings(DEFAULT_NOTIFICATION_SETTINGS);
      setUnreadCount(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [listResult, settingsResult, count] = await Promise.all([
        notificationService.list({ page: 0, size: 100 }),
        notificationService.getSettings(),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(listResult.items);
      setSettings(settingsResult);
      setUnreadCount(Number(count) || 0);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to load notifications";
      setError(String(detail));
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.tenant_id, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Lightweight badge-only refresh (focus / tab visible). */
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user?.tenant_id) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(Number(count) || 0);
    } catch {
      // Keep last known badge; next full refresh() will reconcile.
    }
  }, [isAuthenticated, user?.tenant_id, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const onWindowFocus = () => {
      void refreshUnreadCount();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshUnreadCount();
      }
    };

    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated, refreshUnreadCount]);

  // Server already filters by module settings for list endpoints
  const visibleNotifications = notifications;

  const markAsRead = useCallback(
    async (id: string) => {
      let wasUnread = false;
      setNotifications((prev) => {
        wasUnread = prev.some((n) => n.id === id && !n.isRead);
        return prev.map((n) => (n.id === id && !n.isRead ? { ...n, isRead: true } : n));
      });
      if (wasUnread) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      try {
        await notificationService.markRead(id);
        // Reconcile badge with server after mark-read
        const count = await notificationService.getUnreadCount();
        setUnreadCount(Math.max(0, Number(count) || 0));
      } catch {
        // Restore list + server count on failure
        void refresh();
      }
    },
    [refresh]
  );

  const markModuleAsRead = useCallback(
    async (module: NotificationModule) => {
      try {
        const result = await notificationService.markModuleRead(module);
        if (result.marked_count <= 0) return;
        setNotifications((prev) =>
          prev.map((n) => (n.module === module ? { ...n, isRead: true } : n))
        );
        const count = await notificationService.getUnreadCount();
        setUnreadCount(Math.max(0, Number(count) || 0));
      } catch {
        void refresh();
      }
    },
    [refresh]
  );

  const setModuleEnabled = useCallback(
    async (module: NotificationModule, enabled: boolean) => {
      const previous = settings;
      const optimistic = { ...settings, [module]: enabled };
      setSettings(optimistic);
      try {
        const updated = await notificationService.updateSettings({ [module]: enabled });
        setSettings(updated);
        // Re-fetch list + server unread count so hidden modules drop / reappear
        const [listResult, count] = await Promise.all([
          notificationService.list({ page: 0, size: 100 }),
          notificationService.getUnreadCount(),
        ]);
        setNotifications(listResult.items);
        setUnreadCount(Number(count) || 0);
      } catch {
        setSettings(previous);
      }
    },
    [settings]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      visibleNotifications,
      settings,
      unreadCount,
      loading,
      error,
      refresh,
      markAsRead,
      markModuleAsRead,
      setModuleEnabled,
    }),
    [
      notifications,
      visibleNotifications,
      settings,
      unreadCount,
      loading,
      error,
      refresh,
      markAsRead,
      markModuleAsRead,
      setModuleEnabled,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
