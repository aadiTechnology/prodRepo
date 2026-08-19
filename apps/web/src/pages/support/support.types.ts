import { apiBaseUrl } from "../../config";
import type { HTMLAttributes } from "react";

export type SupportStatus = "Not Started" | "In Progress" | "Done" | "TBD";

/** @deprecated Use SupportStatus — kept for FAQ module compatibility */
export type FaqStatus = SupportStatus;

export type FaqLanguage = "English" | "Marathi" | "Hindi";

export type FaqAttachment = {
  id: string;
  name: string;
  type: "pdf" | "image";
  url: string;
};

export type FaqCategoryNode = {
  id: string;
  label: string;
  children?: FaqCategoryNode[];
};

export type FaqItem = {
  id: string;
  srNo: number;
  title: string;
  question: string;
  answer: string;
  module: string;
  categoryId: string;
  categoryPath: string;
  status: SupportStatus;
  owner: string;
  tenantId: number;
  tenantName: string;
  language: FaqLanguage;
  attachments: FaqAttachment[];
  createdAt: string;
  lastModifiedAt: string;
  createdBy: string;
  modifiedBy: string;
};

export type FaqFormData = {
  title: string;
  question: string;
  answer: string;
  module: string;
  categoryId: string;
  status: SupportStatus;
  owner: string;
  tenantName: string;
  language: FaqLanguage;
  attachmentName: string;
};

export type ReleaseNoteFileType = "pdf" | "doc" | "docx";

export type ReleaseNoteShowTo = {
  admin: boolean;
  teacher: boolean;
  student: boolean;
};

export type ProductUpdateItem = {
  id: string;
  title: string;
  version: string;
  releaseDate: string;
  description: string;
  status: SupportStatus;
  attachmentName: string;
  attachmentType: ReleaseNoteFileType;
  attachmentUrl: string;
  createdBy: string;
  modifiedBy: string;
  modifiedDate: string;
  showTo: ReleaseNoteShowTo;
};

export type ProductUpdateFormData = {
  version: string;
  releaseDate: string;
  description: string;
  attachmentName: string;
  showTo: ReleaseNoteShowTo;
};

export const EMPTY_RELEASE_NOTE_SHOW_TO: ReleaseNoteShowTo = {
  admin: false,
  teacher: false,
  student: false,
};

export const SUPPORT_QUERY_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
] as const;

export const SUPPORT_QUERY_INVALID_FILE_MESSAGE =
  "Please upload a valid file. Allowed file types: PDF, DOC, DOCX, JPG, JPEG, PNG.";

export type SupportQueryAttachmentKind = "image" | "pdf" | "document" | "unknown";

export function isSupportQueryAttachmentAllowed(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORT_QUERY_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function getSupportQueryAttachmentKind(fileName: string): SupportQueryAttachmentKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) {
    return "image";
  }
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "document";
  return "unknown";
}

/** Resolve API, Azure SAS, static-mount, or blob URLs for support query attachments. */
export function resolveSupportQueryAttachmentUrl(raw?: string | null): string | undefined {
  if (!raw || raw === "#") return undefined;
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const staticRoot = apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");

  if (raw.startsWith("support-query-attachments/")) {
    return `${staticRoot}/${raw}`;
  }
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (path.startsWith("/support-query-attachments/")) {
    return `${staticRoot}${path}`;
  }
  return `${apiBaseUrl}${path}`;
}

export function openSupportQueryAttachment(
  fileName: string,
  rawUrl?: string | null,
  onPreviewImage?: (url: string, fileName: string) => void
): void {
  const url = resolveSupportQueryAttachmentUrl(rawUrl);
  if (!url) return;

  const kind = getSupportQueryAttachmentKind(fileName);
  if (kind === "image") {
    onPreviewImage?.(url, fileName);
    return;
  }
  if (kind === "pdf") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  if (kind === "document") {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export type HelpVideoItem = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
};

export type HelpDocumentItem = {
  id: string;
  title: string;
  type: "pdf" | "guide";
};

/** M1 Support Query prototype */
export type SupportQueryStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export type SupportQueryActorRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "TEACHER"
  | "STUDENT";

/** Whether the current actor role may view a release note per its Show To configuration. */
export function canViewReleaseNoteForRole(
  note: ProductUpdateItem,
  actorRole: SupportQueryActorRole | null,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!actorRole) return false;
  switch (actorRole) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return note.showTo.admin;
    case "TEACHER":
      return note.showTo.teacher;
    case "STUDENT":
      return note.showTo.student;
    default:
      return false;
  }
}

