import { useState, useEffect, useMemo } from "react";
import { FormHeaderIconAction } from "../components/primitives";
import { SaveButton, CancelButton, EmailInput, PasswordInput, LabeledSwitch } from "../components/semantic";
import { useNavigate, useLocation } from "react-router-dom";
import userService from "../api/services/userService";
import { UserCreate } from "../types/user";
import { User } from "../types/auth";
import roleService from "../api/services/roleService";
import ConfirmDialog from "../components/semantic/ConfirmDialog";
import { PageHeader } from "../components/layout";
import { ListPageLayout } from "../components/reusable";
import { Box, Alert, Snackbar } from "@mui/material";
import Grid from "@mui/material/Grid2";
import TextFieldInput from "../components/semantic/TextFieldInput";
import SelectItem, { type SelectItemOption } from "../components/semantic/SelectItem";
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

export default function CreateUser() {
  const location = useLocation();
  const locationState = location.state as { user?: User; isEdit?: boolean } | null;
  const isEdit = locationState?.isEdit === true;
  const editUser = locationState?.user ?? null;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: editUser?.email ?? "",
    full_name: editUser?.full_name ?? "",
    password: "",
    confirm_password: "",
    role_code: editUser?.role ?? "",
    is_active: editUser?.is_active ?? true,
  });

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
    if (!isEdit) {
      cfg.email = [
        { type: "required", message: "Required." },
        { type: "pattern", regex: EMAIL_PATTERN, message: "Invalid email." },
      ];
      cfg.password = [{ type: "required", message: "Required." }];
      cfg.confirm_password = [
        { type: "required", message: "Required." },
        { type: "matchField", field: "password", message: "Passwords don't match." },
      ];
    }
    return cfg;
  }, [isEdit]);

  const showSuccessToast = (message: string) => setSnackbar(message);

  useEffect(() => {
    async function fetchRoles() {
      setRoleOptionsLoading(true);
      try {
        const res = await roleService.getRoles({});
        const mappedRoles = (res.items || []).map((role: { id: unknown; code?: string; name?: string; scope?: string }) => ({
          id: String(role.id),
          value: role.code || role.name || (role.scope != null ? String(role.scope) : "") || String(role.id),
          label: role.name ?? "",
        }));
        setRoleOptions(mappedRoles);
      } catch (e) {
        setError("Failed to fetch roles");
      } finally {
        setRoleOptionsLoading(false);
      }
    }
    fetchRoles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const n = name as keyof FormData;
    let nextSnapshot: FormData | null = null;
    setFormData((prev) => {
      nextSnapshot = { ...prev, [n]: value } as FormData;
      return nextSnapshot;
    });
    if (nextSnapshot) {
      setFieldErrors((fe) => {
        const updated = { ...fe, [n]: validateField(validationConfig, n, nextSnapshot!) };
        if (n === "password" || n === "confirm_password") {
          updated.password = validateField(validationConfig, "password", nextSnapshot!);
          updated.confirm_password = validateField(validationConfig, "confirm_password", nextSnapshot!);
        }
        return updated;
      });
    }
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
      if (isEdit && editUser) {
        await userService.updateUser(editUser.id, {
          full_name: formData.full_name,
          role: formData.role_code,
          is_active: formData.is_active,
        });
        showSuccessToast("User updated successfully.");
      } else {
        const payload: UserCreate = {
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
          role: formData.role_code,
        };
        await userService.createUser(payload);
        showSuccessToast("User saved successfully.");
      }
      setTimeout(() => navigate("/users"), 1200);
    } catch (err: unknown) {
      console.error("User save error:", err);
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
      setError(message || (isEdit ? "Failed to update user." : "Failed to create user."));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
  };

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
                { title: isEdit ? "Edit User" : "Add User", path: "#" },
              ]}
              homePath="/"
              actions={
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <FormHeaderIconAction variant="cancel" onClick={() => navigate("/users")} tooltipTitle="Cancel" />
                  <FormHeaderIconAction
                    variant="save"
                    onClick={handleSubmit}
                    loading={loading}
                    tooltipTitle={isEdit ? "Update Users" : "Save Users"}
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
              <Grid size={{ xs: 12, sm: 6}}>
                <TextFieldInput
                  label="Full Name"
                  placeholder="Enter full name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  htmlInput={{ minLength: 2 }}
                  error={Boolean(fieldErrors.full_name)}
                  helperText={fieldErrors.full_name}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6}}>
                <EmailInput
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isEdit}
                  error={Boolean(fieldErrors.email)}
                  helperText={fieldErrors.email}
                />
              </Grid>
              {!isEdit && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PasswordInput
                      value={formData.password}
                      onChange={handleChange}
                      required
                      error={Boolean(fieldErrors.password)}
                      helperText={fieldErrors.password}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PasswordInput
                      label="Confirm Password"
                      placeholder="Confirm password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      required
                      error={Boolean(fieldErrors.confirm_password)}
                      helperText={fieldErrors.confirm_password}
                    />
                  </Grid>
                </>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <SelectItem
                  label="Role"
                  name="role_code"
                  value={formData.role_code}
                  options={roleOptions}
                  loading={roleOptionsLoading}
                  loadingLabel="Loading roles..."
                  emptyListLabel="No roles found"
                  onValueChange={(role_code) => {
                    let nextSnapshot: FormData | null = null;
                    setFormData((prev) => {
                      nextSnapshot = { ...prev, role_code };
                      return nextSnapshot;
                    });
                    if (nextSnapshot) {
                      setFieldErrors((fe) => ({
                        ...fe,
                        role_code: validateField(validationConfig, "role_code", nextSnapshot!),
                      }));
                    }
                    setError(null);
                  }}
                  required
                  error={Boolean(fieldErrors.role_code)}
                  helperText={fieldErrors.role_code || undefined}
                />
              </Grid>
              {isEdit && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <LabeledSwitch
                    label="Account Active"
                    checked={formData.is_active}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, is_active: e.target.checked }));
                      setError(null);
                    }}
                    name="is_active"
                  />
                </Grid>
              )}
            </Grid>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", mt: 4 }}>
              <SaveButton type="submit" disabled={false} loading={loading}>
                Save
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
        onClose={handleCancel}
        onConfirm={handleConfirm}
        message={
          isEdit ? "Are you sure you want to update this user?" : "Are you sure you want to save this user?"
        }
        confirmLabel="Confirm"
        loading={loading}
      />
    </>
  );
}
