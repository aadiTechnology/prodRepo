import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Add as AddIcon } from "@mui/icons-material";
import { Alert, Snackbar, FormHeaderIconAction } from "../../components/primitives";
import { PageHeader } from "../../components/layout";
import { EntityTableSection, ListPageLayout, ListPageToolbar } from "../../components/reusable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { usePermissionListController } from "../../hooks/usePermissionListController";
import {
  createPermissionListConfig,
  type PermissionTableRow,
} from "./PermissionManagementPage.listConfig";

const breadcrumbLinks = [{ title: "Permission Mapping", path: "#" }];

const emptyMessageNoRole = "Select a role above to view its permissions.";

export default function PermissionManagementPage() {
  const navigate = useNavigate();
  const controller = usePermissionListController();

  const listConfig = useMemo(
    () =>
      createPermissionListConfig({
        navigate,
        canEdit: controller.canEdit,
        isSystemAdmin: controller.isSystemAdmin,
        selectedRole: controller.selectedRole,
        allRows: controller.displayRows,
        expandedModuleIds: controller.expandedModuleIds,
        onPermChange: controller.handlePermChange,
        onMasterToggle: controller.handleMasterToggle,
        onToggleModule: controller.toggleModule,
        onSelectAllModules: controller.handleSelectAllModules,
        onDeleteClick: controller.requestDelete,
      }),
    [
      navigate,
      controller.canEdit,
      controller.isSystemAdmin,
      controller.selectedRole,
      controller.displayRows,
      controller.expandedModuleIds,
      controller.handlePermChange,
      controller.handleMasterToggle,
      controller.toggleModule,
      controller.handleSelectAllModules,
      controller.requestDelete,
    ]
  );

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <PageHeader
          links={breadcrumbLinks}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={controller.searchQuery}
              onSearchChange={controller.setSearchQuery}
              searchPlaceholder="Search modules..."
              actionsAfterSearch
              filters={[
                ...(controller.isSystemAdmin
                  ? [
                      {
                        label: "Tenant",
                        value: controller.selectedTenantId,
                        onChange: controller.handleTenantChange,
                        options: controller.tenantOptions,
                      },
                    ]
                  : []),
                {
                  label: "Role",
                  value: controller.selectedRole?.id?.toString() ?? "",
                  onChange: (val) =>
                    controller.handleRoleChange(parseInt(val || "0", 10)),
                  options: controller.roles.map((role) => ({
                    label: role.name,
                    value: role.id.toString(),
                  })),
                },
              ]}
              renderActions={
                <>
                  <FormHeaderIconAction
                    variant="cancel"
                    tooltipTitle="Reset changes"
                    onClick={controller.handleReset}
                    disabled={
                      !controller.selectedRole ||
                      !controller.hasChanges ||
                      controller.loadingSave
                    }
                  />
                  <FormHeaderIconAction
                    variant="save"
                    tooltipTitle="Save permissions"
                    onClick={controller.handleSave}
                    disabled={
                      !controller.selectedRole ||
                      !controller.hasChanges ||
                      !controller.canEdit
                    }
                    loading={controller.loadingSave}
                  />
                </>
              }
              {...(controller.isSystemAdmin
                ? {
                    onAddClick: () => navigate("/admin/menus/add"),
                    addLabel: "Add Module / Page",
                    addIcon: <AddIcon sx={{ fontSize: 24 }} />,
                  }
                : {})}
            />
          }
        />
      }
    >
      {controller.error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => controller.setError(null)}>
          {controller.error}
        </Alert>
      )}

      <EntityTableSection<PermissionTableRow>
        label="Permission Directory"
        totalRows={controller.displayRows.length}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={controller.setRowsPerPage}
        columns={listConfig.columns}
        data={controller.paginatedRows}
        loading={controller.loading}
        emptyMessage={
          controller.selectedRole
            ? listConfig.uiPolicy.emptyMessage
            : emptyMessageNoRole
        }
        rowActions={listConfig.actions.rowActions}
        stickyHeader
        size="small"
        showPagination={controller.displayRows.length > 0}
      />

      <ConfirmDialog
        open={!!controller.deleteTarget}
        title="Please Confirm"
        message={controller.deleteDialogMessage}
        confirmText={controller.deleting ? "Deleting…" : "Confirm"}
        onConfirm={() => void controller.handleConfirmDelete()}
        onCancel={() => controller.setDeleteTarget(null)}
        loading={controller.deleting}
      />

      <Snackbar
        open={!!controller.success}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => controller.setSuccess(null)}
      >
        <Alert
          onClose={() => controller.setSuccess(null)}
          severity="success"
          variant="filled"
          sx={{ width: "100%", borderRadius: "12px" }}
        >
          {controller.success}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}
