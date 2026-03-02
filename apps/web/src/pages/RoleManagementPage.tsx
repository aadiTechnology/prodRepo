

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Paper,
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
  TextField,
  TablePagination,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";
import { Role } from "../types/role.types";
import roleService from "../api/services/roleService";

const RoleManagementPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRoles, setTotalRoles] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roleService.getRoles({
        search: search || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
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
  }, [search, page, rowsPerPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRoles();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchRoles]);

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      setDeleteLoading(true);
      // Assuming deleteRole exists in roleService
      await roleService.deactivateRole(roleToDelete.id);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (err: any) {
      setError(err?.message || "Failed to delete role.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box sx={{
      p: 2,
      pt: 0,
      minHeight: "100vh",
      backgroundColor: "#f5f6fa",
      color: "#1a1a2e"
    }}>
      <Box sx={{
        pt: 2,
        pb: 1.5,
        px: 0,
        mb: 1.5,
        mt: 0,
      }}>
        <Box sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton
              onClick={() => navigate("/")}
              sx={{
                backgroundColor: "#1a1a2e",
                p: 1,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "&:hover": { backgroundColor: "#2d2d44" }
              }}
            >
              <HomeIcon sx={{ color: "white", fontSize: 24 }} />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "22px", color: "#64748b" }}>
              Role Management
            </Typography>
          </Box>
          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            width: { xs: "100%", sm: "auto" }
          }}>
            <TextField
              placeholder="Search by Role Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth={isMobile}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: "100%", sm: "300px" },
                "& .MuiOutlinedInput-root": {
                  bgcolor: "white",
                  borderRadius: "8px",
                  "& fieldset": { borderColor: "#cbd5e1" },
                  "&:hover fieldset": { borderColor: "#94a3b8" },
                }
              }}
            />
            <Tooltip title="Add Role">
              <IconButton
                onClick={() => navigate("/roles/create")}
                sx={{
                  color: "#1a1a2e",
                  flexShrink: 0,
                  "&:hover": { bgcolor: "rgba(26, 26, 46, 0.04)" }
                }}
              >
                <AddIcon sx={{ fontSize: 32, border: "2px solid #1a1a2e", borderRadius: "50%", p: 0.2 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
      <Paper sx={{
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
        bgcolor: "white"
      }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
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
                                    <TableCell sx={{ fontWeight: 700, color: "#f0f3f8", fontSize: "0.80rem", px: 2, bgcolor: "#1a1a2e" }}>Role Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f0f3f8", fontSize: "0.80rem", px: 2, bgcolor: "#1a1a2e" }}>Description</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f0f3f8", fontSize: "0.80rem", px: 2, bgcolor: "#1a1a2e" }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f0f3f8", fontSize: "0.80rem", px: 2, bgcolor: "#1a1a2e" }}>Created Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f0f3f8", fontSize: "0.80rem", px: 2, bgcolor: "#1a1a2e" }}>Edit</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#f0f3f8", fontSize: "0.80rem", px: 2, bgcolor: "#1a1a2e" }}>Delete</TableCell>
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
                  roles.map((role) => (
                    <TableRow key={role.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, color: "#1a1a2e", py: 0.6, px: 2 }}>
                        {role.name}
                      </TableCell>
                      <TableCell sx={{ color: "#64748b", py: 0.6, px: 2 }}>{role.description}</TableCell>
                      <TableCell sx={{ py: 0.6, px: 2 }}>
                        <Typography sx={{
                          fontWeight: 600,
                          fontSize: "0.80rem",
                          color: role.status === "ACTIVE" ? "#10b981" : "#ef4444"
                        }}>
                          {role.status === "ACTIVE" ? "Active" : "Inactive"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: "#64748b", py: 0.6, px: 2 }}>
                        {role.createdAt && !isNaN(new Date(role.createdAt).getTime())
                          ? new Date(role.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric'
                            })
                          : "-"}
                      </TableCell>
                      <TableCell sx={{ py: 0.6, px: 2 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/roles/${role.id}`)}
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
        <TablePagination
          component="div"
          count={totalRoles}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            const newRowsPerPage = parseInt(e.target.value, 10);
            setRowsPerPage(newRowsPerPage);
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
          sx={{ px: 2, borderTop: "1px solid #e2e8f0" }}
        />
      </Paper>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3, width: "100%", maxWidth: 450 }
        }}
      >
        <DialogTitle sx={{ fontWeight: "700", color: "error.main" }}>
          Confirm Role Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>{roleToDelete?.name}</strong>?
          </DialogContentText>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            This is a <strong>Soft Delete</strong>. The role will be removed from the list,
            and <strong>all associated permissions</strong> will be deactivated immediately.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {deleteLoading ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default RoleManagementPage;