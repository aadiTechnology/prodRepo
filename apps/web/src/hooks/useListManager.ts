import { useState } from "react";

export type SortOrder = "asc" | "desc";

export interface UseListManagerOptions<
  TFilters extends Record<string, string>,
  TSortBy extends string = string,
> {
  initialSearch?: string;
  initialPage?: number;
  initialRowsPerPage?: number;
  initialFilters: TFilters;
  initialSortBy: TSortBy;
  initialSortOrder?: SortOrder;
}

export interface UseListManagerResult<
  TFilters extends Record<string, string>,
  TSortBy extends string = string,
> {
  search: string;
  setSearch: (value: string) => void;
  onSearchChange: (value: string) => void;
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  page: number;
  setPage: (value: number) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (value: number) => void;
  sortBy: TSortBy;
  setSortBy: (value: TSortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (value: SortOrder) => void;
}

/**
 * Shared state manager for list screens.
 * Keeps UI controls in one place while page keeps business logic.
 */
export function useListManager<
  TFilters extends Record<string, string>,
  TSortBy extends string = string,
>({
  initialSearch = "",
  initialPage = 0,
  initialRowsPerPage = 10,
  initialFilters,
  initialSortBy,
  initialSortOrder = "asc",
}: UseListManagerOptions<TFilters, TSortBy>): UseListManagerResult<TFilters, TSortBy> {
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [sortBy, setSortBy] = useState<TSortBy>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const setFilter = <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const onRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(0);
  };

  return {
    search,
    setSearch,
    onSearchChange,
    filters,
    setFilter,
    page,
    setPage,
    rowsPerPage,
    onRowsPerPageChange,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  };
}
