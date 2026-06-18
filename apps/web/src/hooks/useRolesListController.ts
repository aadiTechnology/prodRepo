import { useState, useCallback, useEffect } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import roleService from "../api/services/roleService";
import { type Role } from "../types/role.types";

export function useRolesListController() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [totalRoles, setTotalRoles] = useState(0);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roleService.getRoles({
        search: search || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
        sortBy: sortBy === 'createdAt' ? 'created_at' : sortBy,
        sortOrder,
        activeOnly: true,
      });
      setRoles(data.items ?? []);
      setTotalRoles(data.totalCount);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch roles.");
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRoles();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchRoles]);

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      setDeleteLoading(true);
      const deletedId = roleToDelete.id;
      await roleService.deleteRole(deletedId);
      setConfirmDialogOpen(false);
      setRoleToDelete(null);
      setSnackbar("Role deleted successfully");
      setRoles((prev) => prev.filter((r) => String(r.id) !== String(deletedId)));
      setTotalRoles((prev) => Math.max(0, prev - 1));
      void fetchRoles();
    } catch (err: any) {
      setError(err?.message || "Failed to delete role.");
    } finally {
      setDeleteLoading(false);
    }
    
  };

  return {
    roles,
    loading,
    error,
    setError,
    totalRoles,
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    confirmDialogOpen,
    setConfirmDialogOpen,
    deleteLoading,
    roleToDelete,
    handleDeleteClick,
    handleConfirmDelete,
    snackbar,
    setSnackbar,
    fetchRoles,
  };
}
