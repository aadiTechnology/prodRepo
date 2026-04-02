import React from "react";
import { Alert, Snackbar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { PageHeader } from "../../components/layout";
import {
  ListPageLayout,
  ListPageToolbar,
  DirectoryInfoBar,
  DataTable,
  TableRowActions,
  TablePaginationBar,
} from "../../components/reusable";
import { useFeeCategoryListController } from "../../hooks/useFeeCategoryListController";
import { createFeeCategoryListConfig } from "./FeeCategoryList.listConfig";

const FeeCategoryManagement = () => {
  const navigate = useNavigate();
  const controller = useFeeCategoryListController();

  const config = createFeeCategoryListConfig({
    navigate,
    onDeleteClick: controller.handleDeleteClick,
  });

  const rangeStart =
    controller.filteredCategories.length > 0
      ? controller.listState.page * controller.listState.rowsPerPage + 1
      : 0;
  const rangeEnd = Math.min(
    (controller.listState.page + 1) * controller.listState.rowsPerPage,
    controller.filteredCategories.length
  );

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "Fee Category Management", path: "#" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={controller.listState.search}
                onSearchChange={controller.listState.setSearch}
                searchPlaceholder="Search Category"
                onAddClick={() => navigate("/fees/categories/add")}
                addLabel="Add Category"
              />
            }
          />
          {controller.error && (
            <Alert
              severity="error"
              sx={{ m: 1, borderRadius: 2, py: 0.5 }}
              onClose={() => controller.setError(null)}
            >
              {controller.error}
            </Alert>
          )}
        </>
      }
      pageBackground={true}
    >
      {!controller.loading && controller.filteredCategories.length > 0 && (
        <DirectoryInfoBar
          label={config.uiPolicy.title}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={controller.filteredCategories.length}
        />
      )}
      <DataTable
        columns={config.columns}
        data={controller.paginatedCategories}
        loading={controller.loading}
        emptyMessage={config.uiPolicy.emptyMessage}
        renderRowActions={(cat) => (
          <TableRowActions
            onEdit={() => config.rowActions.onEdit(cat)}
            onDelete={() => config.rowActions.onDelete(cat)}
          />
        )}
        stickyHeader
        size="small"
      />
      {!controller.loading && controller.filteredCategories.length > 0 && (
        <TablePaginationBar
          page={controller.listState.page}
          rowsPerPage={controller.listState.rowsPerPage}
          totalRows={controller.filteredCategories.length}
          onPageChange={controller.listState.setPage}
          onRowsPerPageChange={controller.listState.onRowsPerPageChange}
        />
      )}

      <ConfirmDialog
        open={controller.confirmDialogOpen}
        title="Please Confirm"
        message="Are you sure you want to delete this fee category?"
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
          sx={{ width: "100%" }}
        >
          {controller.snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

export default FeeCategoryManagement;
