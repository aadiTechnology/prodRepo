/**
 * usePermissionListController.ts
 * Manages table UI state for Permission Management page
 * Handles: pagination, search, expanded module rows
 */

import { useState, useCallback, useMemo } from "react";

export interface PermissionTableRow {
  id: number;
  name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  level: 1 | 2;
  parent_id?: number;
}

export interface UsePermissionListControllerOptions {
  allRows: PermissionTableRow[];
  searchQuery: string;
}

export const usePermissionListController = ({
  allRows,
  searchQuery,
}: UsePermissionListControllerOptions) => {
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Expanded module IDs state
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<number>>(
    new Set()
  );

  // Toggle module expand/collapse
  const toggleModule = useCallback((moduleId: number) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Handle rows per page change
  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  // Filtered and paginated rows
  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return allRows.slice(start, end);
  }, [allRows, page, rowsPerPage]);

  // Reset pagination when search changes
  const resetPagination = useCallback(() => {
    setPage(0);
  }, []);

  return {
    page,
    rowsPerPage,
    expandedModuleIds,
    paginatedRows,
    toggleModule,
    handlePageChange,
    handleRowsPerPageChange,
    resetPagination,
  };
};
