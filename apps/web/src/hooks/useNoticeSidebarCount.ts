import { useCallback, useEffect, useState } from "react";
import noticeService from "../api/services/noticeService";
import { NOTICE_COUNT_CHANGED_EVENT } from "../utils/noticeCountEvents";

export function useNoticeSidebarCount(enabled: boolean): number {
  const [count, setCount] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener(NOTICE_COUNT_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(NOTICE_COUNT_CHANGED_EVENT, refresh);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    let cancelled = false;
    noticeService
      .getUnreadCount()
      .then((response) => {
        if (!cancelled) setCount(response.count ?? 0);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshTick]);

  return count;
}
