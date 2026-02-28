import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
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
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Grid,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { Role, RoleCreate, RoleUpdate } from "../types/role";
import { MenuItem } from "../types/menu";
import roleService from "../api/services/roleService";
import menuService from "../api/services/menuService";
import rbacService from "../api/services/rbacService";
import { DataTable, Column } from "../components/common";

const PAGE_PADDING = 32;
const SECTION_GAP = 24;
const PAGE_TITLE_STYLE = { fontSize: 20, fontWeight: 600, color: "#1E293B" };
const SECTION_TITLE_STYLE = { fontSize: 16, fontWeight: 600 };
const FIELD_LABEL_STYLE = { fontSize: 14, fontWeight: 500 };
const HELPER_TEXT_STYLE = { fontSize: 12 };
const ERROR_TEXT_STYLE = { fontSize: 12, color: "#DC2626" };

function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [allMenus, setAllMenus] = useState<MenuItem[]>([]);
  const [roleMenuIds, setRoleMenuIds] = useState<Set<number>>(new Set());
  const [menuSaveLoading, setMenuSaveLoading] = useState(false);

  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsSystem, setFormIsSystem] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to fetch roles.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleCreate = useCallback(async () => {
    setFormError(null);
    if (!formCode.trim()) {
      setFormError("Code is required.");
      return;
    }
    if (!formName.trim()) {
      setFormError("Name is required.");
      return;
    }
    try {
      const data: RoleCreate = {
        code: formCode.trim(),
        name: formName.trim(),
        description: formDescription.trim() || null,
        is_system: formIsSystem,
        is_active: formIsActive,
      };
      await roleService.createRole(data);
      setFormOpen(false);
      resetForm();
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to create role.";
      setFormError(msg);
    }
  }, [formCode, formName, formDescription, formIsSystem, formIsActive, fetchRoles]);

  const handleUpdate = useCallback(async () => {
    if (!selectedRole) return;
    setFormError(null);
    if (!formName.trim()) {
      setFormError("Name is required.");
      return;
    }
    try {
      const data: RoleUpdate = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        is_active: formIsActive,
      };
      await roleService.updateRole(selectedRole.id, data);
      setFormOpen(false);
      setSelectedRole(null);
      resetForm();
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to update role.";
      setFormError(msg);
    }
  }, [selectedRole, formName, formDescription, formIsActive, fetchRoles]);

  function resetForm() {
    setFormCode("");
    setFormName("");
    setFormDescription("");
    setFormIsSystem(false);
    setFormIsActive(true);
    setFormError(null);
  }

  const handleEditClick = useCallback((role: Role) => {
    setSelectedRole(role);
    setFormCode(role.code);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setFormIsSystem(role.is_system);
    setFormIsActive(role.is_active);
    setFormError(null);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback((role: Role) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedRole) return;
    try {
      setDeleteLoading(true);
      await roleService.deleteRole(selectedRole.id);
      setDeleteDialogOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to delete role.";
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedRole, fetchRoles]);

  const handleMenuClick = useCallback(async (role: Role) => {
    setSelectedRole(role);
    setMenuDialogOpen(true);
    setMenuLoading(true);
    try {
      const [menusRes, assignedRes] = await Promise.all([
        menuService.getMenus(),
        rbacService.getRoleMenus(role.id),
      ]);
      setAllMenus(menusRes);
      setRoleMenuIds(new Set(assignedRes.map((m) => m.id)));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to load menus.";
      setError(msg);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const toggleMenu = useCallback((menuId: number) => {
    setRoleMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) next.delete(menuId);
      else next.add(menuId);
      return next;
    });
  }, []);

  const handleMenuSave = useCallback(async () => {
    if (!selectedRole) return;
    try {
      setMenuSaveLoading(true);
      await rbacService.setRoleMenus(selectedRole.id, Array.from(roleMenuIds));
      setMenuDialogOpen(false);
      setSelectedRole(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save menu assignment.";
      setError(msg);
    } finally {
      setMenuSaveLoading(false);
    }
  }, [selectedRole, roleMenuIds]);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setSelectedRole(null);
    resetForm();
  }, []);

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return s;
    }
  };

  const roleColumns: Column<Role>[] = useMemo(
    () => [
      { id: "id", label: "ID", width: 64 },
      { id: "code", label: "Code" },
      { id: "name", label: "Name" },
      {
        id: "description",
        label: "Description",
        renderCell: (row) => row.description ?? "—",
      },
      {
        id: "is_system",
        label: "System",
        align: "center",
        renderCell: (row) => (row.is_system ? "Yes" : "No"),
      },
      {
        id: "is_active",
        label: "Active",
        align: "center",
        renderCell: (row) => (row.is_active ? "Yes" : "No"),
      },
      {
        id: "created_at",
        label: "Created At",
        renderCell: (row) => formatDate(row.created_at),
      },
      {
        id: "edit",
        label: "Edit",
        align: "center",
        renderCell: (row) => (
          <IconButton
            color="primary"
            onClick={() => handleEditClick(row)}
            aria-label="edit"
            size="small"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        ),
      },
      {
        id: "menu",
        label: "Menu",
        align: "center",
        renderCell: (row) => (
          <IconButton
            color="primary"
            onClick={() => handleMenuClick(row)}
            aria-label="manage-menus"
            size="small"
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        ),
      },
      {
        id: "delete",
        label: "Delete",
        align: "center",
        renderCell: (row) => (
          <IconButton
            color="error"
            onClick={() => handleDeleteClick(row)}
            aria-label="delete"
            size="small"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [handleEditClick, handleMenuClick, handleDeleteClick]
  );

  return (
    <Grid sx={{ px: { xs: 1, sm: 2 }, overflow: 'auto' }}>
      <Box>
        <Typography component="h1" sx={PAGE_TITLE_STYLE}>
          Role Management
        </Typography>
        <Typography sx={{ ...HELPER_TEXT_STYLE, color: "text.secondary", mt: 0.5 }}>
          Manage roles and assign menus to control access.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedRole(null);
                resetForm();
                setFormOpen(true);
              }}
              sx={{ minHeight: 40, borderRadius: 6 }}
            >
              Add Role
            </Button>
          </Box>

          <DataTable<Role>
            columns={roleColumns}
            data={roles}
            isLoading={loading}
            emptyMessage="No roles found. Click 'Add Role' to create one."
            getRowId={(row) => row.id}
          />
      

      {/* Role Create/Edit Dialog */}
      <Dialog open={formOpen} onClose={handleFormClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={SECTION_TITLE_STYLE}>
          {selectedRole ? "Edit Role" : "Add Role"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {formError && (
              <Typography sx={ERROR_TEXT_STYLE}>{formError}</Typography>
            )}
            <TextField
              label="Code"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              disabled={!!selectedRole}
              fullWidth
              required
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { minHeight: 40, borderRadius: 6 } }}
            />
            <TextField
              label="Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              required
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { minHeight: 40, borderRadius: 6 } }}
            />
            <TextField
              label="Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 6 } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formIsSystem}
                  onChange={(e) => setFormIsSystem(e.target.checked)}
                  disabled={!!selectedRole}
                />
              }
              label="System role"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={handleFormClose} sx={{ minHeight: 40, borderRadius: 6 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={selectedRole ? handleUpdate : handleCreate}
            sx={{ minHeight: 40, borderRadius: 6 }}
          >
            {selectedRole ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
      >
        <DialogTitle sx={SECTION_TITLE_STYLE}>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14 }}>
            Are you sure you want to delete role <strong>{selectedRole?.name}</strong>? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
            variant="outlined"
            sx={{ minHeight: 40, borderRadius: 6 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
            sx={{ minHeight: 40, borderRadius: 6 }}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Menus Dialog */}
      <Dialog
        open={menuDialogOpen}
        onClose={() => !menuSaveLoading && setMenuDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={SECTION_TITLE_STYLE}>
          Assign Menus — {selectedRole?.name}
        </DialogTitle>
        <DialogContent>
          {menuLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List
              dense
              sx={{
                maxHeight: 400,
                overflow: "auto",
                borderRadius: 0,
                "& .MuiListItem-root": { borderRadius: 0 },
                "& .MuiListItemButton-root": { borderRadius: 0 },
              }}
            >
              {allMenus.map((menu) => (
                <ListItem key={menu.id} disablePadding sx={{ borderRadius: 0 }}>
                  <ListItemButton onClick={() => toggleMenu(menu.id)} dense sx={{ borderRadius: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={roleMenuIds.has(menu.id)}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                        sx={{ borderRadius: 0 }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={menu.name}
                      secondary={menu.path ? menu.path : undefined}
                      primaryTypographyProps={{ sx: { fontSize: 14 } }}
                      secondaryTypographyProps={{ sx: { fontSize: 12 } }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {allMenus.length === 0 && (
                <Typography sx={HELPER_TEXT_STYLE} color="text.secondary" align="center" py={2}>
                  No menus available.
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setMenuDialogOpen(false)}
            disabled={menuSaveLoading}
            variant="outlined"
            sx={{ minHeight: 40, borderRadius: 6 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMenuSave}
            variant="contained"
            disabled={menuLoading || menuSaveLoading}
            sx={{ minHeight: 40, borderRadius: 6 }}
          >
            {menuSaveLoading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

export default RoleManagement;
