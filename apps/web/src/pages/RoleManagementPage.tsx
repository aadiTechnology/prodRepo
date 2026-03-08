import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Home as HomeIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Role } from "../types/role.types";
import roleService from "../api/services/roleService";
import { ListPageLayout } from "../components/reusable";
import { ListPageToolbar } from "../components/reusable";
import { DirectoryInfoBar } from "../components/reusable";
import { TablePaginationBar } from "../components/reusable";
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

        <TableContainer sx={{ maxHeight: "calc(100vh - 200px)" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
              <CircularProgress sx={{ color: "#1a1a2e" }} />
            </Box>
          ) : (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e", cursor: 'pointer' }}
                    onClick={() => {
                      if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('name'); setSortOrder('asc'); }
                    }}
                  >
                    Role Name {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Status</TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e", cursor: 'pointer' }}
                    onClick={() => {
                      if (sortBy === 'createdAt') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('createdAt'); setSortOrder('asc'); }
                    }}
                  >
                    Created Date {sortBy === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Edit</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        No roles available.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRoles.map((role) => (
                    <TableRow
                      key={role.id}
                      hover
                      sx={{
                        "&.MuiTableRow-hover:hover": { bgcolor: "#f1f5f9" },
                        "& td": { borderBottom: "1px solid #f1f5f9" }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: "#1a1a2e", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                        {role.name}
                      </TableCell>
                      <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>{role.description}</TableCell>
                      <TableCell sx={{ py: 0.8, px: 2 }}>
                        <Box sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1.2,
                          py: 0.35,
                          borderRadius: "20px",
                          bgcolor: role.status === "ACTIVE" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          color: role.status === "ACTIVE" ? "#059669" : "#dc2626",
                          border: `1px solid ${role.status === "ACTIVE" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                        }}>
                          <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "currentColor" }} />
                          <Typography sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {role.status === "ACTIVE" ? "Active" : "Inactive"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                        {role.createdAt && !isNaN(new Date(role.createdAt).getTime())
                          ? new Date(role.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric'
                            })
                          : "-"}
                      </TableCell>
                      <TableCell sx={{ py: 0.8, px: 2 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/roles/create?id=${role.id}`)}
                            sx={{
                              color: "#94a3b8",
                              "&:hover": { color: "#1713eaff" }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ py: 0.9, px: 2 }}>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(role)}
                            sx={{
                              color: "#94a3b8",
                              "&:hover": { color: "#ef4444" }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
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