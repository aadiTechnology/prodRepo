import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Add as AddIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";

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
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (!controller.success) return;
    enqueueSnackbar(controller.success, {
      variant: "success",
      autoHideDuration: 3000,
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
    controller.setSuccess(null);
  }, [controller.success, controller.setSuccess, enqueueSnackbar]);

  useEffect(() => {
    if (!controller.error) return;
    enqueueSnackbar(controller.error, {
      variant: "error",
      autoHideDuration: 4000,
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
    controller.setError(null);
  }, [controller.error, controller.setError, enqueueSnackbar]);

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
      onRefresh={() => controller.fetchConfig({ silent: true })}
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
      <EntityTableSection<MarketingHubRow>
        label=""
        showInfoBar={false}
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
        title="Please Confirm"
        message={controller.deleteDialogMessage}
        confirmText={controller.deleting ? "Deleting…" : "Confirm"}
        onConfirm={() => void controller.handleConfirmDelete()}
        onCancel={() => controller.setDeleteTarget(null)}
        loading={controller.deleting}
      />
    </ListPageLayout>
  );
}
