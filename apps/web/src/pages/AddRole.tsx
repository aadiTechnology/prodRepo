import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import roleService from "../api/services/roleService";
import { useAuth } from "../context/AuthContext";
import { mapApiErrorsToFields, type FormValidationConfig } from "../utils/formValidation";
import { useFormManager } from "../hooks/useFormManager";
import BaseForm from "../components/reusable/BaseForm";
import { createAddRoleFormConfig, type AddRoleFormData } from "./AddRole.formConfig";

const emptyForm = (): AddRoleFormData => ({
  name: "",
  code: "",
  description: "",
  is_active: true,
});

export default function RolePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const auth = useAuth();
  const tenantId = auth?.user?.tenant_id;
  const userRole = auth?.user?.role;

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [permissionGroups, setPermissionGroups] = useState<any[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);

  const initialValues = useMemo(() => emptyForm(), []);

  const validationConfig = useMemo<FormValidationConfig<AddRoleFormData>>(() => ({
    name: [
      { type: "required", message: "Role Name is required." },
      { type: "minLength", value: 2, message: "Min 2 characters." },
    ],
    code: [
      { type: "required", message: "Role Code is required." },
      { type: "minLength", value: 2, message: "Min 2 characters." },
    ],
  }), []);

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<AddRoleFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  const formConfig = useMemo(
    () => createAddRoleFormConfig({ isEditMode }),
    [isEditMode]
  );


  // Fetch permission groups and tenants (if needed)
  useEffect(() => {
    (async () => {
      const apiBase = "http://localhost:8022";
      // Get token from localStorage or context
      const token = auth?.token || localStorage.getItem("auth_token");
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
  }, [auth]);

  // Fetch role data if editing
  useEffect(() => {
    if (isEditMode && id) {
      setFetchLoading(true);
      roleService.getRoleById(id)
        .then((data) => {
          setFormData({
            name: data.name || "",
            code: data.code || "",
            description: data.description || "",
            is_active: data.is_active ?? true,
          });
        })
        .catch((err) => {
          const msg = (err as { message?: string })?.message || "Failed to load role.";
          setError(msg);
        })
        .finally(() => setFetchLoading(false));
    }
  }, [isEditMode, id, setFormData]);

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (userRole !== "SUPER_ADMIN" && !tenantId) {
        throw new Error("Tenant ID is missing. Cannot create role.");
      }

      const payload: any = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        is_active: formData.is_active,
        permission_ids: [], // TODO: add permission selection support
      };

      if (userRole === "SUPER_ADMIN") {
        payload.scope_type = "Platform";
        payload.tenant_id = null;
      } else {
        payload.scope_type = "Tenant";
        payload.tenant_id = tenantId;
      }

      if (isEditMode && id) {
        await roleService.updateRole(id, payload);
        setSnackbar("Role updated successfully.");
      } else {
        await roleService.createRole(payload);
        setSnackbar("Role saved successfully.");
      }
      setTimeout(() => navigate("/roles"), 1000);
    } catch (err: unknown) {
      console.error("Role save error:", err);
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      if (apiFieldErrors) {
        setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
      }
      setError(
        message || (isEditMode ? "Failed to update role." : "Failed to create role.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<AddRoleFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleSubmit}
      setFormError={setError}
      onConfirmSubmit={handleConfirmSubmit}
      isEditMode={isEditMode}
      loading={loading}
      fetchLoading={fetchLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Roles", path: "/roles" },
          { title: isEditMode ? "Edit Role" : "Add Role", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Update",
      }}
      onCancelNavigate={() => navigate("/roles")}
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this role?"
          : "Are you sure you want to save this role?"
      }
    />
  );
}