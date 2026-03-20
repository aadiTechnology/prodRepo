import { useState, useEffect } from "react";
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
import SelectItem from "../components/semantic/SelectItem";

type FormData = {
  email: string;
  full_name: string;
  password: string;
  confirm_password: string;
  role_code: string;
  is_active: boolean;
};

export default function CreateUser() {
  const location = useLocation();
  const locationState = location.state as { user?: User; isEdit?: boolean } | null;
  const isEdit = locationState?.isEdit === true;
  const editUser = locationState?.user ?? null;
  const navigate = useNavigate();

  // UI States
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<React.FormEvent | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState<FormData>({
    email: editUser?.email ?? "",
    full_name: editUser?.full_name ?? "",
    password: "",
    confirm_password: "",
    role_code: editUser?.role ?? "",
    is_active: editUser?.is_active ?? true,
  });

  const [roles, setRoles] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Store original values for edit mode
  const [originalValues, setOriginalValues] = useState<FormData>({
    email: editUser?.email ?? "",
    full_name: editUser?.full_name ?? "",
    password: "",
    confirm_password: "",
    role_code: editUser?.role ?? "",
    is_active: editUser?.is_active ?? true,
  });

  // --- Success Toast Handler ---
  const showSuccessToast = (message: string) => setSnackbar(message);

  // Fetch roles
  useEffect(() => {
    async function fetchRoles() {
      setLoadingRoles(true);
      try {
        const res = await roleService.getRoles({});
        const mappedRoles = (res.items || []).map((role: any) => ({
          id: role.id,
          code: role.code || role.name || role.scope || String(role.id),
          name: role.name,
        }));
        setRoles(mappedRoles);
      } catch (e) {
        setError("Failed to fetch roles");
      } finally {
        setLoadingRoles(false);
      }
    }
    fetchRoles();
  }, []);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  // Check if form is changed in edit mode
  const isFormChanged = isEdit
    ? (
        formData.full_name !== originalValues.full_name ||
        formData.role_code !== originalValues.role_code ||
        formData.is_active !== originalValues.is_active
      )
    : true;

  // Validation
  const isFullNameValid = formData.full_name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const isRoleValid = formData.role_code.trim().length > 0;

  const isFormValid = isEdit
    ? (isFullNameValid && isRoleValid)
    : (isFullNameValid && isEmailValid && formData.password && formData.password === formData.confirm_password && isRoleValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!isFullNameValid) {
      setError("Full Name is required (min 2 characters)");
      return;
    }

    if (!isEdit) {
      if (!isEmailValid) {
        setError("Valid email address is required");
        return;
      }
      if (!formData.password) {
        setError("Password is required");
        return;
      }
      if (formData.password !== formData.confirm_password) {
        setError("Passwords do not match");
        return;
      }
    }

    if (!isRoleValid) {
      setError("Role is required");
      return;
    }

    setConfirmOpen(true);
    setPendingSubmit(e);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
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
    } catch (err: any) {
      setError(err?.message || err?.detail || (isEdit ? "Failed to update user." : "Failed to create user."));
    } finally {
      setLoading(false);
      setPendingSubmit(null);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingSubmit(null);
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
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6}}>
                <EmailInput value={formData.email} onChange={handleChange} required disabled={isEdit} />
              </Grid>
              {!isEdit && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PasswordInput value={formData.password} onChange={handleChange} required />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PasswordInput
                      label="Confirm Password"
                      placeholder="Confirm password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                </>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <SelectItem
                  value={formData.role_code}
                  roles={roles}
                  loadingRoles={loadingRoles}
                  onValueChange={(role_code) => {
                    setFormData((prev) => ({ ...prev, role_code }));
                    setError(null);
                  }}
                  required
                />
              </Grid>
              {isEdit && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <LabeledSwitch
                    label="Account Active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
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