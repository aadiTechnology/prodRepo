import type { NoticeAudienceType } from "../../types/notice";
import type { HolidayCreatePayload } from "../../services/holidayApi";

export type HolidayFormData = {
  academic_year_id: number | null;
  holiday_name: string;
  holiday_type: string;
  start_date: string;
  end_date: string;
  /** API round-trip; not shown in the form. New holidays use STUDENT so class/division scope applies. */
  audience_type: NoticeAudienceType;
  class_ids: number[];
  division_ids: number[];
  description: string;
} & Record<string, unknown>;

export const EMPTY_FORM: HolidayFormData = {
  academic_year_id: null,
  holiday_name: "",
  holiday_type: "",
  start_date: "",
  end_date: "",
  audience_type: "STUDENT",
  class_ids: [],
  division_ids: [],
  description: "",
};

/** Normalizes `<input type="date">` values to `YYYY-MM-DD` (first 10 chars). */
export function normalizeIsoDatePart(value: string): string {
  return value.trim().slice(0, 10);
}

/** Compares calendar dates at local midnight; returns NaN if either value is invalid. */
export function compareIsoDateStrings(a: string, b: string): number {
  const pa = normalizeIsoDatePart(a);
  const pb = normalizeIsoDatePart(b);
  const da = Date.parse(`${pa}T00:00:00`);
  const db = Date.parse(`${pb}T00:00:00`);
  if (!Number.isFinite(da) || !Number.isFinite(db)) {
    return Number.NaN;
  }
  return da - db;
}

export function serializeHolidayFormSnapshot(formData: HolidayFormData): string {
  return JSON.stringify([
    formData.academic_year_id,
    formData.holiday_name,
    formData.holiday_type,
    formData.start_date,
    formData.end_date,
    formData.audience_type,
    formData.class_ids,
    formData.division_ids,
    formData.description,
  ]);
}

export function buildHolidayCreatePayload(formData: HolidayFormData): HolidayCreatePayload {
  const start = normalizeIsoDatePart(formData.start_date);
  const end = formData.end_date.trim() ? normalizeIsoDatePart(formData.end_date) : start;
  const aud = formData.audience_type;
  return {
    academic_year_id: Number(formData.academic_year_id),
    holiday_name: formData.holiday_name.trim(),
    holiday_type: formData.holiday_type.trim().slice(0, 50),
    start_date: start,
    end_date: end,
    audience_type: aud,
    class_ids: formData.class_ids,
    division_ids: formData.division_ids,
    description: formData.description.trim() || undefined,
  };
}
