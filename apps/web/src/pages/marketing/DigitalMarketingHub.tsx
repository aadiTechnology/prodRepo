import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Snackbar } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

import ConfirmDialog from "../../components/common/ConfirmDialog";
import { PageHeader } from "../../components/layout";
import { EntityTableSection, ListPageLayout, ListPageToolbar } from "../../components/reusable";
import { useDigitalMarketingHubController } from "../../hooks/useDigitalMarketingHubController";
import { createMarketingHubListConfig } from "./DigitalMarketingHub.listConfig";
import type { MarketingHubRow } from "./DigitalMarketingHub.listConfig";

const breadcrumbLinks = [
  { title: "Dashboard", path: "/" },
  { title: "Digital Marketing Hub", path: "#" },
];

export default function DigitalMarketingHub() {
  const navigate = useNavigate();
  const controller = useDigitalMarketingHubController();

  const listConfig = useMemo(
    () =>
      createMarketingHubListConfig({
        navigate,
        onDeleteClick: controller.requestDelete,
        onVisit: controller.visitUrl,
      }),
    [navigate, controller.requestDelete, controller.visitUrl]
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
              searchValue={controller.search}
              onSearchChange={controller.setSearch}
              searchPlaceholder="Search platforms..."
              onAddClick={() => navigate("/marketing/hub/new")}
              addLabel="Add Platform"
              addIcon={<AddIcon sx={{ fontSize: 22 }} />}
              filters={[
                {
                  label: "Category",
                  value: controller.categoryFilter,
                  onChange: controller.setCategoryFilter,
                  options: controller.categoryFilterOptions,
                },
                {
                  label: "Status",
                  value: controller.statusFilter,
                  onChange: controller.setStatusFilter,
                  options: controller.statusFilterOptions,
                },
              ]}
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

      <EntityTableSection<MarketingHubRow>
        label="Platform Directory"
        totalRows={controller.filteredPlatforms.length}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={controller.setRowsPerPage}
        columns={listConfig.columns}
        data={controller.paginatedPlatforms}
        loading={controller.loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        rowActions={listConfig.actions.rowActions}
        stickyHeader
        size="small"
        maxHeight="calc(100vh - 200px)"
        showPagination={controller.filteredPlatforms.length > controller.rowsPerPage}
      />

      <ConfirmDialog
        open={!!controller.deleteTarget}
        title="Confirm Delete"
        message={controller.deleteDialogMessage}
        confirmText={controller.deleting ? "Deleting…" : "Delete"}
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
          sx={{ borderRadius: "12px", width: "100%" }}
        >
          {controller.success}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}
