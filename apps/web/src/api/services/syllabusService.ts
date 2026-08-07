/**
 * Syllabus Management — backend API client.
 * Base path: /api/academics/syllabus
 */

import { apiClient } from "../client";

export const SYLLABUS_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type SyllabusMonth = (typeof SYLLABUS_MONTHS)[number];

/** Display label: "August - 2026" (defaults to the current calendar year). */
export function formatSyllabusMonthLabel(
  month: string,
  year: number = new Date().getFullYear(),
): string {
  return `${month} - ${year}`;
}

export const SYLLABUS_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png";

const ALLOWED_EXT = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png"];

const BASE = "/api/academics/syllabus";

export type SyllabusAttachment = {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size_kb?: number | null;
  uploaded_at?: string | null;
};

export type Syllabus = {
  id: number;
  academic_year_id: number;
  academic_year_name: string;
  class_id: number;
  class_name: string;
  month: SyllabusMonth;
  uploaded_by_name: string;
  upload_date: string;
  attachment: SyllabusAttachment | null;
};

export type SyllabusListParams = {
  page?: number;
  size?: number;
  search?: string;
  academic_year_id?: number;
  class_id?: number;
  month?: string;
  scoped_class_id?: number;
};

export type SyllabusListResponse = {
  items: Syllabus[];
  total: number;
  page: number;
  size: number;
};

export type SyllabusFilterOptions = {
  academic_years: { id: number; name: string; is_current: boolean }[];
  classes: { id: number; name: string }[];
  months: string[];
};

export type SyllabusWritePayload = {
  academic_year_id: number;
  class_id: number;
  month: SyllabusMonth;
};

export function isAllowedSyllabusFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXT.includes(ext);
}

export function buildSyllabusAttachmentUrl(filePath: string): string {
  if (
    filePath.startsWith("http://") ||
    filePath.startsWith("https://") ||
    filePath.startsWith("blob:")
  ) {
    return filePath;
  }
  return filePath;
}

const syllabusService = {
  getFilterOptions: async (): Promise<SyllabusFilterOptions> => {
    const res = await apiClient.get(`${BASE}/filter-options`);
    return res.data;
  },

  list: async (params: SyllabusListParams = {}): Promise<SyllabusListResponse> => {
    const res = await apiClient.get(BASE, { params });
    return res.data;
  },

  getById: async (id: number): Promise<Syllabus> => {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },

  create: async (payload: SyllabusWritePayload): Promise<Syllabus> => {
    const res = await apiClient.post(BASE, payload);
    return res.data;
  },

  update: async (id: number, payload: SyllabusWritePayload): Promise<Syllabus> => {
    const res = await apiClient.put(`${BASE}/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  uploadAttachment: async (syllabusId: number, file: File): Promise<SyllabusAttachment> => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post(`${BASE}/${syllabusId}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  deleteAttachment: async (syllabusId: number, attachmentId: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${syllabusId}/attachments/${attachmentId}`);
  },
};

export default syllabusService;
