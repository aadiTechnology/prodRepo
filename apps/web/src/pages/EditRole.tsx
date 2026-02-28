import React, { useContext } from "react";
import { useParams } from "react-router-dom";
import RoleForm from "../components/roles/RoleForm";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export default function EditRole() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [initialValues, setInitialValues] = React.useState<any>();
  const [permissionGroups, setPermissionGroups] = React.useState<any[]>([]);
  const [tenants, setTenants] = React.useState<{ id: string; name: string }[]>([]);

  // Use AuthContext for token if available
  const { token } = useAuth();
  React.useEffect(() => {
    (async () => {
      const apiBase = "http://localhost:8022";
      // Get token from localStorage or context
      const localToken = localStorage.getItem("auth_token") || token;
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        authHeaders["Authorization"] = `Bearer ${token}`;
      }

      // Fetch permission groups
      let permsResp = [];
      try {
        const resp = await fetch(`${apiBase}/rbac/permissions/groups`, { headers: authHeaders, credentials: "include" });
        permsResp = await resp.json();
      } catch (e) {
        permsResp = [];
      }
      // Ensure all permission IDs are strings for matching
      const normalizedGroups = (permsResp.items || (Array.isArray(permsResp) ? permsResp : [])).map((group: any) => ({
        ...group,
        permissions: Array.isArray(group.permissions)
          ? group.permissions.map((p: any) => ({ ...p, id: String(p.id) }))
          : [],
      }));
      setPermissionGroups(normalizedGroups);

      // Fetch tenants
      let tenantRes = [];
      try {
        const resp = await fetch(`${apiBase}/tenants`, { headers: authHeaders, credentials: "include" });
        tenantRes = await resp.json();
      } catch (e) {
        tenantRes = [];
      }
      setTenants(
        Array.isArray(tenantRes)
          ? tenantRes.map((t: any) => ({ id: String(t.id), name: t.name }))
          : (tenantRes.items || []).map((t: any) => ({ id: String(t.id), name: t.name }))
      );
    })();
  }, []);

  React.useEffect(() => {
    if (id) {
      setLoading(true);
      const apiBase = "http://localhost:8022";
      const localToken = localStorage.getItem("auth_token") || token;
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (localToken) {
        authHeaders["Authorization"] = `Bearer ${localToken}`;
      }
      fetch(`${apiBase}/roles/${id}`, { headers: authHeaders, credentials: "include" })
        .then(r => r.json())
        .then(data => {
          setInitialValues({
            ...data,
            permission_ids: Array.isArray(data.permissions)
              ? data.permissions.map((p: any) => String(p.id))
              : [],
          });
        })
        .catch(err => setError(err?.message || "Failed to load role"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (!id) {
    return (
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Typography variant="h6" color="error">Role ID not found in URL.</Typography>
      </Box>
    );
  }
  if (loading) {
    return (
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <CircularProgress size={32} color="primary" />
        <Typography variant="h6" sx={{ mt: 1 }}>Loading role data...</Typography>
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Typography variant="h6" color="error">{error}</Typography>
      </Box>
    );
  }
  if (!initialValues || !Array.isArray(permissionGroups) || permissionGroups.length === 0 || tenants.length === 0) {
    return null; // Or a skeleton/loader if you prefer
  }
  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '85vh', maxWidth: 1100, mx: 'auto', py: 1 }}>
      <RoleForm
        key={id}
        initialValues={initialValues}
        permissionGroups={permissionGroups}
        tenants={tenants}
        loading={loading}
        error={error}
        onSubmit={async () => {}}
        isEdit={true}
      />
    </Box>
  );
}
