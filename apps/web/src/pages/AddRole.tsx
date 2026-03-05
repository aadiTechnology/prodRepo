// Style object for confirmation popup divider
const confirmDividerStyle = {
  border: 'none',
  borderTop: '0.225px solid #e5e7eb',
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
};
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Box, Typography, TextField, Button, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, CircularProgress, Stack, Paper, Grid, Switch } from "@mui/material";
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SaveIcon from '@mui/icons-material/Save';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Divider from '@mui/material/Divider';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import roleService from "../api/services/roleService";
import { useAuth } from "../context/AuthContext";
import HomeIcon from '@mui/icons-material/Home';
import Tooltip from '@mui/material/Tooltip';
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
          <IconButton onClick={() => navigate("/")} sx={{ backgroundColor: "#1a1a2e", borderRadius: 1.2, width: 44, height: 44, "&:hover": { backgroundColor: "#2d2d44" } }}>
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
              sx={{
                color: '#fff',
                backgroundColor: '#fee2e2',
                borderRadius: '12px', // 25% smaller than 16px
                width: 48, // 25% smaller than 64px
                height: 48, // 25% smaller than 64px
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
        <Paper sx={{ p: 0, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)", overflow: "hidden", minWidth: 420, width: 480, maxWidth: '100%' }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "#1a1a2e" }}>
            <AssignmentIndIcon sx={{ color: "white", fontSize: 22 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "1px" }}>Role Information</Typography>
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
                  <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>Account Active</Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>Control system access for this role</Typography>
                    </Box>
                    <Switch checked={status === "ACTIVE"} onChange={e => setStatus(e.target.checked ? "ACTIVE" : "INACTIVE")} name="is_active" size="small" color="primary" />
                  </Box>
                </Grid>
              </Grid>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
                <Button
                  type="submit"
                  variant="text"
                  sx={{
                    minWidth: 165, // 10% larger than 150
                    fontWeight: 750,
                    borderRadius: 0,
                    color: '#22c55e', // green text
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    fontSize: '1.21rem', // 10% larger than 1.1rem
                    px: 4.4, // 10% larger than 4
                    py: 1.1, // 10% larger than 1
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="text"
                  onClick={() => navigate("/roles")}
                  sx={{
                    minWidth: 132, // 10% larger than 120
                    fontWeight: 700,
                    borderRadius: 0,
                    color: '#ef4444', // red text
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    fontSize: '1.21rem', // 10% larger than 1.1rem
                    px: 4.4, // 10% larger than 4
                    py: 1.1, // 10% larger than 1
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Cancel
                </Button>
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
          {/* Header bar with title and close icon (from RoleManagementPage) */}
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
              sx={{ color: 'white', bgcolor: 'transparent', borderRadius: 2 }}
            >
              <CancelIcon sx={{ fontSize: 28 }} />
            </IconButton>
          </Box>
          {/* Message, check icon, and buttons area (from RoleManagementPage) */}
          <Box sx={{ px: 4, pt: 4, pb: 2.5, bgcolor: 'white', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <CheckIcon sx={{ fontSize: 50, color: '#43a047', mr: 2, p: 0 }} />
              <Typography sx={{ fontWeight: 175, fontSize: '1.9rem', color: '#18183a', letterSpacing: '-1px', lineHeight: 1.1 }}>
                Please Confirm
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '1.05rem', color: '#18183a', fontWeight: 125, mb: 1.2, ml: 3 }}>
              {isEditMode ? 'Are you sure you want to update this role?' : 'Are you sure you want to save this role?'}
            </Typography>
            <Box sx={{ width: '100%', mb: 0.5 }}>
              <hr style={confirmDividerStyle} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, width: '100%', mt: 0.5 }}>
              <Button
                onClick={handleCancel}
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
                Confirm
              </Button>
            </Box>
          </Box>
        </Dialog>
      </Box>
    </Box>
  );
}

export default AddRole;