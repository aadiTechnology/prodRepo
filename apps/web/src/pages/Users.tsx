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
  InputAdornment,
  Tooltip,
  Snackbar,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Search as SearchIcon, Delete as DeleteIcon, Home as HomeIcon } from "@mui/icons-material";
import { Button, Select, MenuItem } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";
import { User } from "../types/auth";
import userService from "../api/services/userService";
import ConfirmDialog from "../components/common/ConfirmDialog";

const Users = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'delete' | 'edit' | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // --- Success Toast Handler ---
  const showSuccessToast = (message: string) => setSnackbar(message);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      // Map backend response to ensure all required fields exist
      const mappedUsers: User[] = data.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : "Unknown",
        tenant_id: u.tenant_id ?? null,
        phone_number: u.phone_number ?? null,
        is_active: u.is_active ?? true,
        created_at: u.created_at,
      }));
      setUsers(mappedUsers);
      setTotalUsers(mappedUsers.length);
    } catch (err: any) {
      setError(err?.message || err?.detail || "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setConfirmDialogType('delete');
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      await userService.deleteUser(userToDelete.id);
      setConfirmDialogOpen(false);
      setUserToDelete(null);
      showSuccessToast("User deleted successfully");
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || err?.detail || "Failed to delete user.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Get unique roles for filter dropdown
  const uniqueRoles = Array.from(new Set(users.map(u => u.role).filter(Boolean)));

  // Filter users by search, role, and status
  const filteredUsers = users.filter(
    (u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        String(u.id).includes(search);
      
      const matchesRole = roleFilter === "All" || u.role === roleFilter;
      
      const matchesStatus = statusFilter === "All" ||
        (statusFilter === "Active" && u.is_active) ||
        (statusFilter === "Inactive" && !u.is_active);
      
      return matchesSearch && matchesRole && matchesStatus;
    }
  );

  // Sort all filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal: any = a.full_name;
    let bVal: any = b.full_name;

    if (sortBy === 'created_at') {
      aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
      bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
    } else if (sortBy === 'name') {
      aVal = a.full_name.toLowerCase();
      bVal = b.full_name.toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Get paginated users from sorted results
  const paginatedUsers = sortedUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Box sx={{
      px: { xs: 2, md: 4 },
      pb: 4,
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header - Aligned with RoleManagement */}
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
            User Management
          </Typography>
        </Box>
        {/* Actions Row */}
        <Box sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          width: { xs: "100%", sm: "auto" },
          flexWrap: { xs: "wrap", sm: "nowrap" }
        }}>
          <TextField
            placeholder="Search Name"
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
              width: { xs: "48%", sm: "200px" },
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap" }}>
              Role:
            </Typography>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              size="small"
              sx={{
                width: { xs: "48%", sm: "140px" },
                bgcolor: "white",
                borderRadius: "12px",
                fontSize: "0.9rem",
                fontWeight: 500,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0", borderWidth: "1.2px" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1A1A2E", borderWidth: "1.8px" },
              }}
            >
              <MenuItem value="All">All</MenuItem>
              {uniqueRoles.map((role) => (
                <MenuItem key={role} value={role}>
                  {role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap" }}>
              Status:
            </Typography>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              sx={{
                width: { xs: "48%", sm: "140px" },
                bgcolor: "white",
                borderRadius: "12px",
                fontSize: "0.9rem",
                fontWeight: 500,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0", borderWidth: "1.2px" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1A1A2E", borderWidth: "1.8px" },
              }}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </Box>
          <Tooltip title="Add User">
            <IconButton
              onClick={() => navigate("/user/create")}
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
        {!loading && totalUsers > 0 && (
          <Box sx={{ py: 1.2, px: 3, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", bgcolor: "#fcfdfe" }}>
            <Typography sx={{ fontSize: "0.80rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              User Directory
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 }}>
              Showing <Box component="span" sx={{ color: "#1a1a2e", fontWeight: 700 }}>{filteredUsers.length > 0 ? Math.min(page * rowsPerPage + 1, filteredUsers.length) : 0}-{Math.min((page + 1) * rowsPerPage, filteredUsers.length)}</Box> of <Box component="span" sx={{ color: "#1a1a2e", fontWeight: 700 }}>{filteredUsers.length}</Box> users
            </Typography>
          </Box>
        )}

        <TableContainer sx={{}}>
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
                    Full Name {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Phone Number</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Status</TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e", cursor: 'pointer' }}
                    onClick={() => {
                      if (sortBy === 'created_at') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('created_at'); setSortOrder('asc'); }
                    }}
                  >
                    Created Date {sortBy === 'created_at' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Edit</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.80rem", px: 2, py: 1.2, bgcolor: "#1a1a2e" }}>Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        No users available.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      hover
                      sx={{
                        "&.MuiTableRow-hover:hover": { bgcolor: "#f1f5f9" },
                        "& td": { borderBottom: "1px solid #f1f5f9" }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: "#1a1a2e", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                        {user.full_name}
                      </TableCell>
                      <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>{user.email}</TableCell>
                      <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>{user.phone_number || "-"}</TableCell>
                      <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                        {user.role ? user.role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) : "Unknown"}
                      </TableCell>
                      <TableCell sx={{ py: 0.8, px: 2 }}>
                        <Box sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1.2,
                          py: 0.35,
                          borderRadius: "20px",
                          bgcolor: user.is_active ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          color: user.is_active ? "#059669" : "#dc2626",
                          border: `1px solid ${user.is_active ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                        }}>
                          <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "currentColor" }} />
                          <Typography sx={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: "#475569", py: 0.8, px: 2, fontSize: "0.85rem" }}>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
                          : "-"}
                      </TableCell>
                      <TableCell sx={{ py: 0.8, px: 2 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/user/create`, { state: { user, isEdit: true } })}
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
                            onClick={() => handleDeleteClick(user)}
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
        {!loading && filteredUsers.length > 0 && (
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
                <Box component="span" sx={{ color: "#1a1a2e" }}>{page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalUsers)}</Box> of <Box component="span" sx={{ color: "#1a1a2e" }}>{totalUsers}</Box>
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
                  disabled={page >= Math.ceil(totalUsers / rowsPerPage) - 1}
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

      <ConfirmDialog
        open={confirmDialogOpen}
        title="Please Confirm"
        message={confirmDialogType === "delete" ? "Are you sure you want to delete user?" : confirmDialogType === "edit" ? "Are you sure you want to update this user?" : ""}
        confirmText={deleteLoading ? "Deleting…" : "Confirm"}
        onConfirm={confirmDialogType === "delete" ? handleConfirmDelete : () => setConfirmDialogOpen(false)}
        onCancel={() => setConfirmDialogOpen(false)}
        loading={deleteLoading}
      />
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

export default Users;
