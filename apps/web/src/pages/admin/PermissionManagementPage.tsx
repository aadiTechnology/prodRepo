/**
 * Permission Management Page
 * Manage role-based menu permissions
 * Fully token-aware and architecture-compliant list page
 */

import { useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
} from "@mui/material";
import { PageHeader } from "../../components/layout";
import { ListPageLayout, EntityTableSection, ListPageToolbar } from "../../components/reusable";
import { FormHeaderIconAction } from "../../components/primitives";
import { usePermissionListController, PermissionTableRow } from "../../hooks/usePermissionListController";
import { createPermissionListConfig } from "./PermissionManagementPage.listConfig";

/* ═══════════════════════════════════════════════════════════════════════════
   PERMISSION MANAGEMENT PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const PermissionManagementPage = () => {
  const controller = usePermissionListController();

  // ── Table Configuration ──────────────────────────────────────────────────
  const columnConfig = useMemo(
    () =>
      createPermissionListConfig({
        canEdit: controller.canEdit,
        selectedRole: controller.selectedRole,
        allRows: controller.allRows,
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
      controller.allRows,
      controller.expandedModuleIds,
      controller.permissions,
      controller.handlePermChange,
      controller.handleMasterToggle,
      controller.toggleModule,
      controller.handleSelectAllModules,
    ]
  );

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
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
                    onChange: (val) => controller.handleRoleChange(parseInt(val || "0")),
                    options: controller.roles.map((r) => ({
                      label: r.name,
                      value: r.id.toString(),
                    })),
                  },
                ]}
                renderActions={
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    {/* Reset Button */}
                    <FormHeaderIconAction
                      variant="cancel"
                      tooltipTitle="Reset Changes"
                      onClick={controller.handleReset}
                      disabled={!controller.selectedRole || !controller.hasChanges || controller.loadingSave}
                    />

                    {/* Save Button */}
                    <FormHeaderIconAction
                      variant="save"
                      tooltipTitle="Save Permissions"
                      onClick={controller.handleSave}
                      disabled={!controller.selectedRole || !controller.hasChanges || !controller.canEdit}
                      loading={controller.loadingSave}
                    />
                  </Box>
                }
              />
            }
          />

          {controller.error && (
            <Box sx={{ mx: 2, mb: 1, mt: 1 }}>
              <Alert
                severity="error"
                onClose={() => controller.setError(null)}
                sx={{ borderRadius: "12px" }}
              >
                {controller.error}
              </Alert>
            </Box>
          )}
        </>
      }
    >
      {/* Permission Table Section */}
      {(!controller.loadingRoles || controller.allRows.length > 0) && (
        <Box
          sx={{
            opacity: controller.selectedRole ? 1 : 0.6,
            pointerEvents: controller.selectedRole ? "auto" : "none",
          }}
        >
          <EntityTableSection<PermissionTableRow>
            label="Permission Directory"
            totalRows={controller.allRows.length}
            page={controller.page}
            rowsPerPage={controller.rowsPerPage}
            onPageChange={controller.handlePageChange}
            onRowsPerPageChange={controller.handleRowsPerPageChange}
            columns={columnConfig.columns}
            data={controller.paginatedRows}
            loading={controller.loadingMenus}
            stickyHeader
            size="small"
          />
        </Box>
      )}

      {controller.loadingRoles && (
        <Box sx={{ mx: 2, py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Loading roles...
          </Typography>
        </Box>
      )}

      {controller.selectedRole && controller.loadingMenus && (
        <Box sx={{ mx: 2, py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Loading permissions...
          </Typography>
        </Box>
      )}

      {/* Error Snackbar */}
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

      {/* Success Snackbar */}
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
    </ListPageLayout>
  );
};

export default PermissionManagementPage;
