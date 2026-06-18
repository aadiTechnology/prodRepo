export const HOMEWORK_STATUS_DRAFT = "Draft";
export const HOMEWORK_STATUS_ACTIVE = "Active";
export const LEGACY_PUBLISHED_STATUS = "Published";

export type HomeworkStatus = typeof HOMEWORK_STATUS_DRAFT | typeof HOMEWORK_STATUS_ACTIVE;

export function normalizeHomeworkStatus(status: string | null | undefined): string {
  const value = (status ?? "").trim();
  if (value === LEGACY_PUBLISHED_STATUS) return HOMEWORK_STATUS_ACTIVE;
  return value;
}

export function isActiveHomeworkStatus(status: string | null | undefined): boolean {
  return normalizeHomeworkStatus(status) === HOMEWORK_STATUS_ACTIVE;
}

export function isDraftHomeworkStatus(status: string | null | undefined): boolean {
  return normalizeHomeworkStatus(status) === HOMEWORK_STATUS_DRAFT;
}
