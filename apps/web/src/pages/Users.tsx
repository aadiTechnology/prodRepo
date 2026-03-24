import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { User as AuthUser } from "../types/auth";
import ConfirmDialog from "../components/common/ConfirmDialog";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../components/reusable";
import { PageHeader } from "../components/layout";
import { Box, Typography, Button, Select, MenuItem } from "../components/primitives";
import { useAuth } from "../context/AuthContext";
import { useUsersListController } from "../hooks";
import { toRoleLabel } from "../utils/formatters";
import { createUsersListConfig } from "./Users.config";

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

  const listConfig = useMemo(
    () =>
      createUsersListConfig({
        onAddUser: () => navigate("/user/create"),
        onEditUser: (tableUser: AuthUser) =>
          navigate("/user/create", { state: { user: tableUser, isEdit: true } }),
        onDeleteUser: openDeleteConfirm,
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
