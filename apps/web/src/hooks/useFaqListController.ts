import { useCallback, useMemo, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import type { SupportQueryItem, SupportQueryStatus } from "../pages/support/support.types";
import {
  SUPPORT_ALL_FILTER_VALUE,
  SUPPORT_QUERY_STATUSES,
  canViewSupportQuery,
} from "../pages/support/support.types";
import { useFaqData } from "../pages/support/context/FaqDataContext";
import { useSupportPermissions } from "./useSupportPermissions";

const MIN_SUGGESTION_CHARS = 3;

function statusFilterOptionTestId(status: SupportQueryStatus): string {
  return `support-query-status-filter-option-${status.toLowerCase().replace(/\s+/g, "-")}`;
}

export function useFaqListController() {
  const { queries, queriesLoading, queriesError, categoryFilterOptions } = useFaqData();
  const perms = useSupportPermissions();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);

  const visibleQueries = useMemo(() => {
    return queries.filter((q) => canViewSupportQuery(q, perms.actorRole));
  }, [queries, perms.actorRole]);

  const matchesSearch = useCallback((query: SupportQueryItem, term: string) => {
    const q = term.toLowerCase();
    return (
      query.id.toLowerCase().includes(q) ||
      query.category.toLowerCase().includes(q) ||
      query.subject.toLowerCase().includes(q) ||
      query.createdBy.toLowerCase().includes(q) ||
      query.status.toLowerCase().includes(q)
    );
  }, []);

  const filteredQueries = useMemo(() => {
    let result = visibleQueries;
    if (categoryFilter) {
      result = result.filter((q) => q.category === categoryFilter);
    }
    if (statusFilter) {
      result = result.filter((q) => q.status === statusFilter);
    }
    if (search.trim()) {
      result = result.filter((q) => matchesSearch(q, search.trim()));
    }
    return result;
  }, [visibleQueries, categoryFilter, statusFilter, search, matchesSearch]);

  const suggestions = useMemo(() => {
    const q = search.trim();
    if (q.length < MIN_SUGGESTION_CHARS) return [];
    return visibleQueries
      .filter((item) => matchesSearch(item, q))
      .slice(0, 8)
      .map((item) => ({ id: item.id, label: `${item.id} — ${item.subject}` }));
  }, [search, visibleQueries, matchesSearch]);

  const paginatedQueries = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredQueries.slice(start, start + rowsPerPage);
  }, [filteredQueries, page, rowsPerPage]);

  const categoryOptions = categoryFilterOptions;

  const statusOptions = useMemo(
    () => [
      {
        label: "All Statuses",
        value: SUPPORT_ALL_FILTER_VALUE,
        testId: "support-query-status-filter-option-all",
      },
      ...SUPPORT_QUERY_STATUSES.map((s: SupportQueryStatus) => ({
        label: s,
        value: s,
        testId: statusFilterOptionTestId(s),
      })),
    ],
    []
  );

  return {
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(0);
    },
    categoryFilter,
    setCategoryFilter: (value: string) => {
      setCategoryFilter(value === SUPPORT_ALL_FILTER_VALUE ? "" : value);
      setPage(0);
    },
    statusFilter,
    setStatusFilter: (value: string) => {
      setStatusFilter(value === SUPPORT_ALL_FILTER_VALUE ? "" : value);
      setPage(0);
    },
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredQueries,
    paginatedQueries,
    totalRows: filteredQueries.length,
    suggestions,
    minSuggestionChars: MIN_SUGGESTION_CHARS,
    categoryOptions,
    statusOptions,
    ownQueryCount: visibleQueries.length,
    queriesLoading,
    queriesError,
    perms,
  };
}
