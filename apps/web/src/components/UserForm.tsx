import { useState, useEffect, useCallback, memo } from "react";
import {
  Box,
  Alert,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  CircularProgress,
} from "./primitives";
import { SaveButton, CancelButton, EmailInput, PasswordInput } from "./semantic";
import { User, UserCreate, UserUpdate } from "../types/user";
import roleService from "../api/services/roleService";
import tenantService from "../api/services/tenantService";

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserCreate | UserUpdate) => Promise<void>;
  user?: any;
  isEdit?: boolean;
}


function UserForm({ open, onClose, onSubmit, user, isEdit = false }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    role_id: "",
    tenant_id: "",
    is_active: true,
  });
  const [roles, setRoles] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingRoles, setFetchingRoles] = useState(false);
  const [fetchingTenants, setFetchingTenants] = useState(false);

  // Protected user logic
  const isProtected = user?.is_protected;

  useEffect(() => {
    async function fetchRoles() {
      setFetchingRoles(true);
      try {
        const res = await roleService.getRoles({});
        setRoles(res.items || []);
      } catch (e) {
        setError("Failed to fetch roles");
      } finally {
        setFetchingRoles(false);
      }
    }
    fetchRoles();
  }, []);

  useEffect(() => {
    // Only fetch tenants if role is TENANT
    async function fetchTenants() {
      if (!formData.role_id) return;
      const selectedRole = roles.find((r) => r.id === formData.role_id);
      if (selectedRole?.scope !== "TENANT") {
        setTenants([]);
        return;
      }
      setFetchingTenants(true);
      try {
        const res = await tenantService.list();
        setTenants(res.items || []);
      } catch (e) {
        setError("Failed to fetch tenants");
      } finally {
        setFetchingTenants(false);
      }
    }
    fetchTenants();
  }, [formData.role_id, roles]);

  useEffect(() => {
    if (user && isEdit) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        password: "",
        role_id: user.role_id || "",
        tenant_id: user.tenant_id || "",
        is_active: user.is_active !== undefined ? user.is_active : true,
      });
    } else {
      setFormData({
        email: "",
        full_name: "",
        password: "",
        role_id: "",
        tenant_id: "",
        is_active: true,
      });
    }
    setError(null);
  }, [user, isEdit, open]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null);
  }, []);

  // Strict validation
  const validateForm = useCallback((): boolean => {
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!formData.full_name.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!isEdit && !formData.password.trim()) {
      setError("Password is required");
      return false;
    }
    if (!formData.role_id) {
      setError("Role is required");
      return false;
    }
    const selectedRole = roles.find((r) => r.id === formData.role_id);
    if (selectedRole?.scope === "TENANT" && !formData.tenant_id) {
      setError("Tenant is required for tenant role");
      return false;
    }
    return true;
  }, [formData, isEdit, roles]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEdit) {
        const updateData: UserUpdate = {
          full_name: formData.full_name,
          role: formData.role_id,
          tenant_id: formData.tenant_id ? Number(formData.tenant_id) : null,
          is_active: formData.is_active,
        };
        await onSubmit(updateData);
      } else {
        const createData: UserCreate = {
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
          role: formData.role_id,
          tenant_id: formData.tenant_id ? Number(formData.tenant_id) : null,
        };
        await onSubmit(createData);
      }
      onClose();
    } catch (err: any) {
      setError(err?.detail || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isEdit, formData, onSubmit, onClose, roles, validateForm]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <EmailInput
              name="email"
              label="Email"
              value={formData.email}
              onChange={handleChange}
              disabled={isEdit}
              required
              fullWidth
            />
            <TextField
              name="full_name"
              label="Full Name"
              value={formData.full_name}
              onChange={handleChange}
              required
              fullWidth
              disabled={isProtected}
            />
            {!isEdit && (
              <PasswordInput
                name="password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                required
                fullWidth
              />
            )}
            <Select
              name="role_id"
              label="Role"
              value={formData.role_id}
              onChange={handleChange}
              required
              fullWidth
              disabled={isProtected || fetchingRoles}
              helperText={fetchingRoles ? "Loading roles..." : ""}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name} ({role.scope})
                </MenuItem>
              ))}
            </Select>
            {/* Tenant dropdown only if role is TENANT */}
            {roles.find((r) => r.id === formData.role_id)?.scope === "TENANT" && (
              <Select
                name="tenant_id"
                label="Tenant"
                value={formData.tenant_id}
                onChange={handleChange}
                required
                fullWidth
                disabled={isProtected || fetchingTenants}
                helperText={fetchingTenants ? "Loading tenants..." : ""}
              >
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </Select>
            )}
            {/* Status toggle (disabled if protected) */}
            {isEdit && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    name="is_active"
                    color="primary"
                    disabled={isProtected}
                  />
                }
                label={formData.is_active ? "Active" : "Inactive"}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <CancelButton onClick={onClose} disabled={loading}>
            Cancel
          </CancelButton>
          <SaveButton type="submit" variant="contained" disabled={loading || isProtected} loading={loading}>
            {isEdit ? "Update" : "Create"}
          </SaveButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default memo(UserForm);
