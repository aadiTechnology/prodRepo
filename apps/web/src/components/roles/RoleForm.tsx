import { useState, useEffect } from "react";
// Already imported above

interface RoleFormProps {
  initialValues?: RoleFormValues;
  permissionGroups: PermissionGroupType[];
  tenants: { id: string; name: string }[];
  loading: boolean;
  error: string | null;
  onSubmit: (values: RoleFormValues) => Promise<any>;
  isEdit: boolean;
}
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import KeyIcon from "@mui/icons-material/VpnKey";
import { useNavigate, useParams } from "react-router-dom";
import PermissionGroup from "../../components/roles/PermissionGroup";
import roleService from "../../api/services/roleService";
// Define RoleFormValues and PermissionGroupType locally since they are not exported from types/role.types
interface RoleFormValues {
  code: string;
  name: string;
  scope_type: string;
  description: string;
  tenant_id: string;
  permission_ids: string[];
  is_active: boolean;
}

interface PermissionGroupType {
  module_name: string;
  permissions: Array<{
    id: string;
    name: string;
    code: string;
    module_name: string;
    is_active?: boolean;
  }>;
}
import { orange } from "@mui/material/colors";

  const ACCENT = orange[600];
  const DARK_BG = "#fff";
  const CARD_BG = "#fff";
  const FIELD_BG = "#fff";
  const FIELD_BORDER = "#e0e0e0";
  const MUTED = "#888";