export type SupportQueryMessage = {
  id: string;
  author: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

export type SupportQueryItem = {
  id: string;
  category: string;
  subject: string;
  description: string;
  attachmentName?: string;
  attachmentUrl?: string;
  createdBy: string;
  createdByRole: SupportQueryActorRole;
  createdAt: string;
  status: SupportQueryStatus;
  messages: SupportQueryMessage[];
  /** When Admin forwards a Student query for Super Admin assistance */
  forwardedToSuperAdmin?: boolean;
  forwardedBy?: string;
  forwardedAt?: string;
  /** False when query has unread activity for the current user (new query, reply, status change). */
  isViewed?: boolean;
};

export type SupportQueryFormData = {
  category: string;
  subject: string;
  description: string;
  attachmentName: string;
};

export const SUPPORT_QUERY_STATUSES: SupportQueryStatus[] = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
];

export type SupportCategoryStatus = "Active" | "Inactive";

export type SupportCategory = {
  id: string;
  name: string;
  status: SupportCategoryStatus;
};

export const SUPPORT_CATEGORIES_STORAGE_KEY = "support-configured-categories";

export const DEFAULT_SUPPORT_CATEGORY_NAMES = [
  "Technical Issue",
  "Attendance",
  "Student",
  "Teacher",
  "Fees & Payment",
  "Academic",
  "Homework & Assignment",
  "Communication & Notification",
  "Account & Access",
  "General Query",
] as const;

export function normalizeSupportCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function createDefaultSupportCategories(): SupportCategory[] {
  return DEFAULT_SUPPORT_CATEGORY_NAMES.map((name, index) => ({
    id: `CAT-${String(index + 1).padStart(3, "0")}`,
    name,
    status: "Active" as const,
  }));
}

export function loadSupportCategoriesFromStorage(): SupportCategory[] {
  if (typeof window === "undefined") return createDefaultSupportCategories();
  try {
    const raw = window.localStorage.getItem(SUPPORT_CATEGORIES_STORAGE_KEY);
    if (!raw) return createDefaultSupportCategories();
    const parsed = JSON.parse(raw) as SupportCategory[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return createDefaultSupportCategories();
    }
    return parsed.map((item) => ({
      id: String(item.id),
      name: normalizeSupportCategoryName(String(item.name)),
      status: item.status === "Inactive" ? "Inactive" : "Active",
    }));
  } catch {
    return createDefaultSupportCategories();
  }
}

export function saveSupportCategoriesToStorage(categories: SupportCategory[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUPPORT_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
}

export function nextSupportCategoryId(categories: SupportCategory[]): string {
  const max = categories.reduce((acc, item) => {
    const match = /^CAT-(\d+)$/.exec(item.id);
    if (!match) return acc;
    return Math.max(acc, Number(match[1]));
  }, 0);
  return `CAT-${String(max + 1).padStart(3, "0")}`;
}

/** @deprecated Use configured categories from FaqDataContext instead. */
export const SUPPORT_QUERY_CATEGORIES = DEFAULT_SUPPORT_CATEGORY_NAMES;

/** School-level requesters whose queries are handled by Admin */
const ADMIN_INBOX_ROLES: SupportQueryActorRole[] = ["STUDENT", "TEACHER"];

export function canViewSupportQuery(
  query: SupportQueryItem,
  actorRole: SupportQueryActorRole | null
): boolean {
  if (!actorRole) return false;
  if (query.createdByRole === actorRole) return true;

  if (actorRole === "ADMIN") {
    return ADMIN_INBOX_ROLES.includes(query.createdByRole);
  }

  if (actorRole === "SUPER_ADMIN") {
    return (
      query.createdByRole === "ADMIN" ||
      query.createdByRole === "TEACHER" ||
      Boolean(query.forwardedToSuperAdmin)
    );
  }

  return false;
}

export function canForwardQueryToSuperAdmin(
  query: SupportQueryItem,
  actorRole: SupportQueryActorRole | null
): boolean {
  return (
    actorRole === "ADMIN" &&
    query.createdByRole === "STUDENT" &&
    !query.forwardedToSuperAdmin
  );
}

export function isSupportQueryOwner(
  query: SupportQueryItem,
  actorRole: SupportQueryActorRole | null
): boolean {
  return Boolean(actorRole && query.createdByRole === actorRole);
}

/** Cross-component refresh for Support sidebar unread badge. */
export const SUPPORT_UNREAD_CHANGED_EVENT = "support-unread-changed";

export function notifySupportUnreadChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SUPPORT_UNREAD_CHANGED_EVENT));
}

/** Unique Select value for "All" filter options (placeholder already uses ""). */
export const SUPPORT_ALL_FILTER_VALUE = "__all__";

export type SupportFilterOption = {
  label: string;
  value: string;
  testId?: string;
};

export const SUPPORT_SUCCESS_SNACKBAR_OPTIONS: {
  variant: "success";
  SnackbarProps: HTMLAttributes<HTMLDivElement>;
} = {
  variant: "success",
  SnackbarProps: {
    "data-testid": "snackbar-support-success",
  } as unknown as HTMLAttributes<HTMLDivElement>,
};

export function getSupportApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function isSupportNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { response?: { status?: number } }).response?.status === 404;
}
