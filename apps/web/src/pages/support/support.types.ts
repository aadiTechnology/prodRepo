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
  admin: true,
  teacher: true,
  student: true,
};

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
  createdBy: string;
  createdByRole: SupportQueryActorRole;
  createdAt: string;
  status: SupportQueryStatus;
  messages: SupportQueryMessage[];
  /** When Admin forwards a Student query for Super Admin assistance */
  forwardedToSuperAdmin?: boolean;
  forwardedBy?: string;
  forwardedAt?: string;
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

export const SUPPORT_QUERY_CATEGORIES = [
  "Technical Issue",
  "Student Related",
  "Attendance",
  "Fees",
  "Other",
] as const;

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
    return query.createdByRole === "ADMIN" || Boolean(query.forwardedToSuperAdmin);
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
