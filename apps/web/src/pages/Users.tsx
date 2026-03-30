/**
 * Users Management Page - Manage application users and their roles
 * Displays user list with search, filtering, and CRUD operations
 * Integrates RBAC for user management permissions
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { User as AuthUser } from "../types/auth";
import ConfirmDialog from "../components/semantic/ConfirmDialog";
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
import { createUsersListConfig } from "./Users.listConfig";

// ═══════════════════════════════════════════════════════════════════════════
// Users Management Page Component
// ═══════════════════════════════════════════════════════════════════════════
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
        navigate,
        onDeleteClick: openDeleteConfirm,
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
                filters={[
                  {
                    label: "Role",
                    value: filters.role,
                    onChange: (val) => setFilter("role", val),
                    options: [
                      { label: "All", value: "All" },
                      ...uniqueRoles.map((role) => ({ label: toRoleLabel(role), value: role }))
                    ]
                  },
                  {
                    label: "Status",
                    value: filters.status,
                    onChange: (val) => setFilter("status", val),
                    options: [
                      { label: "All", value: "All" },
                      { label: "Active", value: "Active" },
                      { label: "Inactive", value: "Inactive" }
                    ]
                  },
                  {
                    label: "Sort by Name",
                    value: sortBy === "name" ? sortOrder : "",
                    onChange: (val) => {
                      if (val) {
                        setSortBy("name");
                        setSortOrder(val as "asc" | "desc");
                      } else {
                        setSortBy("created_at");
                        setSortOrder("desc");
                      }
                    },
                    options: [
                      { label: "A-Z", value: "asc" },
                      { label: "Z-A", value: "desc" },
                    ]
                  },
                  {
                    label: "Sort by Date",
                    value: sortBy === "created_at" ? sortOrder : "",
                    onChange: (val) => {
                      if (val) {
                        setSortBy("created_at");
                        setSortOrder(val as "asc" | "desc");
                      }
                    },
                    options: [
                      { label: "Newest First", value: "desc" },
                      { label: "Oldest First", value: "asc" },
                    ]
                  }
                ]}
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
        confirmLabel={deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={confirmDelete}
        onClose={closeDeleteConfirm}
        loading={deleteLoading}
      />
    </ListPageLayout>
  );
};

export default Users;
