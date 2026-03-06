// Style object for confirmation popup divider
const confirmDividerStyle = {
  border: 'none',
  borderTop: '0.225px solid #e5e7eb',
  margin: 0,
  height: 0,
};

import { useState, useEffect } from "react";
import { Box, Button, TextField, MenuItem, Typography, IconButton, InputAdornment, CircularProgress, Stack, Paper, Grid, Switch, Alert, Snackbar, Dialog, Tooltip } from "@mui/material";
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
    <Box sx={{ px: { xs: 2, md: 4 }, pb: 2, backgroundColor: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Header - Aligned with AddRole */}
      <Box sx={{ pt: 1.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/")} sx={{ backgroundColor: "#1a1a2e", borderRadius: 1.2, width: 44, height: 44, "&:hover": { backgroundColor: "#2d2d44" } }}>
            <HomeIcon sx={{ color: "white", fontSize: 24 }} />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "22px", color: "#1A1A2E", letterSpacing: "-1px" }}>
            <Box component="span" onClick={() => navigate("/users")} sx={{ color: "#94a3b8", cursor: "pointer", "&:hover": { color: "#1a1a2e" } }}>Users</Box>
            <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>/</Box>
            {isEdit ? "Edit User" : "Add User"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Cancel and Go Back">
            <IconButton
              onClick={() => navigate("/users")}
              sx={{
                color: '#fff',
                backgroundColor: '#fee2e2',
                borderRadius: '12px',
                width: 48,
                height: 48,
                boxShadow: '0 2px 8px 0 rgba(239,68,68,0.10)',
                border: 'none',
                p: 0,
                m: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
                '&:hover': {
                  backgroundColor: '#fecaca',
                  color: '#fff',
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 24, color: '#ef4444', bgcolor: '#fff', borderRadius: '50%', p: 0.375 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={isEdit ? "Update User" : "Save User"}>
            <IconButton
              onClick={handleSubmit}
              disabled={false}
              sx={{
                color: '#fff',
                backgroundColor: '#22c55e',
                borderRadius: '12px',
                width: 48,
                height: 48,
                boxShadow: '0 2px 8px 0 rgba(34,197,94,0.10)',
                border: 'none',
                p: 0,
                m: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
                '&:hover': {
                  backgroundColor: '#4ade80',
                  color: '#fff',
                },
                '&:disabled': {
                  backgroundColor: '#cbd5e1',
                  color: '#94a3b8',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : <SaveIcon sx={{ fontSize: 24, color: '#fff' }} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Form content - match AddRole style */}
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <Paper sx={{ p: 0, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)", overflow: "hidden", minWidth: 420, width: 520, maxWidth: '100%' }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "#1a1a2e" }}>
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
                    sx={{ bgcolor: '#fff' }}
                    required
                    inputProps={{ minLength: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                    disabled={isEdit}
                  />
                </Grid>

                {!isEdit && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter password"
                        variant="outlined"
                        sx={{ bgcolor: '#fff' }}
                        required
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle password visibility"
                                onClick={handleClickShowPassword}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Confirm Password"
                        name="confirm_password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirm_password}
                        onChange={handleChange}
                        placeholder="Confirm password"
                        variant="outlined"
                        sx={{ bgcolor: '#fff' }}
                        required
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle confirm password visibility"
                                onClick={handleClickShowConfirmPassword}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Role"
                    name="role_code"
                    value={formData.role_code}
                    onChange={handleChange}
                    placeholder="Select a role"
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                    disabled={loadingRoles || roles.length === 0}
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
                  </TextField>
                </Grid>

                {isEdit && (
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>Account Active</Typography>
                        <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>Control system access for this user</Typography>
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
                <Button
                  type="submit"
                  variant="text"
                  disabled={false}
                  sx={{
                    minWidth: 165,
                    fontWeight: 750,
                    borderRadius: 0,
                    color: '#22c55e',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    fontSize: '1.21rem',
                    px: 4.4,
                    py: 1.1,
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                    '&:disabled': {
                      color: '#cbd5e1',
                    },
                  }}
                >
                  {loading ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="text"
                  onClick={() => navigate("/users")}
                  disabled={loading}
                  sx={{
                    minWidth: 132,
                    fontWeight: 700,
                    borderRadius: 0,
                    color: '#ef4444',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    fontSize: '1.21rem',
                    px: 4.4,
                    py: 1.1,
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                    '&:disabled': {
                      color: '#cbd5e1',
                    },
                  }}
                >
                  Cancel
                </Button>
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
      <Dialog
        open={confirmOpen}
        onClose={handleCancel}
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
            height: '30%',
            minHeight: '20px',
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
            onClick={handleCancel}
            disabled={loading}
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
            {isEdit ? 'Are you sure you want to update this user?' : 'Are you sure you want to save this user?'}
          </Typography>
          <Box sx={{ width: '100%', mb: 0.5 }}>
            <hr style={confirmDividerStyle} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, width: '100%', mt: 0.5 }}>
            <Button
              onClick={handleCancel}
              disabled={loading}
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
              onClick={handleConfirm}
              disabled={loading}
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
              {loading ? "Processing..." : "Confirm"}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}