/** Default page size for paginated list screens. */
export const DEFAULT_LIST_ROWS_PER_PAGE = 20;

/** Matches Photo / Video Gallery list page size options. */
export const LIST_ROWS_PER_PAGE_OPTIONS: number[] = [20, 40, 60];

/** Show pagination controls only when total records exceed one page (21+), same as gallery. */
export function shouldShowStandardListPagination(totalRows: number): boolean {
  return totalRows > DEFAULT_LIST_ROWS_PER_PAGE;
}
