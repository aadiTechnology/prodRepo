import type { HomeworkResponse } from "../api/services/homeworkService";

type HomeworkEditWindowInput = Pick<HomeworkResponse, "assigned_date" | "status">;

/**
 * Edit/delete are always allowed for users with HOMEWORK_MGMT edit/delete permission.
 * (Previously locked Active homework 7 days after assigned_date — removed.)
 */
export function isHomeworkEditDeleteAllowed(_row: HomeworkEditWindowInput): boolean {
  return true;
}

export function homeworkEditDeleteLockMessage(): string {
  return "Homework cannot be edited or deleted.";
}
