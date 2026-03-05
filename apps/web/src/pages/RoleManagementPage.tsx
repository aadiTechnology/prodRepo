// Style object for confirmation popup divider
const confirmDividerStyle = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: 0,
  height: 0,
};

// Custom snackbar style for success toast
const successSnackbarBoxSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  px: 2.5,
  py: 1.2,
  borderRadius: 3,
  bgcolor: '#2B2B2B',
  boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
  minWidth: 320,
  maxWidth: 425,
  mx: 'auto',
  '& .success-snackbar-icon': {
    width: 32,
    height: 32,
    borderRadius: '50%',
    bgcolor: '#4CAF50',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  '& .success-snackbar-text': {
    color: 'white',
    fontWeight: 600,
    fontSize: '1.08rem',
    letterSpacing: 0.1,
  },
};

import { useState, useEffect, useCallback } from "react";
import {
  Box,
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
  DialogActions,
  Snackbar,
  DialogContentText,
} from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";
import { Role } from "../types/role.types";
import roleService from "../api/services/roleService";
import { Button, Select, MenuItem } from "@mui/material";

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

  return (
    <Box sx={{
      px: { xs: 2, md: 4 },
      pb: 4,
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header - Aligned with TenantList */}
      <Box sx={{ pt: 1.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={() => navigate("/")}
            sx={{
              backgroundColor: "#1a1a2e",
              borderRadius: 1.2,
              width: 44,
              height: 44,
              "&:hover": { backgroundColor: "#2d2d44" }
            }}
          >
            <HomeIcon sx={{ color: "white", fontSize: 24 }} />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "22px", color: "#1A1A2E", letterSpacing: "-1px" }}>
            Role Management
          </Typography>
        </Box>
        {/* Actions Row */}
        <Box sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          width: { xs: "100%", sm: "auto" }
        }}>
          <TextField
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth={isMobile}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: "100%", sm: "280px" },
              "& .MuiOutlinedInput-root": {
                bgcolor: "white",
                borderRadius: "12px",
                fontSize: "0.9rem",
                fontWeight: 500,
                "& fieldset": { borderColor: "#e2e8f0", borderWidth: "1.2px" },
                "&:hover fieldset": { borderColor: "#cbd5e1" },
                "&.Mui-focused": {
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
                  "& fieldset": { borderColor: "#1A1A2E", borderWidth: "1.8px" },
                }
              }
            }}
          />
          <Tooltip title="Add Role">
            <IconButton
              onClick={() => navigate("/roles/create")}
              sx={{
                backgroundColor: "#1a1a2e",
                color: "white",
                borderRadius: 1.2,
                width: 44,
                height: 44,
                boxShadow: "0 4px 10px rgba(26,26,46,0.2)",
                "&:hover": { backgroundColor: "#2d2d44", transform: "translateY(-1px)" }
              }}
            >
              <AddIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Paper sx={{
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.01)",
        border: "1px solid #e2e8f0",
        bgcolor: "white",
        flexGrow: 1,
        display: "flex",
        flexDirection: "column"
      }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Info Bar */}
        {!loading && totalRoles > 0 && (
          <Box sx={{ py: 1.2, px: 3, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", bgcolor: "#fcfdfe" }}>
            <Typography sx={{ fontSize: "0.80rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Role Directory
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>
              Showing <Box component="span" sx={{ color: "#1a1a2e", fontWeight: 700 }}>{Math.min(page * rowsPerPage + 1, totalRoles)}-{Math.min((page + 1) * rowsPerPage, totalRoles)}</Box> of <Box component="span" sx={{ color: "#1a1a2e", fontWeight: 700 }}>{totalRoles}</Box> roles
            </Typography>
          </Box>
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
        {/* Custom Pagination Footer */}
        {!loading && roles.length > 0 && (
          <Box sx={{
            px: 2,
            py: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #f1f5f9",
            bgcolor: "#fcfdfe"
          }}>
            {/* Left: Rows Per Page */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                Rows per page
              </Typography>
              <Select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                size="small"
                sx={{
                  height: "28px",
                  width: "65px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  bgcolor: "white",
                  borderRadius: "6px",
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: "#e2e8f0" },
                }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </Box>
            {/* Right: Page Navigation */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                <Box component="span" sx={{ color: "#1a1a2e" }}>{page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalRoles)}</Box> of <Box component="span" sx={{ color: "#1a1a2e" }}>{totalRoles}</Box>
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <IconButton
                  size="small"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  sx={{ border: "1px solid #e2e8f0", borderRadius: "6px", p: 0.4, "&:hover": { bgcolor: "#f1f5f9" } }}
                >
                  <Box component="span" sx={{ fontSize: '1.1rem' }}>{'<'}</Box>
                </IconButton>
                <IconButton
                  size="small"
                  disabled={page >= Math.ceil(totalRoles / rowsPerPage) - 1}
                  onClick={() => setPage(page + 1)}
                  sx={{ border: "1px solid #e2e8f0", borderRadius: "6px", p: 0.4, "&:hover": { bgcolor: "#f1f5f9" } }}
                >
                  <Box component="span" sx={{ fontSize: '1.1rem' }}>{'>'}</Box>
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !deleteLoading && setConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxWidth: 600,
            width: '100%',
            p: 0,
            position: 'absolute',
            top: '5%',
            left: '50%',
            transform: 'translate(-50%, 0)',
            height: '30%', // Reduced height by 50%
            minHeight: '20px', // Optional: ensure minimum usability
            overflowY: 'auto',
          }
        }}
      >
        {/* Header bar with title and close icon */}
        <Box sx={{
          bgcolor: '#18183a',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          px: 2,
          py: 0.10,
          minHeight: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
        }}>
          <Box />
          <IconButton
            aria-label="close"
            onClick={() => setConfirmDialogOpen(false)}
            disabled={deleteLoading}
            sx={{ color: 'white', bgcolor: 'transparent', borderRadius: 2 }}
          >
            <CancelIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Box>
        {/* Message, check icon, and buttons area */}
        <Box sx={{ px: 4, pt: 4, pb: 2.5, bgcolor: 'white', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, textAlign: 'left' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <CheckIcon sx={{ fontSize: 50, color: '#43a047', mr: 2, p: 0 }} />
            <Typography sx={{ fontWeight: 175, fontSize: '1.9rem', color: '#18183a', letterSpacing: '-1px', lineHeight: 1.1 }}>
              Please Confirm
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '1.05rem', color: '#18183a', fontWeight: 125, mb: 1.2, ml: 3 }}>
            {confirmDialogType === 'delete'
              ? 'Are you sure you want to delete role?'
              : confirmDialogType === 'edit'
                ? 'Are you sure you want to update this role?'
                : ''}
          </Typography>
          <Box sx={{ width: '100%', mb: 0.5 }}>
            <hr style={confirmDividerStyle} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, width: '100%', mt: 0.5 }}>
            <Button
              onClick={() => setConfirmDialogOpen(false)}
              disabled={deleteLoading}
              sx={{
                color: '#ef4444',
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                px: 4,
                borderRadius: 0,
                minWidth: 120,
                boxShadow: 'none',
                border: 'none',
                '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDialogType === 'delete' ? handleConfirmDelete : undefined}
              disabled={deleteLoading}
              sx={{
                color: '#43a047',
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                px: 4,
                borderRadius: 0,
                minWidth: 120,
                boxShadow: 'none',
                border: 'none',
                '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
              }}
            >
              {deleteLoading ? "Deleting..." : "Confirm"}
            </Button>
          </Box>
        </Box>
      </Dialog>
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={() => setSnackbar(null)}
      >
        <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: '100%' }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box >
  );
};

export default RoleManagementPage;