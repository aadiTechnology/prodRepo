import { useState, useEffect, useCallback, useMemo } from "react";
import { FormHeaderIconAction, Box } from "../components/primitives";
import {
  SaveButton,
  CancelButton,
  EmailInput,
  PasswordInput,
  LabeledSwitch,
  SelectItem,
  type SelectItemOption,
} from "../components/semantic";
import { useNavigate, useLocation } from "react-router-dom";
import userService from "../api/services/userService";
import { UserCreate } from "../types/user";
import { User } from "../types/auth";
import roleService from "../api/services/roleService";
import ConfirmDialog from "../components/semantic/ConfirmDialog";
import { PageHeader } from "../components/layout";
import { ListPageLayout } from "../components/reusable";
import { Alert, Snackbar } from "@mui/material";
import Grid from "@mui/material/Grid2";
import TextFieldInput from "../components/semantic/TextFieldInput";
import {
  validateField,
  validateForm,
  mapApiErrorsToFields,
  type FormValidationConfig,
} from "../utils/formValidation";

type FormData = {
  email: string;
  full_name: string;
  password: string;
  confirm_password: string;
  role_code: string;
  is_active: boolean;
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [formData, setFormData] = useState<FormData>(() =>
    isEditMode && editUser ? formFromUser(editUser) : emptyForm()
  );

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [roleOptions, setRoleOptions] = useState<SelectItemOption[]>([]);
  const [roleOptionsLoading, setRoleOptionsLoading] = useState(false);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const n = name as keyof FormData;
    const v = type === "checkbox" ? checked : value;
    setFormData((prev) => {
      const next = { ...prev, [n]: v } as FormData;
      setFieldErrors((fe) => {
        const updated = { ...fe, [n]: validateField(validationConfig, n, next) };
        if (n === "password" || n === "confirm_password") {
          updated.password = validateField(validationConfig, "password", next);
          updated.confirm_password = validateField(validationConfig, "confirm_password", next);
        }
        return updated;
      });
      return next;
    });
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors = validateForm(validationConfig, formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
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

  const handleCancelDialog = () => {
    setConfirmOpen(false);
  };

  const renderRoleSelect = () => (
    <SelectItem
      label="Role"
      name="role_code"
      value={formData.role_code}
      options={roleOptions}
      loading={roleOptionsLoading}
      loadingLabel="Loading roles..."
      emptyListLabel="No roles found"
      onValueChange={(v) => {
        setFormData((prev) => {
          const next = { ...prev, role_code: v };
          setFieldErrors((fe) => ({
            ...fe,
            role_code: validateField(validationConfig, "role_code", next),
          }));
          return next;
        });
        setError(null);
      }}
      required
      error={Boolean(fieldErrors.role_code)}
      helperText={fieldErrors.role_code || undefined}
    />
  );

  return (
    <>
      <ListPageLayout
        pageBackground={true}
        contentPaddingSize="none"
        scrollableFormContent
        header={
          <Box sx={{ mb: 2 }}>
            <PageHeader
              links={[
                { title: "Users", path: "/users" },
                { title: isEditMode ? "Edit User" : "Add User", path: "#" },
              ]}
              homePath="/"
              actions={
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <FormHeaderIconAction
                    variant="cancel"
                    onClick={() => navigate("/users")}
                    tooltipTitle="Cancel"
                  />
                  <FormHeaderIconAction
                    variant="save"
                    onClick={handleSubmit}
                    loading={loading}
                    tooltipTitle={isEditMode ? "Update Changes" : "Finish & Create"}
                  />
                </Box>
              }
            />
            {error && (
              <Alert
                severity="error"
                variant="filled"
                sx={{ mt: 2, borderRadius: "12px" }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
          </Box>
        }
      >
        <form onSubmit={handleSubmit} autoComplete="off">
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TextFieldInput
                  label="Full name"
                  placeholder="Enter full name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  htmlInput={{ minLength: 2 }}
                  error={Boolean(fieldErrors.full_name)}
                  helperText={fieldErrors.full_name}
                />
                <EmailInput
                  label="Email address"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isEditMode}
                  placeholder="user@example.com"
                  error={Boolean(fieldErrors.email)}
                  helperText={
                    isEditMode ? "Account identifier cannot be changed" : fieldErrors.email
                  }
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {!isEditMode ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <PasswordInput
                    label="Password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter secure password"
                    error={Boolean(fieldErrors.password)}
                    helperText={fieldErrors.password}
                  />
                  <PasswordInput
                    label="Confirm password"
                    name="confirm_password"
                    placeholder="Repeat password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    required
                    error={Boolean(fieldErrors.confirm_password)}
                    helperText={fieldErrors.confirm_password}
                  />
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {renderRoleSelect()}
                  <LabeledSwitch
                    label="Account active"
                    checked={formData.is_active}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, is_active: e.target.checked }));
                      setError(null);
                    }}
                    name="is_active"
                  />
                </Box>
              )}
            </Grid>
            {!isEditMode && (
              <Grid size={{ xs: 12, sm: 6 }}>{renderRoleSelect()}</Grid>
            )}
          </Grid>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", mt: 4 }}>
            <SaveButton type="submit" disabled={false} loading={loading}>
              {isEditMode ? "Save changes" : "Finish & create"}
            </SaveButton>
            <CancelButton onClick={() => navigate("/users")} disabled={loading}>
              Cancel
            </CancelButton>
          </Box>
        </form>
      </ListPageLayout>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={confirmOpen}
        onClose={handleCancelDialog}
        onConfirm={handleConfirm}
        message={
          isEditMode
            ? "Are you sure you want to update this user?"
            : "Are you sure you want to create this user?"
        }
        confirmLabel="Confirm"
        loading={loading}
      />
    </>
  );
}
