/**
 * Academic Year List Page - Display and manage academic years
 * Provides listing, search, and CRUD operations for academic years
 * Integrates RBAC for academic management permissions
 */

import { Alert, Snackbar } from "../../components/primitives";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../../components/reusable";
import TableRowActions from "../../components/reusable/TableRowActions";
import { type AcademicYear } from "../../api/services/academicYearService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useAcademicYearListController } from "../../hooks/useAcademicYearListController";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { createAcademicYearListConfig } from "./AcademicYearList.listConfig";

const AcademicYearList = () => {
  const navigate = useNavigate();
  const controller = useAcademicYearListController();
  const { buildListBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();

  const breadcrumbLinks = buildListBreadcrumbs("Academic Years");

  const listConfig = createAcademicYearListConfig({
    navigate: navigateWithConfigHub,
    onDeleteClick: controller.handleDeleteClick,
  });

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
              searchPlaceholder="Search academic years..."
              onAddClick={() => navigateWithConfigHub("/academic-years/new")}
              addLabel="Add Academic Year"
              addIcon={<AddIcon sx={{ fontSize: 24 }} />}
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

      <EntityTableSection<AcademicYear>
        label="Academic Years"
        showInfoBar={false}
        totalRows={controller.totalRows}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={controller.setRowsPerPage}
        columns={listConfig.columns}
        data={controller.data}
        loading={controller.loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        renderRowActions={(row) => {
          const actions = listConfig.actions.rowActions(row);
          return actions ? <TableRowActions {...actions} /> : null;
        }}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={controller.confirmDialogOpen}
        title="Please Confirm"
        message="Are you sure you want to delete this academic year?"
        confirmText={controller.deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={controller.handleConfirmDelete}
        onCancel={() => controller.setConfirmDialogOpen(false)}
        loading={controller.deleteLoading}
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
};

export default AcademicYearList;
