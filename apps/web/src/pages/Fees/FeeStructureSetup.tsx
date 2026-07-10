import React from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Alert,
  Snackbar,
} from "@mui/material";
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
import { useFeeStructureListController } from "../../hooks/useFeeStructureListController";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { createFeeStructureListConfig } from "./FeeStructureList.listConfig";

const FeeStructureSetup = () => {
  const navigate = useNavigate();
  const controller = useFeeStructureListController();
  const { buildListBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();

  const breadcrumbLinks = buildListBreadcrumbs("Fee Structure Setup");

  const config = createFeeStructureListConfig({
    navigate: navigateWithConfigHub,
    onDeleteClick: controller.handleDeleteClick,
  });

  const rangeStart =
    controller.totalRecords > 0
      ? controller.listState.page * controller.listState.rowsPerPage + 1
      : 0;
  const rangeEnd = Math.min(
    (controller.listState.page + 1) * controller.listState.rowsPerPage,
    controller.totalRecords
  );

  const showPagination =
    !controller.loading &&
    controller.totalRecords > controller.listState.rowsPerPage;

  return (
    <ListPageLayout
      header={
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
              onAddClick={() => navigateWithConfigHub("/fees/setup/add")}
              addLabel="Setup Fee"
              searchPlaceholder="Search by class..."
            />
          }
        />
      }
    >
      {controller.error && (
        <Alert
          severity="error"
          sx={{ m: 1, borderRadius: 2 }}
          onClose={() => controller.setError(null)}
        >
          {controller.error}
        </Alert>
      )}

      <DirectoryInfoBar
        label={config.uiPolicy.title}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={controller.totalRecords}
      />
      <DataTable
        columns={config.columns}
        data={controller.structures}
        loading={controller.loading}
        emptyMessage={config.uiPolicy.emptyMessage}
        renderRowActions={(s) => (
          <TableRowActions
            onEdit={() => config.rowActions.onEdit(s)}
            onDelete={() => config.rowActions.onDelete(s)}
          />
        )}
      />
      {showPagination && (
        <TablePaginationBar
          page={controller.listState.page}
          rowsPerPage={controller.listState.rowsPerPage}
          totalRows={controller.totalRecords}
          onPageChange={controller.listState.setPage}
          onRowsPerPageChange={controller.listState.onRowsPerPageChange}
        />
      )}

      <ConfirmDialog
        open={controller.confirmOpen}
        title="Delete Fee Structure?"
        message="This will remove your defined structure. Are you sure you want to continue?"
        confirmText="Delete"
        onConfirm={controller.handleConfirmDelete}
        onCancel={() => controller.setConfirmOpen(false)}
        loading={controller.deleteLoading}
      />
    </ListPageLayout>
  );
};

export default FeeStructureSetup;
