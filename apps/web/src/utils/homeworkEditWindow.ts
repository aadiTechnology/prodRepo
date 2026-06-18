import type { HomeworkResponse } from "../api/services/homeworkService";
import { isDraftHomeworkStatus } from "./homeworkStatus";

/** Days after assigned date when edit/delete remain available (exclusive cutoff). */
export const HOMEWORK_EDIT_DELETE_WINDOW_DAYS = 7;

type HomeworkEditWindowInput = Pick<HomeworkResponse, "assigned_date" | "status">;

function parseIsoDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Draft homework stays editable. Active homework locks after one week from assigned date. */
export function isHomeworkEditDeleteAllowed(row: HomeworkEditWindowInput): boolean {
  if (isDraftHomeworkStatus(row.status)) return true;
  if (!row.assigned_date) return false;

  const assigned = parseIsoDateOnly(row.assigned_date);
  const cutoff = new Date(assigned);
  cutoff.setDate(cutoff.getDate() + HOMEWORK_EDIT_DELETE_WINDOW_DAYS);

  return startOfToday() < cutoff;
}

export function homeworkEditDeleteLockMessage(): string {
  return `Homework cannot be edited or deleted after ${HOMEWORK_EDIT_DELETE_WINDOW_DAYS} days from the assigned date.`;
}
