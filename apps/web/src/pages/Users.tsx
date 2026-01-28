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
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, VpnKey as PasswordIcon } from "@mui/icons-material";
import { User, UserCreate, UserUpdate } from "../types/user";
import userService from "../api/services/userService";
import UserForm from "../components/UserForm";
import PermissionGate from "../components/auth/PermissionGate";

function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err?.detail || "Failed to fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = useCallback(async (userData: UserCreate | UserUpdate) => {
    await userService.createUser(userData as UserCreate);
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdate = useCallback(async (userData: UserCreate | UserUpdate) => {
    if (selectedUser) {
      await userService.updateUser(selectedUser.id, userData as UserUpdate);
      fetchUsers();
    }
  }, [selectedUser, fetchUsers]);

  const handleEditClick = useCallback((user: User) => {
    setSelectedUser(user);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback((user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const handlePasswordClick = useCallback((user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setPasswordError(null);
    setPasswordDialogOpen(true);
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

  const handlePasswordChangeConfirm = useCallback(async () => {
    if (!selectedUser) return;

    if (!newPassword.trim()) {
      setPasswordError("New password is required");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError(null);
      await userService.changePassword(selectedUser.id, newPassword.trim());
      setPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    } catch (err: any) {
      setPasswordError(err?.detail || "Failed to change password. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  }, [selectedUser, newPassword]);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setSelectedUser(null);
  }, []);

  // Memoize table rows to prevent unnecessary re-renders
  const tableRows = useMemo(() => {
    if (users.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} align="center">
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No users found. Click "Add User" to create one.
            </Typography>
          </TableCell>
        </TableRow>
      );
    }
    return users.map((user) => (
      <TableRow key={user.id} hover>
        <TableCell>{user.id}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.full_name}</TableCell>
        <TableCell align="right">
          <PermissionGate permission="USER_EDIT">
            <IconButton
              color="primary"
              onClick={() => handleEditClick(user)}
              aria-label="edit"
            >
              <EditIcon />
            </IconButton>
          </PermissionGate>
          <PermissionGate permission="USER_EDIT">
            <IconButton
              color="secondary"
              onClick={() => handlePasswordClick(user)}
              aria-label="change-password"
            >
              <PasswordIcon />
            </IconButton>
          </PermissionGate>
          <PermissionGate permission="USER_DELETE">
            <IconButton
              color="error"
              onClick={() => handleDeleteClick(user)}
              aria-label="delete"
            >
              <DeleteIcon />
            </IconButton>
          </PermissionGate>
        </TableCell>
      </TableRow>
    ));
  }, [users, handleEditClick, handleDeleteClick]);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Users Management</Typography>
        <PermissionGate permission="USER_CREATE">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedUser(null);
              setFormOpen(true);
            }}
          >
            Add User
          </Button>
        </PermissionGate>
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
              <TableRow>
                <TableCell><strong>ID</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Full Name</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UserForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={selectedUser ? handleUpdate : handleCreate}
        user={selectedUser}
        isEdit={!!selectedUser}
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
        open={passwordDialogOpen}
        onClose={() => !passwordLoading && setPasswordDialogOpen(false)}
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <DialogContentText>
              Set a new password for user <strong>{selectedUser?.email}</strong>.
            </DialogContentText>
            {passwordError && (
              <Alert severity="error" onClose={() => setPasswordError(null)}>
                {passwordError}
              </Alert>
            )}
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordError(null);
              }}
              fullWidth
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)} disabled={passwordLoading}>
            Cancel
          </Button>
          <Button
            onClick={handlePasswordChangeConfirm}
            variant="contained"
            disabled={passwordLoading}
          >
            {passwordLoading ? "Saving..." : "Change Password"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Users;
