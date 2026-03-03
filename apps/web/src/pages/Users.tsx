import { useState, useEffect, useCallback, useMemo } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputBase,
  Stack,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Visibility as VisibilityIcon, MoreVert as MoreVertIcon } from "@mui/icons-material";
import { UserCreate, UserUpdate } from "../types/user";
import { User } from "../types/auth";
import userService from "../api/services/userService";
import PermissionGate from "../components/auth/PermissionGate";
import { Chip, Tooltip } from "@mui/material";
import UserForm from "../components/UserForm";
import { Block as BlockIcon } from "@mui/icons-material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useNavigate } from "react-router-dom";

function Users() {
  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  // All state hooks at the top!
  // Removed duplicate selectedUser declaration
  // Removed duplicate users declaration
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  // Add User dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const navigate = useNavigate();

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
      }));
      setUsers(mappedUsers);
    } catch (err: any) {
      setError(err?.detail || "Failed to fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = useCallback((user: User) => {
    navigate(`/create-user`, { state: { user, isEdit: true } });
  }, [navigate]);

  const handleDeleteClick = useCallback((user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (selectedUser) {
      try {
        setDeleteLoading(true);
        await userService.deleteUser(selectedUser.id);
        setDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } catch (err: any) {
        setError(err?.detail || "Failed to delete user. Please try again.");
      } finally {
        setDeleteLoading(false);
      }
    }
  }, [selectedUser, fetchUsers]);

  const handleDeactivateClick = useCallback((user: User) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  }, []);

  const handleDeactivateConfirm = useCallback(async () => {
    if (selectedUser) {
      try {
        setDeactivateLoading(true);
        await userService.updateUser(selectedUser.id, {
          full_name: selectedUser.full_name,
          phone_number: selectedUser.phone_number ?? null,
          tenant_id: selectedUser.tenant_id ?? null,
          is_active: false,
        });
        setDeactivateDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } catch (err) {
        setError("Failed to deactivate user.");
      } finally {
        setDeactivateLoading(false);
      }
    }
  }, [selectedUser, fetchUsers]);

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuUser(null);
  };

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        String(u.id).includes(search)
    );
  }, [users, search]);

  // Memoize table rows to prevent unnecessary re-renders
  const tableRows = useMemo(() => {
    if (filteredUsers.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} align="center">
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No users found. Click "Add User" to create one.
            </Typography>
          </TableCell>
        </TableRow>
      );
    }
    return filteredUsers.map((user) => (
      <TableRow key={user.id} hover sx={{ height: 64, "&:hover": { background: "#F3F4F6" } }}>
        <TableCell>{user.id}</TableCell>
        <TableCell>{user.full_name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Chip
            label={user.role ? user.role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) : "Unknown"}
            color="primary"
            variant="outlined"
          />
        </TableCell>
        <TableCell>
          <Chip
            label={user.is_active ? "Active" : "Inactive"}
            color={user.is_active ? "success" : "default"}
            sx={{ fontWeight: 600 }}
          />
        </TableCell>
        <TableCell align="right">
          <IconButton onClick={e => handleMenuOpen(e, user)}>
            <MoreVertIcon />
          </IconButton>
        </TableCell>
      </TableRow>
    ));
  }, [filteredUsers, handleEditClick, handleDeleteClick, handleDeactivateClick]);

  return (
    <Box>
      {/* Header with stats, search, and add user */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Stack direction="row" spacing={3}>
          <Paper sx={{ p: 2, minWidth: 180, textAlign: "center" }}>
            <Typography variant="h6">Total Users</Typography>
            <Typography variant="h4" color="primary">{users.length}</Typography>
          </Paper>
          {/* Add more stats cards here if needed */}
        </Stack>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Paper
            component="form"
            sx={{
              p: "2px 8px",
              display: "flex",
              alignItems: "center",
              width: 300,
              borderRadius: 2,
              boxShadow: "none",
              background: "#F3F4F6",
            }}
            onSubmit={e => e.preventDefault()}
          >
            <SearchIcon sx={{ color: "#64748b", mr: 1 }} />
            <InputBase
              placeholder="Search by name, email, or ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ flex: 1, fontSize: 16 }}
            />
          </Paper>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/user/create")}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ background: "#F3F4F6", height: 56 }}>
                <TableCell><strong>ID</strong></TableCell>
                <TableCell><strong>Full Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      

      {/* Add User modal */}
      <UserForm
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={async (data) => {
          try {
            // Only pass UserCreate type
            await userService.createUser(data as UserCreate);
            setAddDialogOpen(false);
            fetchUsers();
          } catch (err: any) {
            setError(err?.detail || "Failed to create user. Please try again.");
          }
        }}
        isEdit={false}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user <strong>{selectedUser?.email}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deactivateDialogOpen}
        onClose={() => !deactivateLoading && setDeactivateDialogOpen(false)}
      >
        <DialogTitle>Confirm Deactivate</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to deactivate this user{" "}
            <strong>{selectedUser?.email}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialogOpen(false)} disabled={deactivateLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeactivateConfirm}
            color="warning"
            variant="contained"
            disabled={deactivateLoading}
          >
            {deactivateLoading ? "Deactivating..." : "Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleEditClick(menuUser!); handleMenuClose(); }}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => { handleDeactivateClick(menuUser!); handleMenuClose(); }}>
          <BlockIcon sx={{ mr: 1 }} /> Deactivate
        </MenuItem>
        <MenuItem onClick={() => { handleDeleteClick(menuUser!); handleMenuClose(); }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Users;
