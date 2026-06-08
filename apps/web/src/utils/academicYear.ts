/** True when an academic year row is active (handles SQL Server 0/1 and boolean). */
export function isAcademicYearActive(year: {
  is_active?: boolean | number | null;
}): boolean {
  const value = year.is_active;
  return value === true || value === 1;
}

export function filterActiveAcademicYears<T extends { is_active?: boolean | number | null }>(
  years: T[],
): T[] {
  return years.filter(isAcademicYearActive);
}

/** Pick the current or first active academic year for dropdown defaults. */
export function resolveCurrentAcademicYearId(
  years: {
    id: number;
    is_current?: boolean | number;
    is_active?: boolean | number | null;
  }[],
): string {
  const activeYears = filterActiveAcademicYears(years);
  const current =
    activeYears.find((y) => y.is_current === true || y.is_current === 1) ??
    activeYears[0];
  return current?.id != null ? String(current.id) : "";
}
