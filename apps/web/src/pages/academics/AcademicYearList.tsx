/**
 * Academic Year List Page - Display and manage academic years
 * Provides listing, search, and CRUD operations for academic years
 * Integrates RBAC for academic management permissions
 */

import { Alert, Snackbar } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import { ListPageLayout, ListPageToolbar, EntityTableSection } from "../../components/reusable";
import { type AcademicYear } from "../../api/services/academicYearService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useAcademicYearListController } from "../../hooks/useAcademicYearListController";
import { createAcademicYearListConfig } from "./AcademicYearList.listConfig";

const AcademicYearList = () => {
  const navigate = useNavigate();
  const controller = useAcademicYearListController();

  const listConfig = createAcademicYearListConfig({
    navigate,
    onDeleteClick: controller.handleDeleteClick,
  });

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <PageHeader
          links={[{ title: "Academic Years", path: "#" }]}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={controller.search}
              onSearchChange={controller.setSearch}
              searchPlaceholder="Search academic years..."
              onAddClick={() => navigate("/academic-years/new")}
              addLabel="Add Academic Year"
              addIcon={<AddIcon sx={{ fontSize: 24 }} />}
            />
          }
        />
      }
    >
      {controller.error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => controller.setError?.(null)}>
          {controller.error}
        </Alert>
      )}

      <EntityTableSection<AcademicYear>
        label="Academic Years"
        totalRows={controller.totalRows}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={controller.setRowsPerPage}
        columns={listConfig.columns}
        data={controller.data}
        loading={controller.loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        rowActions={listConfig.actions.rowActions}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={controller.confirmDialogOpen}
        title="Delete Academic Year?"
        message={`Are you sure you want to delete ${controller.entityToDelete?.name}?`}
        confirmText={controller.deleteLoading ? "Deleting..." : "Delete"}
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
        <Alert onClose={() => controller.setSuccess(null)} severity="success" sx={{ width: "100%" }}>
          {controller.success}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

export default AcademicYearList;
