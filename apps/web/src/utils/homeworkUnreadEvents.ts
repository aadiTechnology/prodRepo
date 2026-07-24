/** Cross-component refresh for Homework sidebar badge. */

export const HOMEWORK_UNREAD_CHANGED_EVENT = "homework-unread-changed";

export type HomeworkUnreadFilters = {
  classId?: string | number | null;
  divisionId?: string | number | null;
  subjectId?: string | number | null;
  academicYearId?: string | number | null;
  /** List status filter: Draft | Active (Published). Empty = all (draft + published for admin/teacher). */
  status?: string | null;
};

/**
 * Refresh sidebar Homework badge (not-read count).
 * - Omit `filters` to refetch with whatever filters are already sticky.
 * - Pass `{}` to clear list filters (e.g. leaving Homework list).
 * - Pass class/division/status to narrow the badge while list filters are active.
 * Status: Draft / Active / omit (both for admin/teacher).
 */
export function notifyHomeworkUnreadChanged(filters?: HomeworkUnreadFilters): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HOMEWORK_UNREAD_CHANGED_EVENT, {
      detail: filters,
    })
  );
}
