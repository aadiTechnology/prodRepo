/** Cross-component refresh for Homework sidebar unread badge. */

export const HOMEWORK_UNREAD_CHANGED_EVENT = "homework-unread-changed";

export type HomeworkUnreadFilters = {
  classId?: string | number | null;
  divisionId?: string | number | null;
  subjectId?: string | number | null;
  academicYearId?: string | number | null;
  /** List status filter: Draft | Active (Published). Unread only applies to Active. */
  status?: string | null;
};

/**
 * Refresh sidebar unread badge.
 * - Omit `filters` to refetch with whatever filters are already sticky.
 * - Pass `{}` to clear list filters (e.g. leaving Homework list).
 * - Pass class/division/status to narrow the badge while list filters are active.
 */
export function notifyHomeworkUnreadChanged(filters?: HomeworkUnreadFilters): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HOMEWORK_UNREAD_CHANGED_EVENT, {
      detail: filters,
    })
  );
}
