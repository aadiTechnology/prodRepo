import { apiClient } from "../client";
import type {
  Notice,
  NoticeCountResponse,
  NoticeCreateRequest,
  NoticeDropdownOptionsResponse,
  NoticeListResponse,
  NoticeStatusUpdateResponse,
  NoticeUpdateRequest,
} from "../../types/notice";

const BASE = "/communications/notices";

const noticeService = {
  list: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
    audience_type?: string;
    notice_type?: string;
    is_published?: boolean;
  }): Promise<NoticeListResponse> => {
    const res = await apiClient.get(BASE, { params });
    return res.data;
  },

  getDropdownOptions: async (): Promise<NoticeDropdownOptionsResponse> => {
    const res = await apiClient.get(`${BASE}/dropdown/options`);
    return res.data;
  },

  getUnreadCount: async (params?: {
    audience_type?: string;
    notice_type?: string;
    status?: string;
  }): Promise<NoticeCountResponse> => {
    const res = await apiClient.get(`${BASE}/unread-count`, { params });
    return res.data;
  },

  markViewed: async (id: number): Promise<{ message: string; notice_id: number; already_viewed: boolean }> => {
    const res = await apiClient.post(`${BASE}/${id}/mark-viewed`);
    return res.data;
  },

  getById: async (id: number): Promise<Notice> => {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },

  create: async (payload: NoticeCreateRequest): Promise<Notice> => {
    const res = await apiClient.post(BASE, payload);
    return res.data;
  },

  update: async (id: number, payload: NoticeUpdateRequest): Promise<Notice> => {
    const res = await apiClient.put(`${BASE}/${id}`, payload);
    return res.data;
  },

  publish: async (id: number): Promise<NoticeStatusUpdateResponse> => {
    const res = await apiClient.post(`${BASE}/${id}/publish`);
    return res.data;
  },

  unpublish: async (id: number): Promise<NoticeStatusUpdateResponse> => {
    const res = await apiClient.post(`${BASE}/${id}/unpublish`);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  uploadAttachment: async (noticeId: number, file: File): Promise<Notice["attachments"][number]> => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post(`${BASE}/${noticeId}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  deleteAttachment: async (noticeId: number, attachmentId: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${noticeId}/attachments/${attachmentId}`);
  },

  /** Authenticated fetch for private-storage attachment proxy paths. */
  fetchAttachmentContent: async (contentPath: string): Promise<Blob> => {
    const res = await apiClient.get(contentPath, { responseType: "blob" });
    return res.data;
  },
};

export default noticeService;
