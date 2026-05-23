/**
 * Role Management Page - Manage application roles and permissions
 * Displays list of roles with create, edit, and delete operations
 * Integrates RBAC for admin-level permission management
 */

import { Alert, Snackbar } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../components/reusable";
import { PageHeader } from "../components/layout";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useRBAC } from "../context/RBACContext";
import { useRolesListController } from "../hooks/useRolesListController";
import { createRoleListConfig } from "./RoleManagementPage.listConfig";
import { type Role } from "../types/role.types";

const RoleManagementPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useRBAC();

  // Restore permission logic and config creation to component
  const canCreateRole = hasPermission("ADMIN_MGMT:create");
  const canEditRole = hasPermission("ADMIN_MGMT:edit");
  const canDeleteRole = hasPermission("ADMIN_MGMT:delete");

  const controller = useRolesListController();
  const listConfig = createRoleListConfig({
    navigate,
    onDeleteClick: controller.handleDeleteClick,
    canEditRole,
    canDeleteRole,
  });

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <PageHeader
          links={[{ title: "Role Management", path: "#" }]}
          homePath="/"
          actions={
            canCreateRole ? (
              <ListPageToolbar
                searchValue={controller.search}
                onSearchChange={controller.setSearch}
                searchPlaceholder="Search roles..."
                onAddClick={() => navigate("/roles/create")}
                addLabel="Add Role"
                addIcon={<AddIcon sx={{ fontSize: 24 }} />}
              />
            ) : null
          }
        />
      }
    >
      {controller.error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => controller.setError(null)}>
          {controller.error}
        </Alert>
      )}

      <EntityTableSection<Role>
        label="Role Directory"
        totalRows={controller.totalRoles}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={controller.setRowsPerPage}
        columns={listConfig.columns}
        data={controller.roles}
        loading={controller.loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        rowActions={listConfig.actions.rowActions}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={controller.confirmDialogOpen}
        title="Please Confirm"
        message="Are you sure you want to delete role?"
        confirmText={controller.deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={controller.handleConfirmDelete}
        onCancel={() => controller.setConfirmDialogOpen(false)}
        loading={controller.deleteLoading}
      />

      <Snackbar
        open={!!controller.snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => controller.setSnackbar(null)}
      >
        <Alert
          onClose={() => controller.setSnackbar(null)}
          severity="success"
          variant="filled"
          sx={{ width: "100%", borderRadius: "12px" }}
        >
          {controller.snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

export default RoleManagementPage;
