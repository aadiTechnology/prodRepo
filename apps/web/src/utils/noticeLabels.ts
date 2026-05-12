import type { NoticeAudienceType, NoticeStatus, NoticeType } from "../types/notice";

const AUDIENCE_LABELS: Record<NoticeAudienceType, string> = {
  ALL: "All",
  STUDENT: "Students",
  TEACHER: "Teachers",
  ADMIN: "Admin",
};

export function audienceTypeLabel(value: NoticeAudienceType): string {
  return AUDIENCE_LABELS[value] ?? value;
}

export function noticeTypeLabel(value: NoticeType): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function noticeStatusLabel(value: NoticeStatus): string {
  switch (value) {
    case "DRAFT":
      return "Draft";
    case "PUBLISHED":
      return "Published";
    case "UNPUBLISHED":
      return "Unpublished";
    case "EXPIRED":
      return "Expired";
    default:
      return value;
  }
}
