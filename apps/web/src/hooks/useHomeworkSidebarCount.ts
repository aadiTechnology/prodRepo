import { useCallback, useEffect, useState } from "react";
import { homeworkService } from "../api/services/homeworkService";
import { useAuth } from "../context/AuthContext";
import { HOMEWORK_UNREAD_CHANGED_EVENT } from "../utils/homeworkUnreadEvents";

/**
 * Sidebar unread badge: role-scoped count for the current academic year.
 * Backend defaults year when omitted. Refetches on user login and unread events.
 */
export function useHomeworkSidebarCount(enabled: boolean): number {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [count, setCount] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener(HOMEWORK_UNREAD_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(HOMEWORK_UNREAD_CHANGED_EVENT, refresh);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || userId == null) {
      setCount(0);
      return;
    }

    let cancelled = false;

    homeworkService
      .getUnreadCount()
      .then((response) => {
        if (!cancelled) {
          setCount(response.count ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, refreshTick]);

  return count;
}
