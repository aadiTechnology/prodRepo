import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { User as AuthUser } from "../types/auth";
import type { UserResponse } from "../types/user";
import userService from "../api/services/userService";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { ListPageLayout, ListPageToolbar, DirectoryInfoBar, DataTable, TableRowActions, TablePaginationBar } from "../components/reusable";
import { PageHeader } from "../components/layout";
import StatusChip from "../components/roles/StatusChip";
import { Home as HomeIcon } from "@mui/icons-material";
import { Box, Typography, Button, Select, MenuItem } from "../components/primitives";

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'delete' | 'edit' | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // Filter users by search, role, and status
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      String(u.id).includes(search);

    const matchesRole = roleFilter === "All" || u.role === roleFilter;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && u.is_active) ||
      (statusFilter === "Inactive" && !u.is_active);

    return matchesSearch && matchesRole && matchesStatus;
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

  const rangeStart = filteredUsers.length > 0 ? Math.min(page * rowsPerPage + 1, filteredUsers.length) : 0;
  const rangeEnd = Math.min((page + 1) * rowsPerPage, filteredUsers.length);

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
            title="User Management"
            onBack={() => navigate("/")}
            backIcon={<HomeIcon sx={(theme) => ({ fontSize: theme.typography.h6.fontSize })} />}
            actions={
              <ListPageToolbar
                searchValue={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  setPage(0);
                }}
                searchPlaceholder="Search Name"
                onAddClick={() => navigate("/user/create")}
                addLabel="Add User"
                renderActions={
                  <>
                    <Typography component="span" variant="body2" sx={{ whiteSpace: "nowrap" }}>
                      Role:
                    </Typography>
                    <Select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as string)}
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
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as string)}
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
      {!loading && filteredUsers.length > 0 && (
        <DirectoryInfoBar
          label="User Directory"
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={filteredUsers.length}
        />
      )}
      <DataTable<AuthUser & Record<string, unknown>>
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
        renderRowActions={(user) => (
          <TableRowActions
            onEdit={() => navigate("/user/create", { state: { user, isEdit: true } })}
            onDelete={() => handleDeleteClick(user)}
          />
        )}
        stickyHeader
        size="small"
      />
      {!loading && filteredUsers.length > 0 && (
        <TablePaginationBar
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={filteredUsers.length}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(0);
          }}
        />
      )}

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
