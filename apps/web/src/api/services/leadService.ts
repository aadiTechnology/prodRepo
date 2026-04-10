import { apiClient } from "../client";
import type {
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadListResponse,
  LeadFollowupCreate,
  LeadFollowup,
  LeadDetail,
  LeadSource,
  LeadStatus,
} from "../../types/lead";

const BASE = "/api/admissions/leads";

const leadService = {
  // ── Dropdowns ──────────────────────────────────────────────
  getSources: async (): Promise<LeadSource[]> => {
    const res = await apiClient.get(`${BASE}/sources`);
    return res.data;
  },

  getStatuses: async (): Promise<LeadStatus[]> => {
    const res = await apiClient.get(`${BASE}/statuses`);
    return res.data;
  },

  // ── Lead CRUD ──────────────────────────────────────────────
  list: async (params?: {
    search?: string;
    status_id?: number;
    source_id?: number;
    assigned_to?: number;
    page?: number;
    page_size?: number;
  }): Promise<LeadListResponse> => {
    const res = await apiClient.get(BASE, { params });
    return res.data;
  },

  getById: async (id: number): Promise<LeadDetail> => {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },

  create: async (data: LeadCreate): Promise<Lead> => {
    const res = await apiClient.post(BASE, data);
    return res.data;
  },

  update: async (id: number, data: LeadUpdate): Promise<LeadDetail> => {
    const res = await apiClient.put(`${BASE}/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  convert: async (id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${id}/convert`);
  },

  // ── Follow-ups ─────────────────────────────────────────────
  getFollowups: async (leadId: number): Promise<LeadFollowup[]> => {
    const res = await apiClient.get(`${BASE}/${leadId}/followups`);
    return res.data;
  },

  createFollowup: async (
    leadId: number,
    data: LeadFollowupCreate
  ): Promise<LeadFollowup> => {
    const res = await apiClient.post(`${BASE}/${leadId}/followups`, data);
    return res.data;
  },

  completeFollowup: async (
    followupId: number,
    completion_notes: string
  ): Promise<LeadFollowup> => {
    const res = await apiClient.post(
      `${BASE}/followups/${followupId}/complete`,
      { completion_notes }
    );
    return res.data;
  },
};

export default leadService;
