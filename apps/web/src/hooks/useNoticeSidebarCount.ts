import { useCallback, useEffect, useState } from "react";
import noticeService from "../api/services/noticeService";
import { useAuth } from "../context/AuthContext";
import {
  NOTICE_COUNT_CHANGED_EVENT,
  type NoticeUnreadFilters,
} from "../utils/noticeCountEvents";

function toOptionalFilter(value: string | null | undefined): string | undefined {
  if (value == null || value === "") return undefined;
  return String(value).toUpperCase();
}

/**
 * Sidebar unread notice badge: role-scoped, optionally narrowed by NoticeList filters.
 * Refetches on user switch and notice-count-changed (with filter detail).
 */
export function useNoticeSidebarCount(enabled: boolean): number {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [count, setCount] = useState(0);
  const [filters, setFilters] = useState<NoticeUnreadFilters>({});
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<NoticeUnreadFilters>).detail;
      if (detail && typeof detail === "object") {
        setFilters(detail);
      }
      refresh();
    };

    window.addEventListener(NOTICE_COUNT_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NOTICE_COUNT_CHANGED_EVENT, onChanged);
  }, [enabled, refresh]);

  // Reset sticky list filters when user switches.
  useEffect(() => {
    setFilters({});
  }, [userId]);

  useEffect(() => {
    if (!enabled || userId == null) {
      setCount(0);
      return;
    }

    const status = toOptionalFilter(filters.status);
    // Unread badge only tracks published notices; other status filters => 0.
    if (status && status !== "PUBLISHED") {
      setCount(0);
      return;
    }

    let cancelled = false;
    noticeService
      .getUnreadCount({
        audience_type: toOptionalFilter(filters.audienceType),
        notice_type: toOptionalFilter(filters.noticeType),
      })
      .then((response) => {
        if (!cancelled) setCount(response.count ?? 0);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, filters, refreshTick]);

  return count;
}
