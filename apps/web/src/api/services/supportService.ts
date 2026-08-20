import { apiClient } from "../client";
import { parseApiUtcDateTime } from "../../utils/formatters";
import type {
  ProductUpdateItem,
  ReleaseNoteFileType,
  ReleaseNoteShowTo,
  SupportQueryActorRole,
  SupportQueryItem,
  SupportQueryMessage,
  SupportQueryStatus,
} from "../../pages/support/support.types";

const BASE = "/api/support";

// ---------------------------------------------------------------------------
// API types (snake_case)
// ---------------------------------------------------------------------------

interface SupportQueryMessageApi {
  id: string;
  author: string;
  author_role: string;
  body: string;
  created_at: string;
}

interface SupportQueryApi {
  id: string;
  category: string;
  subject: string;
  description: string;
  attachment_name: string | null;
  attachment_url: string | null;
  created_by: string;
  created_by_role: SupportQueryActorRole;
  created_at: string;
  status: SupportQueryStatus;
  messages: SupportQueryMessageApi[];
  forwarded_to_super_admin: boolean;
  forwarded_by: string | null;
  forwarded_at: string | null;
  is_viewed: boolean;
}

interface SupportQueryListApi {
  items: SupportQueryApi[];
  total: number;
  page: number;
  size: number;
}

interface ReleaseNoteShowToApi {
  admin: boolean;
  teacher: boolean;
  student: boolean;
}

interface ReleaseNoteApi {
  id: number;
  title: string;
  version: string;
  release_date: string;
  description: string;
  status: string;
  attachment_name: string | null;
  attachment_type: ReleaseNoteFileType | null;
  attachment_url: string | null;
  created_by: string;
  modified_by: string | null;
  modified_date: string | null;
  show_to: ReleaseNoteShowToApi;
}

interface ReleaseNoteListApi {
  items: ReleaseNoteApi[];
  total: number;
  page: number;
  size: number;
}

export interface SupportQueryCreatePayload {
  category: string;
  subject: string;
  description: string;
}

export interface SupportQueryUpdatePayload {
  category?: string;
  subject?: string;
  description?: string;
  status?: SupportQueryStatus;
}

export interface ReleaseNoteCreatePayload {
  version: string;
  release_date: string;
  description: string;
  show_to: ReleaseNoteShowTo;
}

export interface ReleaseNoteUpdatePayload {
  version?: string;
  release_date?: string;
  description?: string;
  show_to?: ReleaseNoteShowTo;
}

function toIsoDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = parseApiUtcDateTime(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function toIsoDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function mapMessage(api: SupportQueryMessageApi): SupportQueryMessage {
  return {
    id: api.id,
    author: api.author,
    authorRole: api.author_role,
    body: api.body,
    createdAt: toIsoDateTime(api.created_at),
  };
}

export function mapSupportQuery(api: SupportQueryApi): SupportQueryItem {
  return {
    id: api.id,
    category: api.category,
    subject: api.subject,
    description: api.description,
    attachmentName: api.attachment_name ?? undefined,
    attachmentUrl: api.attachment_url ?? undefined,
    createdBy: api.created_by,
    createdByRole: api.created_by_role,
    createdAt: toIsoDateTime(api.created_at),
    status: api.status,
    messages: (api.messages ?? []).map(mapMessage),
    forwardedToSuperAdmin: api.forwarded_to_super_admin,
    forwardedBy: api.forwarded_by ?? undefined,
    forwardedAt: api.forwarded_at ? toIsoDateTime(api.forwarded_at) : undefined,
    isViewed: api.is_viewed ?? false,
  };
}

export function mapReleaseNote(api: ReleaseNoteApi): ProductUpdateItem {
  return {
    id: String(api.id),
    title: api.title,
    version: api.version,
    releaseDate: toIsoDate(api.release_date),
    description: api.description,
    status: "Done",
    attachmentName: api.attachment_name ?? "",
    attachmentType: api.attachment_type ?? "pdf",
    attachmentUrl: api.attachment_url ?? "#",
    createdBy: api.created_by,
    modifiedBy: api.modified_by ?? api.created_by,
    modifiedDate: toIsoDate(api.modified_date ?? api.release_date),
    showTo: {
      admin: api.show_to.admin,
      teacher: api.show_to.teacher,
      student: api.show_to.student,
    },
  };
}

const supportService = {
  listQueries: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<SupportQueryItem[]> => {
    const res = await apiClient.get<SupportQueryListApi>(`${BASE}/queries`, { params });
    return (res.data.items ?? []).map(mapSupportQuery);
  },

  getQuery: async (queryKey: string): Promise<SupportQueryItem> => {
    const res = await apiClient.get<SupportQueryApi>(`${BASE}/queries/${encodeURIComponent(queryKey)}`);
    return mapSupportQuery(res.data);
  },

  createQuery: async (payload: SupportQueryCreatePayload): Promise<SupportQueryItem> => {
    const res = await apiClient.post<SupportQueryApi>(`${BASE}/queries`, payload);
    return mapSupportQuery(res.data);
  },

  updateQuery: async (
    queryKey: string,
    payload: SupportQueryUpdatePayload
  ): Promise<SupportQueryItem> => {
    const res = await apiClient.put<SupportQueryApi>(
      `${BASE}/queries/${encodeURIComponent(queryKey)}`,
      payload
    );
    return mapSupportQuery(res.data);
  },

  deleteQuery: async (queryKey: string): Promise<void> => {
    await apiClient.delete(`${BASE}/queries/${encodeURIComponent(queryKey)}`);
  },

  addQueryMessage: async (
    queryKey: string,
    body: string,
    status?: SupportQueryStatus
  ): Promise<SupportQueryItem> => {
    const res = await apiClient.post<SupportQueryApi>(
      `${BASE}/queries/${encodeURIComponent(queryKey)}/messages`,
      { body, status: status ?? null }
    );
    return mapSupportQuery(res.data);
  },

  updateQueryMessage: async (
    queryKey: string,
    messageId: string,
    body: string
  ): Promise<SupportQueryItem> => {
    const res = await apiClient.put<SupportQueryApi>(
      `${BASE}/queries/${encodeURIComponent(queryKey)}/messages/${encodeURIComponent(messageId)}`,
      { body }
    );
    return mapSupportQuery(res.data);
  },

  deleteQueryMessage: async (
    queryKey: string,
    messageId: string
  ): Promise<SupportQueryItem> => {
    const res = await apiClient.delete<SupportQueryApi>(
      `${BASE}/queries/${encodeURIComponent(queryKey)}/messages/${encodeURIComponent(messageId)}`
    );
    return mapSupportQuery(res.data);
  },

  forwardQuery: async (queryKey: string): Promise<SupportQueryItem> => {
    const res = await apiClient.post<SupportQueryApi>(
      `${BASE}/queries/${encodeURIComponent(queryKey)}/forward`
    );
    return mapSupportQuery(res.data);
  },

  uploadQueryAttachment: async (queryKey: string, file: File): Promise<SupportQueryItem> => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<SupportQueryApi>(
      `${BASE}/queries/${encodeURIComponent(queryKey)}/attachment`,
      form
    );
    return mapSupportQuery(res.data);
  },

  listReleaseNotes: async (params?: {
    page?: number;
    size?: number;
    search?: string;
  }): Promise<ProductUpdateItem[]> => {
    const res = await apiClient.get<ReleaseNoteListApi>(`${BASE}/release-notes`, { params });
    return (res.data.items ?? []).map(mapReleaseNote);
  },

  getReleaseNote: async (noteId: number | string): Promise<ProductUpdateItem> => {
    const res = await apiClient.get<ReleaseNoteApi>(`${BASE}/release-notes/${noteId}`);
    return mapReleaseNote(res.data);
  },

  createReleaseNote: async (payload: ReleaseNoteCreatePayload): Promise<ProductUpdateItem> => {
    const res = await apiClient.post<ReleaseNoteApi>(`${BASE}/release-notes`, payload);
    return mapReleaseNote(res.data);
  },

  updateReleaseNote: async (
    noteId: number | string,
    payload: ReleaseNoteUpdatePayload
  ): Promise<ProductUpdateItem> => {
    const res = await apiClient.put<ReleaseNoteApi>(`${BASE}/release-notes/${noteId}`, payload);
    return mapReleaseNote(res.data);
  },

  deleteReleaseNote: async (noteId: number | string): Promise<void> => {
    await apiClient.delete(`${BASE}/release-notes/${noteId}`);
  },

  uploadReleaseNoteAttachment: async (
    noteId: number | string,
    file: File
  ): Promise<ProductUpdateItem> => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<ReleaseNoteApi>(
      `${BASE}/release-notes/${noteId}/attachment`,
      form
    );
    return mapReleaseNote(res.data);
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const res = await apiClient.get<{ count: number }>(`${BASE}/queries/unread-count`);
    return { count: res.data.count ?? 0 };
  },

  markQueryViewed: async (
    queryKey: string
  ): Promise<{ query_key: string; already_viewed: boolean }> => {
    const res = await apiClient.post<{ query_key: string; already_viewed: boolean }>(
      `${BASE}/queries/${encodeURIComponent(queryKey)}/mark-viewed`
    );
    return res.data;
  },
};

export default supportService;
