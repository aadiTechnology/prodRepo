import React from "react";
import { Alert, Snackbar, Select, MenuItem, Typography } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const controller = useFeeCategoryListController();

  const fromConfigHub = location.state?.fromConfigHub;

  const breadcrumbLinks = fromConfigHub
    ? [
        { title: "Basic Configuration", path: "/configuration" },
        { title: "Fee Category Management", path: "#" },
      ]
    : [{ title: "Fee Category Management", path: "#" }];

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
            links={breadcrumbLinks}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={controller.listState.search}
                onSearchChange={controller.listState.setSearch}
                renderActions={
                  <>
                    <Select
                      value={controller.listState.filters.academicYearId}
                      onChange={(e) =>
                        controller.listState.setFilter("academicYearId", e.target.value as string)
                      }
                      displayEmpty
                      size="small"
                      sx={{
                        minWidth: { xs: "100%", sm: 180 },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "15px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <Typography variant="body2" color="text.secondary">
                          Academic Year
                        </Typography>
                      </MenuItem>
                      {controller.academicYears.map((ay) => (
                        <MenuItem key={ay.id} value={ay.id.toString()}>
                          {ay.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select
                      value={controller.listState.filters.className}
                      onChange={(e) =>
                        controller.listState.setFilter("className", e.target.value as string)
                      }
                      displayEmpty
                      size="small"
                      sx={{
                        minWidth: { xs: "100%", sm: 180 },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "15px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <Typography variant="body2" color="text.secondary">
                          Class
                        </Typography>
                      </MenuItem>
                      {controller.uniqueClasses.map((cls) => (
                        <MenuItem key={cls.id} value={cls.name}>
                          {cls.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                }
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
          variant="filled"
          sx={{ width: "100%", borderRadius: "12px" }}
        >
          {controller.snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

export default FeeCategoryManagement;
