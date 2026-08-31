import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import { enqueueSnackbar } from "notistack";
import type { NavigateFunction } from "react-router-dom";
import tenantService from "../api/services/tenantService";
import authService from "../api/services/authService";
import type { Tenant } from "../types/tenant";
import type { User } from "../types/auth";
import type { LoginContextResponse } from "../types/rbac";
import { useListManager } from "./useListManager";

export type TenantListSortBy = "name" | "created_at";

type UseTenantListControllerOptions = {
  currentUser: User | null;
  navigate: NavigateFunction;
  applyLoginContextResponse: (response: LoginContextResponse) => void;
};

type UseTenantListControllerResult = {
  listState: ReturnType<typeof useListManager<Record<string, string>, TenantListSortBy>>;
  tenants: Tenant[];
  sortedTenants: Tenant[];
  totalTenants: number;
  loading: boolean;
  error: string | null;
  snackbar: string | null;
  confirmDialogOpen: boolean;
  tenantToDelete: Tenant | null;
  deleteLoading: boolean;
  impersonationLoading: number | null;
  isSystemAdmin: boolean;
  fetchTenants: () => Promise<void>;
  dismissError: () => void;
  closeSnackbar: () => void;
  openDeleteConfirm: (tenant: Tenant) => void;
  closeDeleteConfirm: () => void;
  confirmDelete: () => Promise<void>;
  loginAsTenant: (tenantId: number) => Promise<void>;
};

export function useTenantListController({
  currentUser,
  navigate,
  applyLoginContextResponse,
}: UseTenantListControllerOptions): UseTenantListControllerResult {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totalTenants, setTotalTenants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [impersonationLoading, setImpersonationLoading] = useState<number | null>(null);

  const listState = useListManager<Record<string, string>, TenantListSortBy>({
    initialFilters: {},
    initialSortBy: "created_at",
    initialSortOrder: "asc",
    initialRowsPerPage: DEFAULT_LIST_ROWS_PER_PAGE,
    initialPage: 0,
    initialSearch: "",
  });

  const fetchTenants = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await tenantService.list({
        search: listState.search || undefined,
        page: listState.page + 1,
        page_size: listState.rowsPerPage,
      });
      setTenants(data.items);
      setTotalTenants(data.total);
    } catch (err: unknown) {
      const errorObject = err as { message?: string };
      setError(errorObject.message || "Failed to fetch tenants.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [listState.page, listState.rowsPerPage, listState.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchTenants]);

  useEffect(() => {
    if (!snackbar) return;
    const timer = setTimeout(() => setSnackbar(null), 3000);
    return () => clearTimeout(timer);
  }, [snackbar]);

  const openDeleteConfirm = useCallback((tenant: Tenant) => {
    setTenantToDelete(tenant);
    setConfirmDialogOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setConfirmDialogOpen(false);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!tenantToDelete) return;
    try {
      setDeleteLoading(true);
      await tenantService.delete(tenantToDelete.id);
      setConfirmDialogOpen(false);
      setTenantToDelete(null);
      setSnackbar("Tenant deleted successfully");
      await fetchTenants();
    } catch (err: unknown) {
      const errorObject = err as { message?: string };
      setError(errorObject.message || "Failed to delete tenant.");
    } finally {
      setDeleteLoading(false);
    }
  }, [fetchTenants, tenantToDelete]);

  const loginAsTenant = useCallback(
    async (tenantId: number) => {
      try {
        setImpersonationLoading(tenantId);
        const adminUser = await tenantService.getTenantAdminUser(tenantId);
        const response = await authService.impersonate(adminUser.id);
        applyLoginContextResponse(response);
        enqueueSnackbar("Logged in as tenant successfully", { variant: "success" });
        navigate("/");
      } catch (err) {
        console.error("Failed to login as tenant:", err);
        enqueueSnackbar("Failed to login as tenant", { variant: "error" });
      } finally {
        setImpersonationLoading(null);
      }
    },
    [applyLoginContextResponse, navigate]
  );

  const sortedTenants = useMemo(() => {
    return [...tenants].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (listState.sortBy === "created_at") {
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else {
        aVal = (a.name || "").toLowerCase();
        bVal = (b.name || "").toLowerCase();
      }
      if (aVal < bVal) return listState.sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return listState.sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [listState.sortBy, listState.sortOrder, tenants]);

  const isSystemAdmin = !currentUser?.tenant_id;

  return {
    listState,
    tenants,
    sortedTenants,
    totalTenants,
    loading,
    error,
    snackbar,
    confirmDialogOpen,
    tenantToDelete,
    deleteLoading,
    impersonationLoading,
    isSystemAdmin,
    fetchTenants,
    dismissError: () => setError(null),
    closeSnackbar: () => setSnackbar(null),
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    loginAsTenant,
  };
}
