import { useCallback, useEffect, useState } from "react";
import { homeworkService } from "../api/services/homeworkService";
import {
  HOMEWORK_UNREAD_CHANGED_EVENT,
  type HomeworkUnreadFilters,
} from "../utils/homeworkUnreadEvents";

function toOptionalNumber(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function useHomeworkSidebarCount(enabled: boolean): number {
  const [count, setCount] = useState(0);
  const [filters, setFilters] = useState<HomeworkUnreadFilters>({});
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<HomeworkUnreadFilters>).detail;
      if (detail && typeof detail === "object") {
        setFilters(detail);
      }
      refresh();
    };

    window.addEventListener(HOMEWORK_UNREAD_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(HOMEWORK_UNREAD_CHANGED_EVENT, onChanged);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    let cancelled = false;

    homeworkService
      .getUnreadCount({
        class_id: toOptionalNumber(filters.classId),
        class_division_id: toOptionalNumber(filters.divisionId),
        subject_id: toOptionalNumber(filters.subjectId),
        academic_year_id: toOptionalNumber(filters.academicYearId),
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
  }, [enabled, filters, refreshTick]);

  return count;
}
