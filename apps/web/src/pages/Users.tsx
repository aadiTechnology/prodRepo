import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Snackbar,
  Select,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { User } from "../types/auth";
import userService from "../api/services/userService";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { ListPageLayout, ListPageToolbar, DirectoryInfoBar, DataTable, TableRowActions, TablePaginationBar } from "../components/reusable";
import { PageHeader } from "../components/layout";
import StatusChip from "../components/roles/StatusChip";
import { Home as HomeIcon } from "@mui/icons-material";

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'delete' | 'edit' | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
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
      // Map backend response to ensure all required fields exist
      const mappedUsers: User[] = data.map((u: any) => ({
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
      setTotalUsers(mappedUsers.length);
    } catch (err: any) {
      setError(err?.message || err?.detail || "Failed to fetch users.");
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

  const handleDeleteClick = (user: User) => {
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
    } catch (err: any) {
      setError(err?.message || err?.detail || "Failed to delete user.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Get unique roles for filter dropdown
  const uniqueRoles = Array.from(new Set(users.map(u => u.role).filter(Boolean)));

  // Filter users by search, role, and status
  const filteredUsers = users.filter(
    (u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        String(u.id).includes(search);
      
      const matchesRole = roleFilter === "All" || u.role === roleFilter;
      
      const matchesStatus = statusFilter === "All" ||
        (statusFilter === "Active" && u.is_active) ||
        (statusFilter === "Inactive" && !u.is_active);
      
      return matchesSearch && matchesRole && matchesStatus;
    }
  );

  // Sort all filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal: any = a.full_name;
    let bVal: any = b.full_name;

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
      { id: "full_name", label: "Full Name" as const, field: "full_name" as const, render: (u: User) => u.full_name },
      { id: "email", label: "Email" as const, field: "email" as const },
      { id: "phone_number", label: "Phone Number" as const, render: (u: User) => u.phone_number || "-" },
      {
        id: "role",
        label: "Role" as const,
        render: (u: User) => (u.role ? u.role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) : "Unknown"),
      },
      {
        id: "status",
        label: "Status" as const,
        render: (u: User) => <StatusChip status={u.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
      {
        id: "created_at",
        label: "Created Date" as const,
        render: (u: User) =>
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
            backIcon={<HomeIcon sx={{ fontSize: 24 }} />}
            actions={
              <ListPageToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search Name"
                onAddClick={() => navigate("/user/create")}
                addLabel="Add User"
                renderActions={
                  <>
                    <Typography component="span" sx={{ fontSize: "0.9rem", fontWeight: 600, whiteSpace: "nowrap" }}>Role:</Typography>
                    <Select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      size="small"
                      sx={{ minWidth: 120, height: 40 }}
                    >
                      <MenuItem value="All">All</MenuItem>
                      {uniqueRoles.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography component="span" sx={{ fontSize: "0.9rem", fontWeight: 600, whiteSpace: "nowrap" }}>Status:</Typography>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      size="small"
                      sx={{ minWidth: 120, height: 40 }}
                    >
                      <MenuItem value="All">All</MenuItem>
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                    </Select>
                    <Typography component="span" sx={{ fontSize: "0.9rem", fontWeight: 600, whiteSpace: "nowrap" }}>Sort:</Typography>
                    <Select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [s, o] = (e.target.value as string).split("-") as [typeof sortBy, typeof sortOrder];
                        setSortBy(s);
                        setSortOrder(o);
                      }}
                      size="small"
                      sx={{ minWidth: 140, height: 40 }}
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
            <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
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
      <DataTable<User & Record<string, unknown>>
        columns={userColumns}
        data={paginatedUsers as (User & Record<string, unknown>)[]}
        loading={loading}
        emptyMessage="No users available."
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
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

export default Users;
