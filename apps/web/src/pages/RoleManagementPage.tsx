import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Home as HomeIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Role } from "../types/role.types";
import roleService from "../api/services/roleService";
import { ListPageLayout, ListPageToolbar, DirectoryInfoBar, TablePaginationBar, DataTable, TableRowActions } from "../components/reusable";
import { PageHeader } from "../components/layout";
import ConfirmDialog from "../components/common/ConfirmDialog";

const RoleManagementPage = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRoles, setTotalRoles] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'delete' | 'edit' | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  // --- Success Toast Handler ---
  const showSuccessToast = (message: string) => setSnackbar(message);

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roleService.getRoles({
        search: search || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
        sortBy: sortBy === 'createdAt' ? 'created_at' : sortBy,
        sortOrder,
      });
      // Map backend fields to Role type
      const mappedRoles = (data.items ?? []).map((role: any) => ({
        ...role,
        status: role.is_active ? "ACTIVE" : "INACTIVE",
        createdAt: role.created_at,
      }));
      setRoles(mappedRoles);
      setTotalRoles(data.totalCount);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch roles.");
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRoles();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchRoles]);

  // No local sorting; roles are sorted by backend
  const sortedRoles = roles;

  const roleColumns = useMemo(
    () => [
      { id: "name", label: "Role Name" as const, field: "name" as keyof Role, render: (r: Role) => r.name },
      { id: "description", label: "Description" as const, field: "description" as keyof Role },
      {
        id: "status",
        label: "Status" as const,
        render: (r: Role) => (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              px: 1.2,
              py: 0.35,
              borderRadius: "20px",
              bgcolor: r.status === "ACTIVE" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              color: r.status === "ACTIVE" ? "#059669" : "#dc2626",
              border: `1px solid ${r.status === "ACTIVE" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
            }}
          >
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "currentColor" }} />
            <Typography sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {r.status === "ACTIVE" ? "Active" : "Inactive"}
            </Typography>
          </Box>
        ),
      },
      {
        id: "createdAt",
        label: "Created Date" as const,
        render: (r: Role) =>
          r.createdAt && !isNaN(new Date(r.createdAt).getTime())
            ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
            : "-",
      },
    ],
    []
  );

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setConfirmDialogType('delete');
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      setDeleteLoading(true);
      await roleService.deactivateRole(roleToDelete.id);
      setConfirmDialogOpen(false);
      setRoleToDelete(null);
      showSuccessToast("Role deleted successfully");
      fetchRoles();
    } catch (err: any) {
      setError(err?.message || "Failed to delete role.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmMessage = confirmDialogType === "delete"
    ? "Are you sure you want to delete role?"
    : confirmDialogType === "edit"
      ? "Are you sure you want to update this role?"
      : "";

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <PageHeader
          title="Role Management"
          onBack={() => navigate("/")}
          backIcon={<HomeIcon sx={{ color: "white", fontSize: 24 }} />}
          actions={
            <ListPageToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search roles..."
              onAddClick={() => navigate("/roles/create")}
              addLabel="Add Role"
              addIcon={<AddIcon sx={{ fontSize: 24 }} />}
            />
          }
        />
      }
    >
      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!loading && totalRoles > 0 && (
        <DirectoryInfoBar
          label="Role Directory"
          rangeStart={Math.min(page * rowsPerPage + 1, totalRoles)}
          rangeEnd={Math.min((page + 1) * rowsPerPage, totalRoles)}
          total={totalRoles}
        />
      )}

        <DataTable<Role & Record<string, unknown>>
          columns={roleColumns}
          data={sortedRoles as (Role & Record<string, unknown>)[]}
          loading={loading}
          emptyMessage="No roles available."
          renderRowActions={(role) => (
            <TableRowActions
              onEdit={() => navigate(`/roles/create?id=${role.id}`)}
              onDelete={() => handleDeleteClick(role)}
            />
          )}
          stickyHeader
          size="small"
          maxHeight="calc(100vh - 200px)"
        />
      {!loading && roles.length > 0 && (
        <TablePaginationBar
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={totalRoles}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(0);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message={confirmMessage}
        confirmText={deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={confirmDialogType === "delete" ? handleConfirmDelete : () => setConfirmDialogOpen(false)}
        onCancel={() => setConfirmDialogOpen(false)}
        loading={deleteLoading}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

export default RoleManagementPage;