import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Box, Typography, Snackbar, Alert, Stack, Paper, Grid, Switch } from "@mui/material";
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import roleService from "../api/services/roleService";
import { useAuth } from "../context/AuthContext";
import HomeIcon from '@mui/icons-material/Home';
import Tooltip from '@mui/material/Tooltip';
import { TextField, IconButton, CircularProgress } from "../components/primitives";
import { SaveButton, CancelButton } from "../components/semantic";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { FormSectionTitle } from "../components/reusable";
function AddRole() {
  // --- Success Toast Handler ---
  const showSuccessToast = (message: string) => setSnackbar(message);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const tenantId = auth?.user?.tenant_id;
  const userRole = auth?.user?.role;
  const roleId = searchParams.get("id");
  const isEditMode = !!roleId;
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<React.FormEvent | null>(null);
  const [roleCode, setRoleCode] = useState("");
  // Store original values for edit mode
  const [originalValues, setOriginalValues] = useState({
    roleName: "",
    roleCode: "",
    description: "",
    status: "ACTIVE",
  });

  // Fetch role data in edit mode
  useEffect(() => {
    if (isEditMode) {
      setFetching(true);
      roleService.getRoleById(roleId)
        .then((data) => {
          const name = data.name || "";
          const desc = data.description || "";
          const stat = data.is_active ? "ACTIVE" : "INACTIVE";
          const code = data.code || "";
          setRoleName(name);
          setDescription(desc);
          setStatus(stat);
          setRoleCode(code);
          setOriginalValues({
            roleName: name,
            roleCode: code,
            description: desc,
            status: stat,
          });
        })
        .catch(() => setError("Failed to fetch role data."))
        .finally(() => setFetching(false));
    } else {
      setRoleName("");
      setDescription("");
      setStatus("ACTIVE");
      setRoleCode("");
      setOriginalValues({
        roleName: "",
        roleCode: "",
        description: "",
        status: "ACTIVE",
      });
    }
  }, [isEditMode, roleId]);
  // Check if form is changed in edit mode
  const isFormChanged = isEditMode
    ? (
        roleName !== originalValues.roleName ||
        roleCode !== originalValues.roleCode ||
        description !== originalValues.description ||
        status !== originalValues.status
      )
    : true;

  // Validation
  const isRoleNameValid = roleName.trim().length >= 2;
  const isRoleCodeValid = roleCode.trim().length >= 2;
  const isFormValid = isRoleNameValid && isRoleCodeValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isRoleNameValid) {
      setError("Role Name is required (min 2 characters)");
      return;
    }
    // Only require tenantId for tenant admins
    if (userRole !== "SUPER_ADMIN" && !tenantId) {
      setError("Tenant ID is missing. Cannot create role. Please re-login or contact support.");
      console.warn("Tenant ID is missing in AddRole page. Auth context:", auth);
      return;
    }
    setConfirmOpen(true);
    setPendingSubmit(e);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      // Determine payload based on user role
      let payload: any = {
        name: roleName,
        code: roleCode,
        description,
        is_active: status === "ACTIVE",
        permission_ids: [], // required by backend, empty array
      };
      if (userRole === "SUPER_ADMIN") {
        payload.scope_type = "Platform";
        payload.tenant_id = null;
      } else {
        payload.scope_type = "Tenant";
        payload.tenant_id = tenantId;
      }
      if (isEditMode) {
        await roleService.updateRole(roleId, payload);
        showSuccessToast("Role Updated successfully.");
      } else {
        await roleService.createRole(payload);
        showSuccessToast("Role saved successfully.");
      }
      setTimeout(() => navigate("/roles"), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || (isEditMode ? "Failed to update role." : "Failed to create role."));
    } finally {
      setLoading(false);
      setPendingSubmit(null);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingSubmit(null);
  };

  if (isEditMode && fetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, pb: 2, backgroundColor: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Header - Aligned with AddTenant */}
      <Box sx={{ pt: 1.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/")} sx={(theme) => ({ backgroundColor: theme.palette.grey[800], borderRadius: 1.2, width: 44, height: 44, "&:hover": { backgroundColor: theme.palette.grey[700] } })}>
            <HomeIcon sx={{ color: "white", fontSize: 24 }} />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "22px", color: "#1A1A2E", letterSpacing: "-1px" }}>
            <Box component="span" onClick={() => navigate("/roles")} sx={{ color: "#94a3b8", cursor: "pointer", "&:hover": { color: "#1a1a2e" } }}>Roles</Box>
            <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>/</Box>
            {isEditMode ? "Edit Role" : "Add Role"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Cancel and Go Back">
            <IconButton
              onClick={() => navigate("/roles")}
              sx={(theme) => ({
                color: theme.palette.error.contrastText,
                backgroundColor: theme.palette.error.light,
                borderRadius: 1.5,
                width: 48,
                height: 48,
                boxShadow: theme.shadows[2],
                border: 'none',
                p: 0,
                m: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
                '&:hover': {
                  backgroundColor: theme.palette.error.light,
                  color: theme.palette.error.contrastText,
                },
              })}
            >
              <CloseIcon sx={(theme) => ({ fontSize: 24, color: theme.palette.error.main, bgcolor: theme.palette.background.paper, borderRadius: '50%', p: 0.375 })} />
            </IconButton>
          </Tooltip>
          <Tooltip title={isEditMode ? "Update Role" : "Save Role"}>
            <IconButton
              onClick={handleSubmit}
              sx={{
                color: '#fff',
                backgroundColor: '#22c55e',
                borderRadius: '12px', // 25% smaller than 16px
                width: 48, // 25% smaller than 64px
                height: 48, // 25% smaller than 64px
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
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : <SaveIcon sx={{ fontSize: 24, color: '#fff' }} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      {/* Form content - match AddTenant style */}
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <Paper sx={(theme) => ({ p: 0, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[1], overflow: "hidden", minWidth: 420, width: 480, maxWidth: '100%' })}>
          {/* Header */}
          <Box sx={(theme) => ({ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: theme.palette.grey[800] })}>
            <AssignmentIndIcon sx={{ color: "white", fontSize: 22 }} />
            <FormSectionTitle sx={(theme) => ({ color: theme.palette.common.white, mb: 0 })}>Role Information</FormSectionTitle>
          </Box>
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleSubmit} autoComplete="off">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Role Name"
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    placeholder="Enter role name"
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                    inputProps={{ minLength: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Role Code"
                    value={roleCode}
                    onChange={e => setRoleCode(e.target.value)}
                    placeholder="Enter unique role code"
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                    inputProps={{ minLength: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Enter description"
                    variant="outlined"
                    multiline
                    minRows={3}
                    sx={{ bgcolor: '#fff' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={(theme) => ({ p: 2, bgcolor: theme.palette.grey[100], borderRadius: 2, border: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" })}>
                    <Box>
                      <Typography sx={(theme) => ({ fontSize: "0.9rem", fontWeight: 700, color: theme.palette.text.primary })}>Account Active</Typography>
                      <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, fontSize: "0.75rem" })}>Control system access for this role</Typography>
                    </Box>
                    <Switch checked={status === "ACTIVE"} onChange={e => setStatus(e.target.checked ? "ACTIVE" : "INACTIVE")} name="is_active" size="small" color="primary" />
                  </Box>
                </Grid>
              </Grid>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
                <SaveButton
                  type="submit"
                  variant="text"
                  loading={loading}
                  sx={(theme) => ({
                    minWidth: 165,
                    fontWeight: 750,
                    borderRadius: 0,
                    color: theme.palette.success.main,
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
                  })}
                >
                  Save
                </SaveButton>
                <CancelButton
                  variant="text"
                  onClick={() => navigate("/roles")}
                  sx={(theme) => ({
                    minWidth: 132,
                    fontWeight: 700,
                    borderRadius: 0,
                    color: theme.palette.error.main,
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
                  })}
                >
                  Cancel
                </CancelButton>
              </Box>
            </form>
          </Box>
        </Paper>
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
        <ConfirmDialog
          open={confirmOpen}
          title="Please Confirm"
          message={isEditMode ? "Are you sure you want to update this role?" : "Are you sure you want to save this role?"}
          confirmText="Confirm"
          confirmVariant="primary"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </Box>
    </Box>
  );
}

export default AddRole;