export type NoticeAudienceType = "ALL" | "CLASS" | "DIVISION";
export type NoticeType = "General" | "Fee" | "Event" | "Holiday";

export interface NoticeTarget {
  id: number;
  class_id: number | null;
  division_id: number | null;
}

export interface NoticeAttachment {
  id: number;
  file_name: string | null;
  file_path: string | null;
  file_type: string | null;
  uploaded_at: string | null;
}

export interface Notice {
  id: number;
  tenant_id: number;
  title: string;
  description: string;
  notice_type: NoticeType;
  audience_type: NoticeAudienceType;
  publish_date: string;
  expiry_date: string | null;
  is_draft: boolean;
  is_published: boolean;
  send_notification: boolean;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
  is_deleted: boolean;
  targets: NoticeTarget[];
  attachments: NoticeAttachment[];
}

export interface NoticeCreateTarget {
  class_id?: number;
  division_id?: number;
}

export interface NoticeCreateAttachment {
  file_name?: string;
  file_path?: string;
  file_type?: string;
}

export interface NoticeCreateRequest {
  title: string;
  description: string;
  audience_type: NoticeAudienceType;
  notice_type: NoticeType;
  publish_date?: string;
  expiry_date?: string;
  send_notification: boolean;
  is_draft: boolean;
  targets: NoticeCreateTarget[];
  attachments: NoticeCreateAttachment[];
}

export interface NoticeListResponse {
  items: Notice[];
  total: number;
  page: number;
  size: number;
}
