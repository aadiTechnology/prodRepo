import { useCallback, useEffect, useState } from "react";
import { homeworkService } from "../api/services/homeworkService";
import { useAuth } from "../context/AuthContext";
import {
  HOMEWORK_UNREAD_CHANGED_EVENT,
  type HomeworkUnreadFilters,
} from "../utils/homeworkUnreadEvents";
import {
  HOMEWORK_STATUS_ACTIVE,
  HOMEWORK_STATUS_DRAFT,
  isDraftHomeworkStatus,
} from "../utils/homeworkStatus";

function toOptionalId(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Map list Status filter → unread-count status param. Empty = both (admin/teacher). */
function toUnreadStatus(status: string | null | undefined): "Draft" | "Active" | undefined {
  if (!status) return undefined;
  if (isDraftHomeworkStatus(status)) return HOMEWORK_STATUS_DRAFT;
  if (status === "Active" || status === "Published") return HOMEWORK_STATUS_ACTIVE;
  return undefined;
}

/**
 * Sidebar Homework badge = not-read count.
 * - No status filter → unread of draft + published (admin/teacher); published only (student/parent).
 * - Draft → unread drafts.
 * - Published → unread published.
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
      if (detail !== undefined) {
        setFilters(detail ?? {});
      }
      refresh();
    };

    window.addEventListener(HOMEWORK_UNREAD_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(HOMEWORK_UNREAD_CHANGED_EVENT, onChanged);
  }, [enabled, refresh]);

  useEffect(() => {
    setFilters({});
  }, [userId]);

  useEffect(() => {
    if (!enabled || userId == null) {
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
        status: toUnreadStatus(filters.status),
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
