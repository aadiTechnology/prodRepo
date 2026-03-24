import { useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useTenantListController } from "../../hooks";
import { createTenantListConfig, renderTenantRowActions } from "./TenantList.listConfig";

const TenantList = () => {
  const navigate = useNavigate();
  const { user, applyLoginContextResponse } = useAuth();
  const {
    listState: {
      search,
      onSearchChange,
      page,
      setPage,
      rowsPerPage,
      onRowsPerPageChange,
      sortBy,
      setSortBy,
      sortOrder,
      setSortOrder,
    },
    sortedTenants,
    totalTenants,
    loading,
    error,
    snackbar,
    fetchTenants,
    closeSnackbar,
    confirmDialogOpen,
    tenantToDelete,
    deleteLoading,
    impersonationLoading,
    isSystemAdmin,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    loginAsTenant,
  } = useTenantListController({
    currentUser: user,
    navigate,
    applyLoginContextResponse,
  });

  const listConfig = useMemo(
    () =>
      createTenantListConfig({
        navigate,
        onDeleteClick: openDeleteConfirm,
        onLoginAsTenant: loginAsTenant,
        isSystemAdmin,
        impersonationLoading,
      }),
    [impersonationLoading, isSystemAdmin, loginAsTenant, navigate, openDeleteConfirm]
  );

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "Tenant Management", path: "#" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={search}
                onSearchChange={onSearchChange}
                searchPlaceholder="Search tenants..."
                onAddClick={() => navigate("/tenants/add")}
                addLabel="Add Tenant"
                renderActions={
                  <>
                    <Typography component="span" variant="body2" sx={{ whiteSpace: "nowrap" }}>
                      Sort:
                    </Typography>
                    <Select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [s, o] = (e.target.value as string).split("-") as [
                          typeof sortBy,
                          typeof sortOrder
                        ];
                        setSortBy(s);
                        setSortOrder(o);
                      }}
                      size="small"
                      sx={(theme) => ({ minWidth: theme.spacing(18) })}
                    >
                      {listConfig.sortOptions.map((opt) => (
                        <MenuItem key={opt.id} value={`${opt.sortBy}-${opt.sortOrder}`}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                }
              />
            }
          />
          {error && (
            <Box sx={{ m: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => void fetchTenants()}
                disabled={loading}
              >
                {listConfig.uiPolicy.retryLabel}
              </Button>
            </Box>
          )}
        </>
      }
    >
      <EntityTableSection
        label="Tenant Directory"
        totalRows={totalTenants}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={onRowsPerPageChange}
        columns={listConfig.columns}
        data={sortedTenants}
        loading={loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        renderRowActions={(row) =>
          renderTenantRowActions({
            row,
            isSystemAdmin,
            impersonationLoading,
            onEdit: () => navigate(`/tenants/${row.id}/edit`),
            onDelete: () => openDeleteConfirm(row),
            onLoginAsTenant: loginAsTenant,
          })
        }
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message={`Are you sure you want to delete tenant ${tenantToDelete?.name}?`}
        confirmText={deleteLoading ? "Deleting..." : "Confirm"}
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
        loading={deleteLoading}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={closeSnackbar}
      >
        <Alert onClose={closeSnackbar} severity="success" sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

export default TenantList;
