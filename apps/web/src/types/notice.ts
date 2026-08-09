export type NoticeAudienceType = "ALL" | "STUDENT" | "TEACHER" | "ADMIN";
export type NoticeType = "GENERAL" | "FEE" | "EVENT" | "HOLIDAY" | "EXAM";
export type NoticeStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "EXPIRED";

export interface NoticeTarget {
  id: number;
  tenant_id: number;
  notice_id: number;
  class_id: number | null;
  division_id: number | null;
  created_at?: string | null;
  created_by?: number | null;
}

export interface NoticeAttachment {
  id: number;
  tenant_id: number;
  notice_id: number;
  file_name: string | null;
  file_path: string | null;
  file_type: string | null;
  file_size_kb?: number | null;
  uploaded_at: string | null;
  uploaded_by?: number | null;
}

export interface Notice {
  id: number;
  tenant_id: number;
  title: string;
  description: string;
  notice_type: NoticeType;
  audience_type: NoticeAudienceType;
  status: NoticeStatus;
  publish_date: string;
  expiry_date: string | null;
  is_draft: boolean;
  is_published: boolean;
  published_at: string | null;
  unpublished_at: string | null;
  send_notification: boolean;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
  is_deleted: boolean;
  targets: NoticeTarget[];
  attachments: NoticeAttachment[];
  /** True after the current user has opened this notice (sidebar unread). */
  is_viewed?: boolean;
}

export interface NoticeCreateTarget {
  class_id?: number;
  division_id?: number;
}

export interface NoticeCreateAttachment {
  file_name?: string;
  file_path?: string;
  file_type?: string;
  file_size_kb?: number;
}

export interface NoticeCreateRequest {
  title: string;
  description: string;
  audience_type: NoticeAudienceType;
  notice_type: NoticeType;
  publish_date?: string;
  expiry_date?: string;
  /**
   * Defaults to true on the backend when omitted.
   * CreateNotice always sends true (no admin toggle in product UI).
   */
  send_notification?: boolean;
  is_draft: boolean;
  targets: NoticeCreateTarget[];
  attachments: NoticeCreateAttachment[];
}

export type NoticeUpdateRequest = Partial<
  Pick<
    NoticeCreateRequest,
    | "title"
    | "description"
    | "audience_type"
    | "notice_type"
    | "publish_date"
    | "expiry_date"
    | "send_notification"
    | "is_draft"
    | "targets"
    | "attachments"
  >
>;

export interface NoticeListResponse {
  items: Notice[];
  total: number;
  page: number;
  size: number;
}

export interface NoticeCountResponse {
  count: number;
}

export interface NoticeStatusUpdateResponse {
  message: string;
  notice: Notice;
}

export interface NoticeDropdownOptionsResponse {
  notice_types: NoticeType[];
  audience_types: NoticeAudienceType[];
  status_types: NoticeStatus[];
}
