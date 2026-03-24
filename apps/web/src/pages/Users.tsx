import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { User as AuthUser } from "../types/auth";
import ConfirmDialog from "../components/common/ConfirmDialog";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
  type ListConfig,
} from "../components/reusable";
import { PageHeader } from "../components/layout";
import StatusChip from "../components/roles/StatusChip";
import { Box, Typography, Button, Select, MenuItem } from "../components/primitives";
import { useAuth } from "../context/AuthContext";
import { useUsersListController, type UsersSortBy } from "../hooks";
import { formatShortDate, toRoleLabel } from "../utils/formatters";

const Users = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    listState: {
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
    },
    filteredUsers,
    paginatedUsers,
    uniqueRoles,
    loading,
    error,
    snackbar,
    fetchUsers,
    confirmDialogOpen,
    deleteLoading,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
  } = useUsersListController({ currentUser: user });

  const listConfig = useMemo<ListConfig<AuthUser, UsersSortBy>>(
    () => ({
      columns: [
        { id: "full_name", label: "Full Name", field: "full_name", render: (u) => u.full_name },
        { id: "email", label: "Email", field: "email" },
        { id: "phone_number", label: "Phone Number", render: (u) => u.phone_number || "-" },
        { id: "role", label: "Role", render: (u) => toRoleLabel(u.role) },
        {
          id: "status",
          label: "Status",
          render: (u) => <StatusChip status={u.is_active ? "ACTIVE" : "INACTIVE"} />,
        },
        {
          id: "created_at",
          label: "Created Date",
          render: (u) => formatShortDate(u.created_at),
        },
      ],
      sortOptions: [
        { id: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" },
        { id: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" },
        { id: "created-desc", label: "Date (newest)", sortBy: "created_at", sortOrder: "desc" },
        { id: "created-asc", label: "Date (oldest)", sortBy: "created_at", sortOrder: "asc" },
      ],
      uiPolicy: {
        emptyMessage: (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No users available.
            </Typography>
            <Button variant="contained" color="primary" onClick={() => navigate("/user/create")}>
              Add User
            </Button>
          </Box>
        ),
        errorFallbackMessage: "Failed to fetch users.",
        retryLabel: "Retry",
      },
      actions: {
        rowActions: (tableUser) => ({
          onEdit: () => navigate("/user/create", { state: { user: tableUser, isEdit: true } }),
          onDelete: () => openDeleteConfirm(tableUser),
        }),
      },
    }),
    [navigate, openDeleteConfirm]
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
                          {toRoleLabel(role)}
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
                      {listConfig.sortOptions.map((opt) => (
                        <MenuItem key={opt.id} value={`${opt.sortBy}-${opt.sortOrder}`}>
                          {opt.label}
                        </MenuItem>
                      ))}
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
                {listConfig.uiPolicy.retryLabel}
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
      <EntityTableSection<AuthUser>
        label="User Directory"
        totalRows={filteredUsers.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={onRowsPerPageChange}
        columns={listConfig.columns}
        data={paginatedUsers}
        loading={loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        rowActions={listConfig.actions.rowActions}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message="Are you sure you want to delete user?"
        confirmText={deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
        loading={deleteLoading}
      />
    </ListPageLayout>
  );
};

export default Users;
