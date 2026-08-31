import React from "react";
import { Typography, Select, MenuItem, Alert } from "@mui/material";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { PageHeader } from "../../components/layout";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../../components/reusable";
import type { FeeStructure } from "../../types/fee";
import { useFeeStructureListController } from "../../hooks/useFeeStructureListController";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { createFeeStructureListConfig } from "./FeeStructureList.listConfig";

const FeeStructureSetup = () => {
  const controller = useFeeStructureListController();
  const { buildListBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();

  const breadcrumbLinks = buildListBreadcrumbs("Fee Structure Setup");

  const config = createFeeStructureListConfig({
    navigate: navigateWithConfigHub,
    onDeleteClick: controller.handleDeleteClick,
  });

  return (
    <ListPageLayout
      onRefresh={() => controller.fetchData({ silent: true })}
      pageBackground
      contentPaddingSize="none"
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

      <EntityTableSection<FeeStructure>
        label="Fee Structures"
        showInfoBar={false}
        totalRows={controller.totalRecords}
        page={controller.listState.page}
        rowsPerPage={controller.listState.rowsPerPage}
        onPageChange={controller.listState.setPage}
        onRowsPerPageChange={controller.listState.onRowsPerPageChange}
        columns={config.columns}
        data={controller.structures}
        loading={controller.loading}
        emptyMessage={config.uiPolicy.emptyMessage}
        rowActions={(structure) => ({
          onEdit: () => config.rowActions.onEdit(structure),
          onDelete: () => config.rowActions.onDelete(structure),
        })}
        stickyHeader
        size="small"
      />

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
