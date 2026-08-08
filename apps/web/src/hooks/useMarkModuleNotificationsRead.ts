import { useEffect } from "react";

import { useNotifications } from "../pages/notifications/NotificationContext";
import type { NotificationModule } from "../pages/notifications/notification.types";

/**
 * Marks all unread in-app notifications for a module when the destination screen mounts.
 * Used so opening Holiday (or similar) once clears the whole module badge batch.
 */
export function useMarkModuleNotificationsRead(module: NotificationModule) {
  const { markModuleAsRead } = useNotifications();

  useEffect(() => {
    void markModuleAsRead(module);
  }, [markModuleAsRead, module]);
}
