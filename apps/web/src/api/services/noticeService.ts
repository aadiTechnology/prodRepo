import { apiClient } from "../client";
import type { Notice, NoticeCreateRequest, NoticeListResponse } from "../../types/notice";

const BASE = "/communications/notices";

const noticeService = {
  list: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    audience_type?: string;
    notice_type?: string;
    is_published?: boolean;
  }): Promise<NoticeListResponse> => {
    const res = await apiClient.get(BASE, { params });
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

  update: async (id: number, payload: Partial<NoticeCreateRequest>): Promise<Notice> => {
    const res = await apiClient.put(`${BASE}/${id}`, payload);
    return res.data;
  },

  publish: async (id: number): Promise<Notice> => {
    const res = await apiClient.post(`${BASE}/${id}/publish`);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },
};

export default noticeService;
