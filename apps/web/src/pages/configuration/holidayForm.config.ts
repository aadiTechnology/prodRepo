import type { HolidayCreatePayload, HolidayType } from "../../services/holidayApi";

export type HolidayFormData = {
  academic_year_id: number | null;
  holiday_name: string;
  holiday_type: HolidayType;
  start_date: string;
  end_date: string;
  applicable_for: string;
  description: string;
} & Record<string, unknown>;

export const HOLIDAY_TYPE_OPTIONS: { label: string; value: HolidayType }[] = [
  { label: "Public Holiday", value: "PUBLIC_HOLIDAY" },
  { label: "Academic Break", value: "ACADEMIC_BREAK" },
  { label: "Non-Teaching Day", value: "NON_TEACHING_DAY" },
];

export const EMPTY_FORM: HolidayFormData = {
  academic_year_id: null,
  holiday_name: "",
  holiday_type: "PUBLIC_HOLIDAY",
  start_date: "",
  end_date: "",
  applicable_for: "",
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
    formData.applicable_for,
    formData.description,
  ]);
}

export function buildHolidayCreatePayload(formData: HolidayFormData): HolidayCreatePayload {
  const start = normalizeIsoDatePart(formData.start_date);
  const end = formData.end_date.trim() ? normalizeIsoDatePart(formData.end_date) : start;
  return {
    academic_year_id: Number(formData.academic_year_id),
    holiday_name: formData.holiday_name.trim(),
    holiday_type: formData.holiday_type,
    start_date: start,
    end_date: end,
    applicable_for: formData.applicable_for.trim() || "All Staff & Students",
    description: formData.description.trim() || undefined,
  };
}
