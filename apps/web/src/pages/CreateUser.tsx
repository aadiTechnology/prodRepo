import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import userService from "../api/services/userService";
import { UserCreate } from "../types/user";
import { User } from "../types/auth";
import roleService from "../api/services/roleService";
import { mapApiErrorsToFields, type FormValidationConfig } from "../utils/formValidation";
import { useFormManager } from "../hooks/useFormManager";
import BaseForm from "../components/reusable/BaseForm";
import type { FormConfig } from "../components/reusable/formFramework.types";
import type { SelectItemOption } from "../components/semantic";

type FormData = {
  email: string;
  full_name: string;
  password: string;
  confirm_password: string;
  role_code: string;
  is_active: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = (): FormData => ({
  email: "",
  full_name: "",
  password: "",
  confirm_password: "",
  role_code: "",
  is_active: true,
});

function formFromUser(user: User): FormData {
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

  const initialValues = useMemo(
    () => (isEditMode && editUser ? formFromUser(editUser) : emptyForm()),
    [isEditMode, editUser]
  );

  const validationConfig = useMemo<FormValidationConfig<FormData>>(() => {
    const cfg: FormValidationConfig<FormData> = {
      full_name: [
        { type: "required", message: "Required." },
        { type: "minLength", value: 2, message: "Min 2 characters." },
      ],
      role_code: [{ type: "required", message: "Required." }],
    };
    if (!isEditMode) {
      cfg.email = [
        { type: "required", message: "Required." },
        { type: "pattern", regex: EMAIL_PATTERN, message: "Invalid email." },
      ];
      cfg.password = [
        { type: "required", message: "Required." },
        { type: "minLength", value: 8, message: "Min 8 characters." },
      ];
      cfg.confirm_password = [
        { type: "required", message: "Required." },
        { type: "matchField", field: "password", message: "Passwords don't match." },
      ];
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
  } = useFormManager<FormData>({
    initialValues,
    validationConfig,
    dependentFieldPairs,
    onClearError: () => setError(null),
  });

  const formConfig = useMemo<FormConfig<FormData>>(
    () => ({
      fields: {
        full_name: {
          name: "full_name",
          label: "Full name",
          type: "text",
          placeholder: "Enter full name",
          required: true,
          props: { htmlInput: { minLength: 2 } },
        },
        email: {
          name: "email",
          label: "Email address",
          type: "email",
          placeholder: "user@example.com",
          required: true,
          props: { disabled: isEditMode },
          helperText: (ctx) =>
            ctx.isEditMode ? "Account identifier cannot be changed" : undefined,
        },
        password: {
          name: "password",
          label: "Password",
          type: "password",
          placeholder: "Enter secure password",
          required: true,
          conditionalRender: () => !isEditMode,
        },
        confirm_password: {
          name: "confirm_password",
          label: "Confirm password",
          type: "password",
          placeholder: "Repeat password",
          required: true,
          conditionalRender: () => !isEditMode,
        },
        role_code: {
          name: "role_code",
          label: "Role",
          type: "select",
          required: true,
          props: {
            options: roleOptions,
            loading: roleOptionsLoading,
            loadingLabel: "Loading roles...",
            emptyListLabel: "No roles found",
            disableWhenEmpty: true,
          },
        },
        is_active: {
          name: "is_active",
          label: "Account active",
          type: "switch",
          conditionalRender: () => isEditMode,
        },
      },
      layoutRows: [
        {
          kind: "fields",
          grid: { xs: 12, md: 6 },
          fieldNames: ["full_name", "email"],
        },
        {
          kind: "fields",
          grid: { xs: 12, md: 6 },
          fieldNames: ["password", "confirm_password"],
          show: (c) => !c.isEditMode,
        },
        {
          kind: "fields",
          grid: { xs: 12, md: 6 },
          fieldNames: ["role_code", "is_active"],
          show: (c) => c.isEditMode,
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["role_code"],
          show: (c) => !c.isEditMode,
        },
      ],
    }),
    [isEditMode, roleOptions, roleOptionsLoading]
  );

  const fetchRoles = useCallback(async () => {
    setRoleOptionsLoading(true);
    try {
      const res = await roleService.getRoles({});
      const mappedRoles = (res.items || []).map(
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
    } catch {
      setError("Failed to fetch roles");
    } finally {
      setRoleOptionsLoading(false);
    }
  }, []);

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
      if (isEditMode && editUser) {
        await userService.updateUser(editUser.id, {
          ...common,
          is_active: formData.is_active,
        });
        setSnackbar("User updated successfully.");
      } else {
        const payload: UserCreate = {
          ...common,
          email: formData.email,
          password: formData.password,
        };
        await userService.createUser(payload);
        setSnackbar("User saved successfully.");
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
    <BaseForm<FormData>
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
        saveTooltipCreate: "Finish & Create",
        saveTooltipEdit: "Update Changes",
      }}
      onCancelNavigate={() => navigate("/users")}
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this user?"
          : "Are you sure you want to create this user?"
      }
    />
  );
}
