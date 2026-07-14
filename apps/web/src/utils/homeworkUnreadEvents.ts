/** Cross-component refresh for Homework sidebar unread badge. */

export const HOMEWORK_UNREAD_CHANGED_EVENT = "homework-unread-changed";

export type HomeworkUnreadFilters = {
  classId?: string | number | null;
  divisionId?: string | number | null;
  subjectId?: string | number | null;
  academicYearId?: string | number | null;
};

export function notifyHomeworkUnreadChanged(filters?: HomeworkUnreadFilters): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HOMEWORK_UNREAD_CHANGED_EVENT, {
      detail: filters ?? {},
    })
  );
}
