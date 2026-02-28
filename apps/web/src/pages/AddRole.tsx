import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Snackbar } from "@mui/material";
import RoleForm from "../components/roles/RoleForm";
import roleService from "../api/services/roleService";
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
import { Box, Container, Typography } from "@mui/material";

export default function AddRole() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<RoleFormValues | undefined>();
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroupType[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);

  // Fetch permissions and tenants
  useEffect(() => {
    (async () => {
      // Fetch permission groups using correct endpoint
      const permsResp = await roleService.getPermissionGroups();
      // Normalize permission IDs to strings for consistency
      const normalizedGroups = (permsResp.items || permsResp).map((group: any) => ({
        ...group,
        permissions: Array.isArray(group.permissions)
          ? group.permissions.map((p: any) => ({ ...p, id: String(p.id) }))
          : [],
      }));
      setPermissionGroups(normalizedGroups as PermissionGroupType[]);

      // Fetch tenants
      const tenantRes = await roleService.getTenants();
      setTenants(
        Array.isArray(tenantRes)
          ? tenantRes.map((t: any) => ({ id: String(t.id), name: t.name }))
          : (tenantRes.items || []).map((t: any) => ({ id: String(t.id), name: t.name }))
      );
    })();
  }, []);

  // Edit mode: load role
  useEffect(() => {
    if (id) {
      setLoading(true);
      roleService.getRoleById(id)
        .then(res => {
          setInitialValues(res.data);
        })
        .catch(err => setError(err?.message || "Failed to load role"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    console.log("Tenants loaded:", tenants);
  }, [tenants]);

  const handleSubmit = async (values: RoleFormValues) => {
    setLoading(true);
    setError(null);
    try {
      if (id) {
        await roleService.updateRole(id, values);
        setSnackbar("Role updated successfully.");
      } else {
        await roleService.createRole(values);
        setSnackbar("Role created successfully.");
      }
      setTimeout(() => navigate("/roles"), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '60vh', maxWidth: 1100, mx: 'auto', py: 1 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Add Role
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Define access levels and permissions for your team members.
      </Typography>
      <RoleForm
        initialValues={initialValues}
        permissionGroups={permissionGroups}
        tenants={tenants}
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        isEdit={!!id}
      />
      <Snackbar
        open={!!snackbar}
        autoHideDuration={2000}
        message={snackbar}
        onClose={() => setSnackbar(null)}
      />
    </Box>
  );
}