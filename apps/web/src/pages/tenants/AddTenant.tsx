import { useState, useEffect, useCallback } from "react";
import { FormHeaderIconAction, Box, CircularProgress } from "../../components/primitives";
import {
  SaveButton,
  CancelButton,
  EmailInput,
  PhoneInput,
  PasswordInput,
  LabeledSwitch,
} from "../../components/semantic";
import { Alert, Snackbar } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import tenantService from "../../api/services/tenantService";
import themeTemplateService from "../../api/services/themeTemplateService";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import TextFieldInput from "../../components/semantic/TextFieldInput";
import ThemeTemplateSelect from "../../components/semantic/ThemeTemplateSelect";
import TenantLogoField from "../../components/semantic/TenantLogoField";
import type { ThemeTemplate } from "../../types/themeTemplate";

type FormData = {
  name: string;
  owner_name: string;
  email: string;
  admin_password: string;
  confirm_password: string;
  phone: string;
  description: string;
  is_active: boolean;
  logo_url: string;
  theme_template_id: number | null;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pin_code: string;
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

const emptyForm = (): FormData => ({
  name: "",
  owner_name: "",
  email: "",
  admin_password: "",
  confirm_password: "",
  phone: "",
  description: "",
  is_active: true,
  logo_url: "",
  theme_template_id: null,
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pin_code: "",
});

function mapProvisionError(err: unknown, isEditMode: boolean): { fieldPatch: FieldErrors; message: string } {
  const e = err as { message?: string; response?: { data?: { detail?: unknown } } };
  const fieldPatch: FieldErrors = {};
  let msg = e?.message || "";
  const errorData = e?.response?.data;
  const detail = errorData?.detail;

  if (detail && Array.isArray(detail)) {
    detail.forEach((issue: { loc?: unknown[]; msg?: string }) => {
      const field = issue.loc?.[issue.loc.length - 1];
      if (field && typeof field === "string") {
        fieldPatch[field as keyof FormData] = issue.msg ?? "";
      }
    });
    if (Object.keys(fieldPatch).length > 0) {
      msg = "Please fix the highlighted errors.";
    } else {
      const first = detail[0] as { msg?: string } | undefined;
      msg = first?.msg || msg;
    }
  } else if (typeof detail === "string") {
    msg = detail;
  }

  if (msg.toLowerCase().includes("email already exists")) {
    fieldPatch.email = "Email already exists.";
  }

  return {
    fieldPatch,
    message: msg || (isEditMode ? "Failed to update tenant." : "Failed to provision tenant."),
  };
}

export default function AddTenant() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [logoTab, setLogoTab] = useState(0);

  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [templates, setTemplates] = useState<ThemeTemplate[]>([]);

  const fetchTenant = useCallback(async () => {
    if (!id) return;
    try {
      setFetchLoading(true);
      const data = await tenantService.get(Number(id));
      const d: FormData = {
        name: data.name || "",
        owner_name: data.owner_name || "",
        email: data.email || "",
        admin_password: "",
        confirm_password: "",
        phone: data.phone || "",
        description: data.description || "",
        is_active: data.is_active,
        logo_url: data.logo_url || "",
        theme_template_id: data.theme_template_id ?? null,
        address_line1: data.address_line1 || "",
        address_line2: data.address_line2 || "",
        city: data.city || "",
        state: data.state || "",
        pin_code: data.pin_code || "",
      };
      setFormData(d);
      if (d.logo_url) setLogoTab(d.logo_url.startsWith("data:") ? 0 : 1);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to load tenant.";
      setError(msg);
    } finally {
      setFetchLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode) fetchTenant();
  }, [fetchTenant, isEditMode]);

  useEffect(() => {
    themeTemplateService
      .list({ page_size: 500 })
      .then((r: { items?: ThemeTemplate[] }) => setTemplates(r.items || []))
      .catch(() => setTemplates([]));
  }, []);

  const validateField = (name: keyof FormData, data: FormData): string => {
    let e = "";
    if (name === "name") {
      if (!data.name) e = "Required.";
      else if (data.name.length < 3) e = "Min 3 characters.";
    } else if (name === "owner_name") {
      if (!data.owner_name) e = "Required.";
    } else if (name === "email") {
      if (!data.email) e = "Required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e = "Invalid email.";
    } else if (name === "phone" && data.phone) {
      if (!/^\d+$/.test(data.phone)) e = "Numeric only.";
      else if (data.phone.length < 10 || data.phone.length > 15) e = "10–15 digits.";
    } else if (!isEditMode) {
      if (name === "admin_password") {
        if (!data.admin_password) e = "Required.";
        else if (data.admin_password.length < 8) e = "Min 8 characters.";
      } else if (name === "confirm_password") {
        if (!data.confirm_password) e = "Required.";
        else if (data.confirm_password !== data.admin_password) e = "Passwords don't match.";
      }
    }
    return e;
  };

  const validateForm = (): boolean => {
    const keys: (keyof FormData)[] = ["name", "owner_name", "email", "phone"];
    if (!isEditMode) keys.push("admin_password", "confirm_password");
    const next: FieldErrors = {};
    keys.forEach((k) => {
      const err = validateField(k, formData);
      if (err) next[k] = err;
    });
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const applyFieldErrorsAfterChange = (name: keyof FormData, data: FormData) => {
    setFieldErrors((fe) => {
      const updated = { ...fe, [name]: validateField(name, data) };
      if (name === "admin_password" || name === "confirm_password") {
        updated.admin_password = validateField("admin_password", data);
        updated.confirm_password = validateField("confirm_password", data);
      }
      return updated;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const n = name as keyof FormData;
    const v = type === "checkbox" ? checked : value;
    setFormData((prev) => {
      const next = { ...prev, [n]: v } as FormData;
      applyFieldErrorsAfterChange(n, next);
      return next;
    });
    setError(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, logo_url: reader.result as string }));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setFormData((prev) => ({ ...prev, logo_url: "" }));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setError(null);
    try {
      const common = {
        name: formData.name,
        owner_name: formData.owner_name,
        phone: formData.phone,
        description: formData.description,
        is_active: formData.is_active,
        logo_url: formData.logo_url || null,
        theme_template_id: formData.theme_template_id ?? null,
        address_line1: formData.address_line1 || null,
        address_line2: formData.address_line2 || null,
        city: formData.city || null,
        state: formData.state || null,
        pin_code: formData.pin_code || null,
      };
      if (isEditMode && id) {
        await tenantService.update(Number(id), common);
        setSnackbar("Tenant updated successfully!");
      } else {
        const r = await tenantService.provision({
          ...common,
          email: formData.email,
          admin_password: formData.admin_password,
        });
        setSnackbar(r.message || "Tenant created successfully!");
      }
      setTimeout(() => navigate("/tenants"), 1000);
    } catch (err: unknown) {
      console.error("Provisioning error:", err);
      const { fieldPatch, message } = mapProvisionError(err, isEditMode);
      setFieldErrors((p) => ({ ...p, ...fieldPatch }));
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDialog = () => {
    setConfirmOpen(false);
  };

  if (fetchLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

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
                { title: "Tenants", path: "/tenants" },
                { title: isEditMode ? "Edit Tenant" : "Add Tenant", path: "#" },
              ]}
              homePath="/"
              actions={
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <FormHeaderIconAction
                    variant="cancel"
                    onClick={() => navigate("/tenants")}
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
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextFieldInput
                label="Tenant name"
                placeholder="e.g. Little Stars Academy"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                error={Boolean(fieldErrors.name)}
                helperText={fieldErrors.name}
                htmlInput={{ minLength: 3 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextFieldInput
                label="Owner name"
                placeholder="Full name of the principal or owner"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleChange}
                required
                error={Boolean(fieldErrors.owner_name)}
                helperText={fieldErrors.owner_name}
                htmlInput={{ minLength: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <EmailInput
                label="Email address"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isEditMode}
                placeholder="admin@school.com"
                error={Boolean(fieldErrors.email)}
                helperText={isEditMode ? "Account identifier cannot be changed" : fieldErrors.email}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <PhoneInput
                label="Phone number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Official contact number"
                error={Boolean(fieldErrors.phone)}
                helperText={fieldErrors.phone}
              />
            </Grid>
            {!isEditMode && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <PasswordInput
                    label="Password"
                    name="admin_password"
                    value={formData.admin_password}
                    onChange={handleChange}
                    required
                    placeholder="Enter secure password"
                    error={Boolean(fieldErrors.admin_password)}
                    helperText={fieldErrors.admin_password}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <PasswordInput
                    label="Confirm password"
                    placeholder="Repeat password"
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
            <Grid size={{ xs: 12 }}>
              <LabeledSwitch
                label="Account active"
                checked={formData.is_active}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, is_active: e.target.checked }));
                  setError(null);
                }}
                name="is_active"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TenantLogoField
                logoUrl={formData.logo_url}
                tabIndex={logoTab}
                onTabChange={setLogoTab}
                onLogoUrlChange={handleChange}
                onFileInputChange={handleLogoUpload}
                onClearLogo={handleClearLogo}
                logoUrlError={fieldErrors.logo_url}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextFieldInput
                label="Address line 1"
                placeholder="e.g. 123 Education Lane"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                htmlInput={{ minLength: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextFieldInput
                label="Address line 2"
                placeholder="Building, floor or suite"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                htmlInput={{ minLength: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextFieldInput
                label="State"
                placeholder="Maharashtra"
                name="state"
                value={formData.state}
                onChange={handleChange}
                htmlInput={{ minLength: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextFieldInput
                label="City"
                placeholder="Mumbai"
                name="city"
                value={formData.city}
                onChange={handleChange}
                htmlInput={{ minLength: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextFieldInput
                label="Pin code"
                placeholder="400001"
                name="pin_code"
                value={formData.pin_code}
                onChange={handleChange}
                htmlInput={{ maxLength: 20, minLength: 0 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ThemeTemplateSelect
                templates={templates}
                value={formData.theme_template_id}
                onValueChange={(theme_template_id) => {
                  setFormData((prev) => ({ ...prev, theme_template_id }));
                  setError(null);
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", mt: 4 }}>
            <SaveButton type="submit" disabled={false} loading={loading}>
              {isEditMode ? "Save changes" : "Finish & create"}
            </SaveButton>
            <CancelButton onClick={() => navigate("/tenants")} disabled={loading}>
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
            ? "Are you sure you want to update this tenant?"
            : "Are you sure you want to create this tenant?"
        }
        confirmLabel="Confirm"
        loading={loading}
      />
    </>
  );
}
