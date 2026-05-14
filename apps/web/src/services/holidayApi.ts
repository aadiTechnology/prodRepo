import { apiClient } from "../api/client";
import type { NoticeAudienceType } from "../types/notice";

export interface HolidayListItem {
  id: number;
  holiday_name: string;
  holiday_date: string;
  holiday_type: string;
  applicable_for: string;
  total_days?: number;
}

export interface HolidaySummary {
  total_holidays: number;
  public_holidays: number;
  academic_breaks: number;
  non_teaching: number;
  other_holidays: number;
}

export interface HolidayListResponse {
  summary: HolidaySummary;
  data: HolidayListItem[];
  total: number;
}

export interface HolidayCreatePayload {
  academic_year_id: number;
  holiday_name: string;
  holiday_type: string;
  start_date: string;
  end_date?: string;
  audience_type: NoticeAudienceType;
  class_ids: number[];
  division_ids: number[];
  description?: string;
}

export type HolidayUpdatePayload = Partial<HolidayCreatePayload>;

export interface HolidayResponse {
  id: number;
  tenant_id: number;
  academic_year_id: number;
  holiday_name: string;
  holiday_type: string;
  start_date: string;
  end_date: string | null;
  applicable_for: string;
  audience_type: string | null;
  class_ids: number[];
  division_ids: number[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export function parseHolidayDateRange(holiday_date: string): { start: string; end: string } {
  const sep = " to ";
  if (holiday_date.includes(sep)) {
    const parts = holiday_date.split(sep).map((s) => s.trim());
    const start = parts[0]?.slice(0, 10) ?? "";
    const end = parts[1]?.slice(0, 10) || start;
    return { start, end };
  }
  const d = holiday_date.trim().slice(0, 10);
  return { start: d, end: d };
}

export function holidayInclusiveDayCount(holiday_date: string): number {
  const { start, end } = parseHolidayDateRange(holiday_date);
  const a = Date.parse(`${start}T00:00:00`);
  const b = Date.parse(`${end}T00:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.floor((b - a) / 86400000) + 1;
}

function listItemToHolidayResponse(row: HolidayListItem, academic_year_id: number): HolidayResponse {
  const { start, end } = parseHolidayDateRange(row.holiday_date);
  return {
    id: row.id,
    tenant_id: 0,
    academic_year_id,
    holiday_name: row.holiday_name,
    holiday_type: row.holiday_type,
    start_date: start,
    end_date: start === end ? null : end,
    applicable_for: row.applicable_for,
    audience_type: null,
    class_ids: [],
    division_ids: [],
    description: null,
    is_active: true,
    created_at: "1970-01-01T00:00:00Z",
    updated_at: null,
  };
}

const holidayApi = {
  list: async (params: {
    academic_year_id: number;
    holiday_type?: string;
    search?: string;
    page: number;
    page_size: number;
  }): Promise<HolidayListResponse> => {
    const res = await apiClient.get("/api/holidays", { params });
    return res.data;
  },

  create: async (payload: HolidayCreatePayload): Promise<HolidayResponse> => {
    const res = await apiClient.post("/api/holidays", payload);
    return res.data;
  },

  /**
   * Loads a holiday via `GET /api/holidays` (query params) so broken `GET /api/holidays/{id}` (405) is avoided.
   * Pass `academic_year_id` so older APIs that still require it (422 without) keep working: they return a list;
   * we pick the row. New API returns a full `HolidayResponse` when `holiday_id` is set.
   */
  getById: async (id: number, options: { academic_year_id: number }): Promise<HolidayResponse> => {
    const { academic_year_id } = options;
    const pageSize = 100;

    const first = await apiClient.get("/api/holidays", {
      params: {
        holiday_id: id,
        academic_year_id,
        page: 1,
        page_size: pageSize,
      },
    });
    let body = first.data as HolidayListResponse | HolidayResponse;
    if (body && typeof body === "object" && !("summary" in body)) {
      return body as HolidayResponse;
    }

    let list = body as HolidayListResponse;
    let page = 1;
    while (true) {
      const row = list.data.find((r) => r.id === id);
      if (row) {
        return listItemToHolidayResponse(row, academic_year_id);
      }
      if (page * pageSize >= list.total || list.data.length === 0) {
        throw new Error(`Holiday ${id} not found for this academic year.`);
      }
      page += 1;
      const res = await apiClient.get("/api/holidays", {
        params: { academic_year_id, page, page_size: pageSize },
      });
      list = res.data as HolidayListResponse;
    }
  },

  update: async (id: number, payload: HolidayUpdatePayload): Promise<HolidayResponse> => {
    const res = await apiClient.put(`/api/holidays/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/holidays/${id}`);
  },
};

export default holidayApi;
