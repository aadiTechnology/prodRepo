import { useCallback, useEffect, useMemo, useState } from "react";
import type { User as AuthUser } from "../types/auth";
import type { UserResponse } from "../types/user";
import userService from "../api/services/userService";
import authService from "../api/services/authService";
import roleService from "../api/services/roleService";
import { useListManager, type UseListManagerResult } from "./useListManager";
import type { NavigateFunction } from "react-router-dom";
import type { LoginContextResponse } from "../types/rbac";
import { enqueueSnackbar } from "notistack";

export type UsersFilters = { role: string; status: string };
export type UsersSortBy = "name" | "created_at";

type UseUsersListControllerOptions = {
  currentUser: AuthUser | null;
  navigate: NavigateFunction;
  applyLoginContextResponse: (response: LoginContextResponse) => void;
};

type UseUsersListControllerResult = {
  listState: UseListManagerResult<UsersFilters, UsersSortBy>;
  filteredUsers: AuthUser[];
  paginatedUsers: AuthUser[];
  uniqueRoles: string[]; // fallback
  roleFilterOptions: { label: string; value: string }[];
  loading: boolean;
  error: string | null;
  snackbar: string | null;
  fetchUsers: () => Promise<void>;
  dismissError: () => void;
  closeSnackbar: () => void;
  confirmDialogOpen: boolean;
  deleteLoading: boolean;
  impersonationLoading: number | null;
  openDeleteConfirm: (user: AuthUser) => void;
  closeDeleteConfirm: () => void;
  confirmDelete: () => Promise<void>;
  loginAsUser: (userId: number) => Promise<void>;
};

function mapUsers(data: UserResponse[]): AuthUser[] {
  return data.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : "Unknown",
    tenant_id: u.tenant_id ?? null,
    phone_number: u.phone_number ?? null,
    is_active: u.is_active ?? true,
    created_at: u.created_at,
  }));
}

export function useUsersListController({
  currentUser,
  navigate,
  applyLoginContextResponse,
}: UseUsersListControllerOptions): UseUsersListControllerResult {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AuthUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [impersonationLoading, setImpersonationLoading] = useState<number | null>(null);
  const isSystemAdmin = currentUser?.tenant_id == null && !!currentUser;
  const currentTenantId = currentUser?.tenant_id ?? null;

  const listState = useListManager<UsersFilters, UsersSortBy>({
    initialFilters: { role: "", status: "" },
    initialSortBy: "created_at",
    initialSortOrder: "asc",
    initialRowsPerPage: 10,
    initialPage: 0,
    initialSearch: "",
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, roleItems] = await Promise.all([
        userService.getAllUsers(),
        roleService.getSelectableRoles(),
      ]);
      setUsers(mapUsers(usersData as UserResponse[]));
      setAllRoles(roleItems);
    } catch (err: unknown) {
      const errorObject = err as { message?: string; detail?: string };
      setError(errorObject.message || errorObject.detail || "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    const selected = listState.filters.role;
    if (!selected || allRoles.length === 0) return;
    const activeCodes = new Set(
      allRoles.map((r: { code?: string; name: string }) => r.code || r.name)
    );
    if (!activeCodes.has(selected)) {
      listState.setFilter("role", "");
    }
  }, [allRoles, listState.filters.role, listState.setFilter]);

  const openDeleteConfirm = useCallback((targetUser: AuthUser) => {
    setUserToDelete(targetUser);
    setConfirmDialogOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setConfirmDialogOpen(false);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      await userService.deleteUser(userToDelete.id);
      setConfirmDialogOpen(false);
      setUserToDelete(null);
      setSnackbar("User deleted successfully.");
      await fetchUsers();
    } catch (err: unknown) {
      const errorObject = err as { message?: string; detail?: string };
      setError(errorObject.message || errorObject.detail || "Failed to delete user.");
    } finally {
      setDeleteLoading(false);
    }
  }, [fetchUsers, userToDelete]);

  const loginAsUser = useCallback(
    async (userId: number) => {
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) {
        enqueueSnackbar("Selected user not found", { variant: "error" });
        return;
      }
      if (!targetUser.is_active) {
        enqueueSnackbar("Cannot login as inactive user", { variant: "error" });
        return;
      }
      if (!isSystemAdmin && currentTenantId !== null && targetUser.tenant_id !== currentTenantId) {
        enqueueSnackbar("You can only login as users from your tenant", { variant: "error" });
        return;
      }
      try {
        setImpersonationLoading(userId);
        const response = await authService.impersonate(userId);
        applyLoginContextResponse(response);
        enqueueSnackbar("Logged in as user successfully", { variant: "success" });
        navigate("/");
      } catch (err) {
        console.error("Failed to login as user:", err);
        enqueueSnackbar("Failed to login as user", { variant: "error" });
      } finally {
        setImpersonationLoading(null);
      }
    },
    [applyLoginContextResponse, currentTenantId, isSystemAdmin, navigate, users]
  );

  const uniqueRoles = useMemo(
    () => Array.from(new Set(users.map((u) => u.role).filter(Boolean))),
    [users]
  );

  const roleFilterOptions = useMemo(() => {
    if (allRoles.length > 0) {
      return allRoles
        .filter(
          (r: { is_deleted?: boolean; is_active?: boolean }) =>
            !r.is_deleted && r.is_active !== false
        )
        .map((r: { name: string; code?: string }) => ({
          label: r.name,
          value: r.code || r.name,
        }));
    }
    // Fallback if role fetch fails
    return uniqueRoles.map(role => {
      return {
        label: role
          .toLowerCase()
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        value: role
      };
    });
  }, [allRoles, uniqueRoles]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesTenant =
        isSystemAdmin || (currentTenantId !== null && u.tenant_id === currentTenantId);
      const matchesSearch =
        u.full_name.toLowerCase().includes(listState.search.toLowerCase()) ||
        u.email.toLowerCase().includes(listState.search.toLowerCase()) ||
        String(u.id).includes(listState.search);
      const matchesRole =
        listState.filters.role === "" || u.role === listState.filters.role;
      const matchesStatus =
        listState.filters.status === "" ||
        (listState.filters.status === "Active" && u.is_active) ||
        (listState.filters.status === "Inactive" && !u.is_active);
      return matchesTenant && matchesSearch && matchesRole && matchesStatus;
    });
  }, [currentTenantId, isSystemAdmin, listState.filters.role, listState.filters.status, listState.search, users]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aVal: number | string = a.full_name;
      let bVal: number | string = b.full_name;

      if (listState.sortBy === "created_at") {
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else if (listState.sortBy === "name") {
        aVal = a.full_name.toLowerCase();
        bVal = b.full_name.toLowerCase();
      }

      if (aVal < bVal) return listState.sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return listState.sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, listState.sortBy, listState.sortOrder]);

  const paginatedUsers = useMemo(
    () =>
      sortedUsers.slice(
        listState.page * listState.rowsPerPage,
        (listState.page + 1) * listState.rowsPerPage
      ),
    [listState.page, listState.rowsPerPage, sortedUsers]
  );

  return {
    listState,
    filteredUsers,
    paginatedUsers,
    uniqueRoles,
    roleFilterOptions,
    loading,
    error,
    snackbar,
    fetchUsers,
    dismissError: () => setError(null),
    closeSnackbar: () => setSnackbar(null),
    confirmDialogOpen,
    deleteLoading,
    impersonationLoading,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    loginAsUser,
  };
}
