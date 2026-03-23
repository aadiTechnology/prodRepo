import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { User as AuthUser } from "../types/auth";
import type { UserResponse } from "../types/user";
import userService from "../api/services/userService";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../components/reusable";
import { PageHeader } from "../components/layout";
import StatusChip from "../components/roles/StatusChip";
import { Box, Typography, Button, Select, MenuItem } from "../components/primitives";
import { useAuth } from "../context/AuthContext";
import { useListManager } from "../hooks";

const Users = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'delete' | 'edit' | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const {
    search,
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
  } = useListManager<{ role: string; status: string }, 'name' | 'created_at'>({
    initialFilters: { role: "All", status: "All" },
    initialSortBy: "created_at",
    initialSortOrder: "asc",
    initialRowsPerPage: 10,
    initialPage: 0,
    initialSearch: "",
  });

  // --- Success Toast Handler ---
  const showSuccessToast = (message: string) => setSnackbar(message);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      const mappedUsers: AuthUser[] = (data as UserResponse[]).map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : "Unknown",
        tenant_id: u.tenant_id ?? null,
        phone_number: u.phone_number ?? null,
        is_active: u.is_active ?? true,
        created_at: u.created_at,
      }));
      setUsers(mappedUsers);
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
    if (!snackbar) return;
    const timer = setTimeout(() => setSnackbar(null), 3000);
    return () => clearTimeout(timer);
  }, [snackbar]);

  const handleDeleteClick = (user: AuthUser) => {
    setUserToDelete(user);
    setConfirmDialogType('delete');
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      await userService.deleteUser(userToDelete.id);
      setConfirmDialogOpen(false);
      setUserToDelete(null);
      showSuccessToast("User deleted successfully");
      fetchUsers();
    } catch (err: unknown) {
      const errorObject = err as { message?: string; detail?: string };
      setError(errorObject.message || errorObject.detail || "Failed to delete user.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Get unique roles for filter dropdown
  const uniqueRoles = Array.from(new Set(users.map((u) => u.role).filter(Boolean)));

  const isSystemAdmin = user?.tenant_id == null && !!user;
  const currentTenantId = user?.tenant_id ?? null;

  // Filter users by tenant, search, role, and status
  const filteredUsers = users.filter((u) => {
    const matchesTenant = isSystemAdmin || (currentTenantId !== null && u.tenant_id === currentTenantId);
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      String(u.id).includes(search);

    const matchesRole = filters.role === "All" || u.role === filters.role;

    const matchesStatus =
      filters.status === "All" ||
      (filters.status === "Active" && u.is_active) ||
      (filters.status === "Inactive" && !u.is_active);

    return matchesTenant && matchesSearch && matchesRole && matchesStatus;
  });

  // Sort all filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal: number | string = a.full_name;
    let bVal: number | string = b.full_name;

    if (sortBy === 'created_at') {
      aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
      bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
    } else if (sortBy === 'name') {
      aVal = a.full_name.toLowerCase();
      bVal = b.full_name.toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Get paginated users from sorted results
  const paginatedUsers = sortedUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const userColumns = useMemo(
    () => [
      { id: "full_name", label: "Full Name" as const, field: "full_name" as const, render: (u: AuthUser) => u.full_name },
      { id: "email", label: "Email" as const, field: "email" as const },
      { id: "phone_number", label: "Phone Number" as const, render: (u: AuthUser) => u.phone_number || "-" },
      {
        id: "role",
        label: "Role" as const,
        render: (u: AuthUser) => (u.role ? u.role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) : "Unknown"),
      },
      {
        id: "status",
        label: "Status" as const,
        render: (u: AuthUser) => <StatusChip status={u.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
      {
        id: "created_at",
        label: "Created Date" as const,
        render: (u: AuthUser) =>
          u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "-",
      },
    ],
    []
  );

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "User Management", path: "#" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={search}
                onSearchChange={onSearchChange}
                searchPlaceholder="Search Name"
                onAddClick={() => navigate("/user/create")}
                addLabel="Add User"
                renderActions={
                  <>
                    <Typography component="span" variant="body2" sx={{ whiteSpace: "nowrap" }}>
                      Role:
                    </Typography>
                    <Select
                      value={filters.role}
                      onChange={(e) => setFilter("role", e.target.value as string)}
                      size="small"
                      sx={(theme) => ({ minWidth: theme.spacing(16) })}
                    >
                      <MenuItem value="All">All</MenuItem>
                      {uniqueRoles.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography component="span" variant="body2" sx={{ whiteSpace: "nowrap" }}>
                      Status:
                    </Typography>
                    <Select
                      value={filters.status}
                      onChange={(e) => setFilter("status", e.target.value as string)}
                      size="small"
                      sx={(theme) => ({ minWidth: theme.spacing(16) })}
                    >
                      <MenuItem value="All">All</MenuItem>
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                    </Select>
                    <Typography component="span" variant="body2" sx={{ whiteSpace: "nowrap" }}>
                      Sort:
                    </Typography>
                    <Select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [s, o] = (e.target.value as string).split("-") as [typeof sortBy, typeof sortOrder];
                        setSortBy(s);
                        setSortOrder(o);
                      }}
                      size="small"
                      sx={(theme) => ({ minWidth: theme.spacing(18) })}
                    >
                      <MenuItem value="name-asc">Name (A-Z)</MenuItem>
                      <MenuItem value="name-desc">Name (Z-A)</MenuItem>
                      <MenuItem value="created_at-desc">Date (newest)</MenuItem>
                      <MenuItem value="created_at-asc">Date (oldest)</MenuItem>
                    </Select>
                  </>
                }
              />
            }
          />
          {error && (
            <Box sx={{ m: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={fetchUsers}
                disabled={loading}
              >
                Retry
              </Button>
            </Box>
          )}
          {snackbar && (
            <Box sx={{ m: 2, display: "flex", justifyContent: "center" }}>
              <Typography variant="body2" color="success.main">
                {snackbar}
              </Typography>
            </Box>
          )}
        </>
      }
    >
      <EntityTableSection<AuthUser & Record<string, unknown>>
        label="User Directory"
        totalRows={filteredUsers.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={onRowsPerPageChange}
        columns={userColumns}
        data={paginatedUsers as (AuthUser & Record<string, unknown>)[]}
        loading={loading}
        emptyMessage={
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No users available.
            </Typography>
            <Button variant="contained" color="primary" onClick={() => navigate("/user/create")}>
              Add User
            </Button>
          </Box>
        }
        rowActions={(user) => ({
          onEdit: () => navigate("/user/create", { state: { user, isEdit: true } }),
          onDelete: () => handleDeleteClick(user),
        })}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message={confirmDialogType === "delete" ? "Are you sure you want to delete user?" : confirmDialogType === "edit" ? "Are you sure you want to update this user?" : ""}
        confirmText={deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={confirmDialogType === "delete" ? handleConfirmDelete : () => setConfirmDialogOpen(false)}
        onCancel={() => setConfirmDialogOpen(false)}
        loading={deleteLoading}
      />
    </ListPageLayout>
  );
};

export default Users;