export default function RoleForm({
  initialValues,
  permissionGroups,
  tenants,
  loading,
  error,
  onSubmit,
  isEdit,
}: RoleFormProps) {



  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  // isEdit and loading now come from props


  const [form, setForm] = useState<RoleFormValues>(
    initialValues ?? {
      code: "",
      name: "",
      scope_type: "PLATFORM",
      description: "",
      tenant_id: "",
      permission_ids: [],
      is_active: true,
    }
  );
  // permissionGroups and tenants now come from props
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  // error now comes from props
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [fieldError, setFieldError] = useState<{ [k: string]: string }>({});


  // ...existing code...
  useEffect(() => {
    // permissionGroups and tenants now come from props
  }, []);

  useEffect(() => {
    console.log("Tenants loaded:", tenants);
  }, [tenants]);

  // Place conditional returns here, after all hooks and useEffects
  if (isEdit && loading) {
    return (
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <CircularProgress size={40} color="primary" />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading role data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Box>
    );
  }

  useEffect(() => {
    // permissionGroups and tenants now come from props
  }, []);


  useEffect(() => {
    console.log("Tenants loaded:", tenants);
  }, [tenants]);

  const validate = () => {
    const err: { [k: string]: string } = {};
    if (!form.code.trim()) err.code = "Role Code is required";
    if (!form.name.trim()) err.name = "Role Name is required";
    if (!form.scope_type) err.scope_type = "Role Scope is required";
    if (form.scope_type === "TENANT" && !form.tenant_id) err.tenant_id = "Tenant is required";
    if (!form.permission_ids.length) err.permission_ids = "At least one permission must be selected";
    setFieldError(err);
    return Object.keys(err).length === 0;
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((f: RoleFormValues) => ({ ...f, [name]: value }));
    setTouched(t => ({ ...t, [name]: true }));
  };

  const handleScopeChange = (e: any) => {
    const value = e.target.value;
    setForm((f: RoleFormValues) => ({
      ...f,
      scope_type: value,
      tenant_id: value === "TENANT" ? f.tenant_id : "",
    }));
    setTouched(t => ({ ...t, scope_type: true }));
  };

  const handlePermissionsChange = (ids: string[]) => {
    setForm((f: RoleFormValues) => ({ ...f, permission_ids: ids }));
    setTouched(t => ({ ...t, permission_ids: true }));
  };

  const handleSelectAll = (module: string, allIds: string[]) => {
    const permissionIds = Array.isArray(form.permission_ids) ? form.permission_ids : [];
    const alreadyAll = allIds.every(id => permissionIds.includes(id));
    setForm((f: RoleFormValues) => ({
      ...f,
      permission_ids: alreadyAll
        ? permissionIds.filter(id => !allIds.includes(id))
        : [...permissionIds, ...allIds.filter(id => !permissionIds.includes(id))],
    }));
    setTouched(t => ({ ...t, permission_ids: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // loading and error now come from props
    try {
      if (isEdit && id) {
        // Only send allowed fields for update
        const updatePayload = {
          name: form.name,
          description: form.description,
          is_active: form.is_active,
          permission_ids: form.permission_ids.map((id: string) => parseInt(id)),
        };
        await roleService.updateRole(id, updatePayload);
        setSnackbar("Role updated successfully.");
        setShowSuccess(true);
      } else {
        await roleService.createRole(form);
        setSnackbar("Role Created Successfully");
        setShowSuccess(true);
      }
      setTimeout(() => navigate("/roles"), 1200);
    } catch (err: any) {
      // error now comes from props
    } finally {
      // loading now comes from props
    }
  };

  return (
    <Box sx={{ bgcolor: DARK_BG, minHeight: "60vh", maxWidth: 1400, mx: "auto", py: 1 }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        <Card
          sx={{
            borderRadius: 2,
            bgcolor: CARD_BG,
            p: 2,
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            color: "text.primary",
            maxWidth: 1000,
            margin: "0 auto",
            minHeight: "60vh",
          }}
        >
          <form onSubmit={handleSubmit} autoComplete="off">
            <Grid container spacing={1}>
              {/* Row 1 */}
              <Grid item xs={12} md={4}>
                <TextField
                  label="Role Code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  required
                  fullWidth
                  variant="outlined"
                  sx={{
                    bgcolor: FIELD_BG,
                    borderRadius: 2,
                    input: { color: "text.primary" },
                  }}
                  InputProps={{
                    sx: { borderRadius: 2, color: "text.primary" },
                  }}
                  error={!!fieldError.code && touched.code}
                  helperText={touched.code && fieldError.code}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Role Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  fullWidth
                  variant="outlined"
                  sx={{
                    bgcolor: FIELD_BG,
                    borderRadius: 2,
                    input: { color: "text.primary" },
                  }}
                  InputProps={{
                    sx: { borderRadius: 2, color: "text.primary" },
                  }}
                  error={!!fieldError.name && touched.name}
                  helperText={touched.name && fieldError.name}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel sx={{ color: MUTED }}>Role Scope</InputLabel>
                  <Select
                    name="scope_type"
                    value={form.scope_type}
                    onChange={handleScopeChange}
                    label="Role Scope"
                    sx={{
                      bgcolor: FIELD_BG,
                      borderRadius: 2,
                      color: "text.primary",
                      ".MuiSelect-icon": { color: MUTED },
                    }}
                  >
                    <MenuItem value="PLATFORM">Platform</MenuItem>
                    <MenuItem value="TENANT">Tenant</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {/* Row 2 */}
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  minRows={3}
                  variant="outlined"
                  sx={{
                    bgcolor: FIELD_BG,
                    borderRadius: 2,
                    input: { color: "text.primary" },
                  }}
                  InputProps={{
                    sx: { borderRadius: 2, color: "text.primary" },
                  }}
                />
              </Grid>
              {/* Row 3: Tenant */}
              {form.scope_type === "TENANT" && (
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel sx={{ color: MUTED }}>Select Tenant</InputLabel>
                    <Select
                      name="tenant_id"
                      value={form.tenant_id || ""}
                      onChange={handleChange}
                      label="Select Tenant"
                      sx={{
                        bgcolor: FIELD_BG,
                        borderRadius: 2,
                        color: "text.primary",
                        ".MuiSelect-icon": { color: MUTED },
                      }}
                    >
                      {tenants.map(t => (
                        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>

            {/* Divider */}
            <Divider sx={{ my: 2, borderColor: "#3a2a18" }} />

            {/* Permissions Section */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <KeyIcon sx={{ color: ACCENT, fontSize: 22 }} />
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  Permissions
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Typography
                variant="caption"
                sx={{
                  color: ACCENT,
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  fontSize: 13,
                  letterSpacing: 1,
                }}
                onClick={() => {
                  // Select all permissions
                  const allIds = permissionGroups.flatMap(g => g.permissions.map(p => p.id));
                  const permissionIds = Array.isArray(form.permission_ids) ? form.permission_ids : [];
                  const alreadyAll = allIds.every(id => permissionIds.includes(id));
                  setForm(f => ({
                    ...f,
                    permission_ids: alreadyAll ? [] : allIds,
                  }));
                  setTouched(t => ({ ...t, permission_ids: true }));
                }}
              >
                {permissionGroups.length &&
                permissionGroups
                  .flatMap(g => g.permissions.map(p => p.id))
                  .every(id => (Array.isArray(form.permission_ids) ? form.permission_ids : []).includes(id))
                  ? "Deselect All"
                  : "Select All"}
              </Typography>
            </Box>

            {permissionGroups.map(group => {
              const allIds = group.permissions.map((p: PermissionGroupType["permissions"][number]) => p.id);
              const permissionIds = Array.isArray(form.permission_ids) ? form.permission_ids : [];
              const allSelected = allIds.every((id: string) => permissionIds.includes(id));
              return (
                <PermissionGroup
                  key={group.module_name}
                  module={group.module_name}
                  permissions={group.permissions}
                  selected={form.permission_ids}
                  onChange={handlePermissionsChange}
                  onSelectAll={() => handleSelectAll(group.module_name, allIds)}
                  allSelected={allSelected}
                  accentColor={ACCENT}
                />
              );
            })}

            {touched.permission_ids && fieldError.permission_ids && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {fieldError.permission_ids}
              </Alert>
            )}

            {/* Submit Button */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 4 }}>
              {/* Status Selector */}
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  name="is_active"
                  value={form.is_active ? "ACTIVE" : "INACTIVE"}
                  label="Status"
                  onChange={e => setForm((f: RoleFormValues) => ({ ...f, is_active: e.target.value === "ACTIVE" }))}
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                </Select>
              </FormControl>
              <Button
                type="submit"
                variant="contained"
                sx={{
                  bgcolor: ACCENT,
                  color: "#fff",
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontSize: 14,
                  "&:hover": { bgcolor: orange[700] },
                  minWidth: 120,
                }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {isEdit ? "Update Role" : "Create Role"}
              </Button>
            </Box>
          </form>
        </Card>
        <Snackbar
          open={!!snackbar && showSuccess}
          autoHideDuration={2000}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          onClose={() => { setSnackbar(null); setShowSuccess(false); }}
        >
          <Alert
            onClose={() => { setSnackbar(null); setShowSuccess(false); }}
            severity="success"
            sx={{ width: "100%", bgcolor: "#43a047", color: "#fff", fontWeight: 700, fontSize: 16, boxShadow: 2 }}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#43a047" />
                <path d="M17 8.5L10.75 15L7 11.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            {snackbar}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}