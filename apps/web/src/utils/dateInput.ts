/** Local calendar date as `YYYY-MM-DD` for HTML date inputs. */
export function todayDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isFutureDateInputValue(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return false;
  return value.trim() > todayDateInputValue();
}

/** Props for date-of-birth fields: blocks future dates in the native picker. */
export function dateOfBirthInputProps() {
  return { htmlInput: { max: todayDateInputValue() } };
}
