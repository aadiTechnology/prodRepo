/**
 * Academic Calendar API — GET calendar grid and CSV export.
 */
import { apiClient } from "../api/client";

export type AcademicCalendarRowStatus = "ACTIVE" | "INACTIVE";

export type AcademicCalendarMonthStatus = "ACTIVE" | "CLOSED";

export interface AcademicCalendarDayItem {
  date: string;
  day: number;
  holiday_name: string;
  holiday_type: string;
  status: AcademicCalendarRowStatus;
  outside_academic_year: boolean;
}

export interface AcademicCalendarResponse {
  month: string;
  year: number;
  academic_status: AcademicCalendarMonthStatus;
  page: number;
  page_size: number;
  total: number;
  data: AcademicCalendarDayItem[];
}

export interface FetchAcademicCalendarParams {
  year: number;
  month: number;
  academic_year_id: number;
  page?: number;
  page_size?: number;
}

export async function fetchAcademicCalendar(
  params: FetchAcademicCalendarParams
): Promise<AcademicCalendarResponse> {
  const { data } = await apiClient.get<AcademicCalendarResponse>("/api/academic-calendar", {
    params: {
      year: params.year,
      month: params.month,
      academic_year_id: params.academic_year_id,
      page: params.page ?? 1,
      page_size: params.page_size ?? 31,
    },
  });
  return data;
}

export interface ExportAcademicCalendarParams {
  year: number;
  academic_year_id: number;
}

export async function exportAcademicCalendarCsv(
  params: ExportAcademicCalendarParams
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.get<Blob>("/api/academic-calendar/export", {
    params: {
      year: params.year,
      academic_year_id: params.academic_year_id,
    },
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"];
  let filename = `academic-calendar-${params.year}-ay${params.academic_year_id}.csv`;
  if (disposition && typeof disposition === "string") {
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    if (match?.[1]) {
      filename = match[1].trim();
    }
  }

  return { blob: response.data, filename };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}
