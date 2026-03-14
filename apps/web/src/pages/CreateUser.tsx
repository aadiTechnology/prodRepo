import { useState, useEffect } from "react";
import { Box, Paper, Grid, Switch, Alert, Snackbar, Tooltip, Divider } from "@mui/material";
import { Button, TextField, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment, CircularProgress, Stack, Typography } from "../components/primitives";
import { SaveButton, CancelButton, EmailInput, PasswordInput } from "../components/semantic";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate, useLocation } from "react-router-dom";
import userService from "../api/services/userService";
import { UserCreate } from "../types/user";
import { User } from "../types/auth";
import roleService from "../api/services/roleService";
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import ConfirmDialog from "../components/semantic/ConfirmDialog";
import CommonPageHeader from "../components/common/CommonPageHeader";
import SaveIconButton from "../components/semantic/SaveIconButton";
import CloseIconButton from "../components/semantic/CloseIconButton";

type FormData = {
  email: string;
  full_name: string;
  password: string;
  confirm_password: string;
  role_code: string;
  is_active: boolean;
};

export default function CreateUser() {
  const location = useLocation();
  const locationState = location.state as { user?: User; isEdit?: boolean } | null;
  const isEdit = locationState?.isEdit === true;
  const editUser = locationState?.user ?? null;
  const navigate = useNavigate();

  // UI States
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<React.FormEvent | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState<FormData>({
    email: editUser?.email ?? "",
    full_name: editUser?.full_name ?? "",
    password: "",
    confirm_password: "",
    role_code: editUser?.role ?? "",
    is_active: editUser?.is_active ?? true,
  });

  const [roles, setRoles] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Store original values for edit mode
  const [originalValues, setOriginalValues] = useState<FormData>({
    email: editUser?.email ?? "",
    full_name: editUser?.full_name ?? "",
    password: "",
    confirm_password: "",
    role_code: editUser?.role ?? "",
    is_active: editUser?.is_active ?? true,
  });

  // --- Success Toast Handler ---
  const showSuccessToast = (message: string) => setSnackbar(message);

  // Fetch roles
  useEffect(() => {
    async function fetchRoles() {
      setLoadingRoles(true);
      try {
        const res = await roleService.getRoles({});
        const mappedRoles = (res.items || []).map((role: any) => ({
          id: role.id,
          code: role.code || role.name || role.scope || String(role.id),
          name: role.name,
        }));
        setRoles(mappedRoles);
      } catch (e) {
        setError("Failed to fetch roles");
      } finally {
        setLoadingRoles(false);
      }
    }
    fetchRoles();
  }, []);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  // Check if form is changed in edit mode
  const isFormChanged = isEdit
    ? (
        formData.full_name !== originalValues.full_name ||
        formData.role_code !== originalValues.role_code ||
        formData.is_active !== originalValues.is_active
      )
    : true;

  // Validation
  const isFullNameValid = formData.full_name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const isRoleValid = formData.role_code.trim().length > 0;

  const isFormValid = isEdit
    ? (isFullNameValid && isRoleValid)
    : (isFullNameValid && isEmailValid && formData.password && formData.password === formData.confirm_password && isRoleValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!isFullNameValid) {
      setError("Full Name is required (min 2 characters)");
      return;
    }

    if (!isEdit) {
      if (!isEmailValid) {
        setError("Valid email address is required");
        return;
      }
      if (!formData.password) {
        setError("Password is required");
        return;
      }
      if (formData.password !== formData.confirm_password) {
        setError("Passwords do not match");
        return;
      }
    }

    if (!isRoleValid) {
      setError("Role is required");
      return;
    }

    setConfirmOpen(true);
    setPendingSubmit(e);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      if (isEdit && editUser) {
        await userService.updateUser(editUser.id, {
          full_name: formData.full_name,
          role: formData.role_code,
          is_active: formData.is_active,
        });
        showSuccessToast("User updated successfully.");
      } else {
        const payload: UserCreate = {
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
          role: formData.role_code,
        };
        await userService.createUser(payload);
        showSuccessToast("User saved successfully.");
      }
      setTimeout(() => navigate("/users"), 1200);
    } catch (err: any) {
      setError(err?.message || err?.detail || (isEdit ? "Failed to update user." : "Failed to create user."));
    } finally {
      setLoading(false);
      setPendingSubmit(null);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingSubmit(null);
  };

  return (
    <>
      {/* Header - Aligned with AddRole */}
      <Box sx={{ pt: 1.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <CommonPageHeader
          parentLabel="Users"
          parentHref="/users"
          title={isEdit ? "Edit User" : "Add User"}
        />
        <Stack direction="row" spacing={1.5}>
        <Tooltip title="Cancel and Go Back">
         <CloseIconButton onClick={() => navigate("/users")} />
        </Tooltip>
          <Tooltip title={isEdit ? "Update User" : "Save User"}>
            <SaveIconButton onClick={handleSubmit} loading={loading} />
          </Tooltip>
        </Stack>
      </Box>

      {/* Form content - match AddRole style */}
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <Paper sx={(theme) => ({ p: 0, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[1], overflow: "hidden", minWidth: 420, width: 520, maxWidth: '100%' })}>
          {/* Header */}
          <Box sx={(theme) => ({ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: theme.palette.grey[800] })}>
            <PersonIcon sx={{ color: "white", fontSize: 22 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "1px" }}>User Information</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleSubmit} autoComplete="off">
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    variant="outlined"
                    required
                    inputProps={{ minLength: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <EmailInput
                  fullWidth
                  label="Email Address"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  required
                  disabled={isEdit}
                />
              </Grid>

                {!isEdit && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <PasswordInput
                        fullWidth
                        label="Password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter password"
                        variant="outlined"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PasswordInput
                        fullWidth
                        label="Confirm Password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        variant="outlined"
                        placeholder="Confirm password"
                        required
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <Select
                    fullWidth
                    label="Role"
                    name="role_code"
                    value={formData.role_code}
                    onChange={(event) => {
                      const { value } = event.target;
                      setFormData((prev) => ({
                        ...prev,
                        role_code: typeof value === "string" ? value : String(value ?? ""),
                      }));
                      setError(null);
                    }}
                    required
                    disabled={loadingRoles || roles.length === 0}
                    sx={(theme) => ({ bgcolor: theme.palette.background.paper })}
                  >
                    {loadingRoles ? (
                      <MenuItem value="" disabled>Loading roles...</MenuItem>
                    ) : roles.length === 0 ? (
                      <MenuItem value="" disabled>No roles found</MenuItem>
                    ) : (
                      roles.map((role) => (
                        <MenuItem key={role.id} value={role.code}>{role.name}</MenuItem>
                      ))
                    )}
                  </Select>
                </Grid>

                {isEdit && (
                  <Grid item xs={12}>
                    <Box sx={(theme) => ({ p: 2, bgcolor: theme.palette.grey[100], borderRadius: 2, border: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" })}>
                      <Box>
                        <Typography sx={(theme) => ({ fontSize: "0.9rem", fontWeight: 700, color: theme.palette.text.primary })}>Account Active</Typography>
                        <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, fontSize: "0.75rem" })}>Control system access for this user</Typography>
                      </Box>
                      <Switch
                        checked={formData.is_active}
                        onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        name="is_active"
                        size="small"
                        color="primary"
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
              <SaveButton
                type="submit"
                disabled={false}
                loading={loading}
              >
                Save
              </SaveButton>
              <CancelButton
                onClick={() => navigate("/users")}
                disabled={loading}
              >
                  Cancel
                </CancelButton>
              </Box>
            </form>
          </Box>
        </Paper>
      </Box>

      {/* Success Snackbar */}
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        message={isEdit? "Are you sure you want to update this user?": "Are you sure you want to save this user?"}
        confirmLabel="Confirm"
        loading={loading}
      />
      </>
  );
}