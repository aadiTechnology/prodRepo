import { useCallback, useEffect, useState } from "react";
import { homeworkService } from "../api/services/homeworkService";
import { useAuth } from "../context/AuthContext";
import {
  HOMEWORK_UNREAD_CHANGED_EVENT,
  type HomeworkUnreadFilters,
} from "../utils/homeworkUnreadEvents";
import { isDraftHomeworkStatus } from "../utils/homeworkStatus";

function toOptionalId(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Sidebar unread badge: role-scoped, optionally narrowed by HomeworkList filters
 * (class / division / status). Leaving the list clears sticky filters via notify({}).
 */
export function useHomeworkSidebarCount(enabled: boolean): number {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [count, setCount] = useState(0);
  const [filters, setFilters] = useState<HomeworkUnreadFilters>({});
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<HomeworkUnreadFilters | undefined>).detail;
      // Only replace sticky filters when caller passed a detail object.
      // notifyHomeworkUnreadChanged() with no args => refresh only.
      if (detail !== undefined) {
        setFilters(detail ?? {});
      }
      refresh();
    };

    window.addEventListener(HOMEWORK_UNREAD_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(HOMEWORK_UNREAD_CHANGED_EVENT, onChanged);
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

    // Unread badge only tracks published/active homework; Draft filter => 0.
    if (isDraftHomeworkStatus(filters.status ?? undefined)) {
      setCount(0);
      return;
    }

    let cancelled = false;
    homeworkService
      .getUnreadCount({
        class_id: toOptionalId(filters.classId),
        class_division_id: toOptionalId(filters.divisionId),
        subject_id: toOptionalId(filters.subjectId),
        academic_year_id: toOptionalId(filters.academicYearId),
      })
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
  }, [enabled, userId, filters, refreshTick]);

  return count;
}
