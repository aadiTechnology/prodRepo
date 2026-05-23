import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import userService from "../api/services/userService";
import { UserCreate } from "../types/user";
import { User } from "../types/auth";
import roleService from "../api/services/roleService";
import permissionService from "../api/services/permissionService";
import { mapApiErrorsToFields, type FormValidationConfig } from "../utils/formValidation";
import {
  confirmPasswordMatchRules,
  emailRequiredPatternRules,
  newPasswordRules,
} from "../utils/formValidationPresets";
import { useFormManager } from "../hooks/useFormManager";
import BaseForm from "../components/reusable/BaseForm";
import type { SelectItemOption } from "../components/semantic";
import { createUserFormConfig, type CreateUserFormData } from "./CreateUser.formConfig";

const emptyForm = (): CreateUserFormData => ({
  email: "",
  full_name: "",
  password: "",
  confirm_password: "",
  role_code: "",
  is_active: true,
});

function formFromUser(user: User): CreateUserFormData {
  return {
    ...emptyForm(),
    email: user.email ?? "",
    full_name: user.full_name ?? "",
    role_code: user.role ?? "",
    is_active: user.is_active ?? true,
  };
}

export default function CreateUser() {
  const location = useLocation();
  const locationState = location.state as { user?: User; isEdit?: boolean } | null;
  const isEditMode = locationState?.isEdit === true;
  const editUser = locationState?.user ?? null;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [roleOptions, setRoleOptions] = useState<SelectItemOption[]>([]);
  const [roleOptionsLoading, setRoleOptionsLoading] = useState(false);
  // Track role numeric ID alongside role_code for RBAC assignment
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const initialValues = useMemo(
    () => (isEditMode && editUser ? formFromUser(editUser) : emptyForm()),
    [isEditMode, editUser]
  );

  const validationConfig = useMemo<FormValidationConfig<CreateUserFormData>>(() => {
    const cfg: FormValidationConfig<CreateUserFormData> = {
      full_name: [
        { type: "required", message: "Required." },
        { type: "minLength", value: 2, message: "Min 2 characters." },
      ],
      role_code: [{ type: "required", message: "Required." }],
    };
    if (!isEditMode) {
      cfg.email = emailRequiredPatternRules<CreateUserFormData>();
      cfg.password = newPasswordRules<CreateUserFormData>();
      cfg.confirm_password = confirmPasswordMatchRules<CreateUserFormData>("password");
    }
    return cfg;
  }, [isEditMode]);

  const dependentFieldPairs = useMemo(
    () => (!isEditMode ? ([["password", "confirm_password"]] as const) : []),
    [isEditMode]
  );

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
    resetForm,
  } = useFormManager<CreateUserFormData>({
    initialValues,
    validationConfig,
    dependentFieldPairs,
    onClearError: () => setError(null),
  });

  useEffect(() => {
    if (isEditMode) return;
    resetForm(emptyForm());
    setFieldErrors({});
    // Browsers may autofill after mount; clear again once autofill runs.
    const t1 = window.setTimeout(() => resetForm(emptyForm()), 50);
    const t2 = window.setTimeout(() => resetForm(emptyForm()), 250);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isEditMode, resetForm, setFieldErrors]);

  const formConfig = useMemo(
    () =>
      createUserFormConfig({
        isEditMode,
        roleOptions,
        roleOptionsLoading,
      }),
    [isEditMode, roleOptions, roleOptionsLoading]
  );

  const fetchRoles = useCallback(async () => {
    setRoleOptionsLoading(true);
    try {
      const items = await roleService.getSelectableRoles();
      const mappedRoles = items.map(
        (role: { id: unknown; code?: string; name?: string; scope?: string }) => ({
          id: String(role.id),
          value:
            role.code ||
            role.name ||
            (role.scope != null ? String(role.scope) : "") ||
            String(role.id),
          label: role.name ?? "",
        })
      );
      setRoleOptions(mappedRoles);
      // In edit mode, pre-select the existing role from RBAC table
      if (isEditMode && editUser) {
        const currentRoleIds = await permissionService.getUserRoles(editUser.id);
        if (currentRoleIds.length > 0) {
          setSelectedRoleId(currentRoleIds[0]);
          // Find the matching role code to pre-fill the form
          const matchedRole = items.find((r: any) => r.id === currentRoleIds[0]) as any;
          if (matchedRole && !formData.role_code) {
            handleFieldValueChange("role_code", (matchedRole.code as string) || (matchedRole.name as string) || "");
          }
        }
      }
    } catch {
      setError("Failed to fetch roles");
    } finally {
      setRoleOptionsLoading(false);
    }
  }, [isEditMode, editUser]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const common = {
        full_name: formData.full_name,
        role: formData.role_code,
      };

      // Find the numeric role ID for RBAC assignment
      const matchedOption = roleOptions.find(o => o.value === formData.role_code);
      const roleIdToAssign = matchedOption ? parseInt(matchedOption.id, 10) : selectedRoleId;

      let savedUserId: number | null = null;

      if (isEditMode && editUser) {
        await userService.updateUser(editUser.id, {
          ...common,
          is_active: formData.is_active,
        });
        savedUserId = editUser.id;
        setSnackbar("User updated successfully.");
      } else {
        const payload: UserCreate = {
          ...common,
          email: formData.email,
          password: formData.password,
        };
        const createdUser = await userService.createUser(payload);
        savedUserId = createdUser.id;
        setSnackbar("User saved successfully.");
      }

      // Assign role via RBAC endpoint (populates user_roles table)
      if (savedUserId && roleIdToAssign && !isNaN(roleIdToAssign)) {
        try {
          await permissionService.assignRolesToUser(savedUserId, [roleIdToAssign]);
          console.log(`[CreateUser] Assigned role ${roleIdToAssign} to user ${savedUserId}`);
        } catch (roleErr) {
          // Non-blocking: user was saved, just log the role assignment error
          console.warn("[CreateUser] Role assignment failed (RBAC):", roleErr);
        }
      }

      setTimeout(() => navigate("/users"), 1200);
    } catch (err: unknown) {
      console.error("User save error:", err);
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
      setError(message || (isEditMode ? "Failed to update user." : "Failed to create user."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<CreateUserFormData>
      key={isEditMode && editUser ? `edit-${editUser.id}` : "create-user"}
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
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Users", path: "/users" },
          { title: isEditMode ? "Edit User" : "Add User", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Save",
      }}
      onCancelNavigate={() => navigate("/users")}
      footerActionOrder="cancel-first"
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this user?"
          : "Are you sure you want to create this user?"
      }
      formTopSlot={
        !isEditMode ? (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 0,
              height: 0,
              overflow: "hidden",
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            <input type="text" name="username" tabIndex={-1} defaultValue="" autoComplete="username" />
            <input
              type="password"
              name="password"
              tabIndex={-1}
              defaultValue=""
              autoComplete="current-password"
            />
          </div>
        ) : undefined
      }
    />
  );
}
