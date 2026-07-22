export const HOMEWORK_STATUS_DRAFT = "Draft";
export const HOMEWORK_STATUS_ACTIVE = "Active";
export const LEGACY_PUBLISHED_STATUS = "Published";

export type HomeworkStatus = typeof HOMEWORK_STATUS_DRAFT | typeof HOMEWORK_STATUS_ACTIVE;

export function normalizeHomeworkStatus(status: string | null | undefined): string {
  const value = (status ?? "").trim();
  if (value.toLowerCase() === "published") return HOMEWORK_STATUS_ACTIVE;
  if (value.toLowerCase() === "draft") return HOMEWORK_STATUS_DRAFT;
  if (value === LEGACY_PUBLISHED_STATUS) return HOMEWORK_STATUS_ACTIVE;
  return value;
}

export function isActiveHomeworkStatus(status: string | null | undefined): boolean {
  return normalizeHomeworkStatus(status) === HOMEWORK_STATUS_ACTIVE;
}

export function isDraftHomeworkStatus(status: string | null | undefined): boolean {
  return normalizeHomeworkStatus(status) === HOMEWORK_STATUS_DRAFT;
}

/** UI label for homework list / chips (Published, not Active). */
export function getHomeworkStatusDisplayLabel(status: string | null | undefined): string {
  if (isDraftHomeworkStatus(status)) return HOMEWORK_STATUS_DRAFT;
  if (isActiveHomeworkStatus(status)) return LEGACY_PUBLISHED_STATUS;
  return normalizeHomeworkStatus(status);
}

/** Chip styling aligned with Notice list & Activity Gallery (Draft/Published). */
export function getHomeworkStatusChipProps(status: string | null | undefined): {
  label: string;
  color: "default" | "success";
  variant: "filled" | "outlined";
} {
  const draft = isDraftHomeworkStatus(status);
  return {
    label: getHomeworkStatusDisplayLabel(status),
    color: draft ? "default" : "success",
    variant: draft ? "outlined" : "filled",
  };
}
