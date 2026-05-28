/**
 * Permission Management Page
 * Manage role-based menu permissions.
 * Fully token-aware and architecture-compliant list page.
 */

import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Snackbar } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { PageHeader } from "../../components/layout";
import {
  ListPageLayout,
  EntityTableSection,
  ListPageToolbar,
  TableRowActions,
} from "../../components/reusable";
import { FormHeaderIconAction } from "../../components/primitives";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import menuService from "../../api/services/menuService";
import {
  usePermissionListController,
  type PermissionTableRow,
} from "../../hooks/usePermissionListController";
import { createPermissionListConfig } from "./PermissionManagementPage.listConfig";

/* ═══════════════════════════════════════════════════════════════════════════
   PERMISSION MANAGEMENT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

const PermissionManagementPage = () => {
  const controller = usePermissionListController();
  const navigate = useNavigate();

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Row-action handlers ───────────────────────────────────────────────────
  const handleEditMenu = useCallback(
    (id: number) => navigate(`/admin/menus/${id}/edit`),
    [navigate]
  );

  const handleDeleteMenu = useCallback(
    (id: number, name: string) => setDeleteTarget({ id, name }),
    []
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await menuService.deleteMenu(deleteTarget.id);
      controller.setSuccess(`"${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      if (controller.selectedRole) {
        await controller.handleRoleChange(controller.selectedRole.id);
      }
    } catch (err: unknown) {
      controller.setError(
        (err as { message?: string })?.message || "Failed to delete menu."
      );
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, controller]);

  // ── Table column config ────────────────────────────────────────────────────
  const columnConfig = useMemo(
    () =>
      createPermissionListConfig({
        canEdit: controller.canEdit,
        selectedRole: controller.selectedRole,
        allRows: controller.displayRows,
        expandedModuleIds: controller.expandedModuleIds,
        permissions: controller.permissions,
        onPermChange: controller.handlePermChange,
        onMasterToggle: controller.handleMasterToggle,
        onToggleModule: controller.toggleModule,
        onSelectAllModules: controller.handleSelectAllModules,
      }),
    [
      controller.canEdit,
      controller.selectedRole,
      controller.displayRows,
      controller.expandedModuleIds,
      controller.permissions,
      controller.handlePermChange,
      controller.handleMasterToggle,
      controller.toggleModule,
      controller.handleSelectAllModules,
    ]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <>
          <PageHeader
            links={[{ title: "Permission Mapping", path: "#" }]}
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
                    value: controller.selectedRole?.id?.toString() || "",
                    onChange: (val) =>
                      controller.handleRoleChange(parseInt(val || "0")),
                    options: controller.roles.map((r) => ({
                      label: r.name,
                      value: r.id.toString(),
                    })),
                  },
                ]}
                renderActions={
                  <>
                    <FormHeaderIconAction
                      variant="cancel"
                      tooltipTitle="Reset Changes"
                      onClick={controller.handleReset}
                      disabled={
                        !controller.selectedRole ||
                        !controller.hasChanges ||
                        controller.loadingSave
                      }
                    />
                    <FormHeaderIconAction
                      variant="save"
                      tooltipTitle="Save Permissions"
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

          {controller.error && (
            <Alert
              severity="error"
              onClose={() => controller.setError(null)}
              sx={{ mx: 2, mt: 1, mb: 1, borderRadius: "12px" }}
            >
              {controller.error}
            </Alert>
          )}
        </>
      }
    >
      {/* Permission table */}
      <EntityTableSection<PermissionTableRow>
        label="Permission Directory"
        totalRows={controller.displayRows.length}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.handlePageChange}
        onRowsPerPageChange={controller.handleRowsPerPageChange}
        columns={columnConfig.columns}
        data={controller.paginatedRows}
        loading={controller.loadingRoles || controller.loadingMenus}
        emptyMessage={
          !controller.selectedRole
            ? "Select a role above to view its permissions."
            : "No modules found for this role."
        }
        stickyHeader
        size="small"
        renderRowActions={
          controller.isSystemAdmin
            ? (row) => (
                <TableRowActions
                  onEdit={() => handleEditMenu(row.id)}
                  onDelete={() => handleDeleteMenu(row.id, row.name)}
                />
              )
            : undefined
        }
      />

      {/* Error snackbar */}
      <Snackbar
        open={!!controller.error}
        autoHideDuration={6000}
        onClose={() => controller.setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={() => controller.setError(null)}
          sx={{ width: "100%" }}
        >
          {controller.error}
        </Alert>
      </Snackbar>

      {/* Success snackbar */}
      <Snackbar
        open={!!controller.success}
        autoHideDuration={4000}
        onClose={() => controller.setSuccess(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="success"
          onClose={() => controller.setSuccess(null)}
          sx={{ width: "100%" }}
        >
          {controller.success}
        </Alert>
      </Snackbar>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Menu Entry"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => !deleting && setDeleteTarget(null)}
      />
    </ListPageLayout>
  );
};

export default PermissionManagementPage;
