import { useState, useEffect, useCallback, useMemo } from "react";
import { FormHeaderIconAction, Box, CircularProgress } from "../../components/primitives";
import {
  SaveButton,
  CancelButton,
  EmailInput,
  PhoneInput,
  PasswordInput,
  LabeledSwitch,
  SelectItem,
  MediaUploadUrlField,
  type MediaUploadSlotItem,
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
import type { ThemeTemplate } from "../../types/themeTemplate";
import {
  validateField,
  validateForm,
  mapApiErrorsToFields,
  type FormValidationConfig,
} from "../../utils/formValidation";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export default function AddTenant() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mediaTab, setMediaTab] = useState(0);
  const [uploadItems, setUploadItems] = useState<MediaUploadSlotItem[]>([]);

  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [templates, setTemplates] = useState<ThemeTemplate[]>([]);

  const validationConfig = useMemo<FormValidationConfig<FormData>>(() => {
    const cfg: FormValidationConfig<FormData> = {
      name: [
        { type: "required", message: "Required." },
        { type: "minLength", value: 3, message: "Min 3 characters." },
      ],
      owner_name: [{ type: "required", message: "Required." }],
      email: [
        { type: "required", message: "Required." },
        { type: "pattern", regex: EMAIL_PATTERN, message: "Invalid email." },
      ],
      phone: [
        {
          type: "custom",
          validate: (fd) => {
            const phone = fd.phone as string;
            if (!phone) return "";
            if (!/^\d+$/.test(phone)) return "Numeric only.";
            if (phone.length < 10 || phone.length > 15) return "10–15 digits.";
            return "";
          },
        },
      ],
    };
    if (!isEditMode) {
      cfg.admin_password = [
        { type: "required", message: "Required." },
        { type: "minLength", value: 8, message: "Min 8 characters." },
      ];
      cfg.confirm_password = [
        { type: "required", message: "Required." },
        { type: "matchField", field: "admin_password", message: "Passwords don't match." },
      ];
    }
    return cfg;
  }, [isEditMode]);

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
      if (d.logo_url?.startsWith("data:")) {
        setUploadItems([{ id: crypto.randomUUID(), previewUrl: d.logo_url }]);
        setMediaTab(0);
      } else {
        setUploadItems([]);
        if (d.logo_url) setMediaTab(1);
        else setMediaTab(0);
      }
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

  useEffect(() => {
    if (mediaTab !== 0) return;
    setFormData((prev) => {
      const first = uploadItems[0]?.previewUrl;
      if (first) {
        return { ...prev, logo_url: first };
      }
      if (prev.logo_url.startsWith("data:")) {
        return { ...prev, logo_url: "" };
      }
      return prev;
    });
  }, [mediaTab, uploadItems]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const n = name as keyof FormData;
    const v = type === "checkbox" ? checked : value;
    setFormData((prev) => {
      const next = { ...prev, [n]: v } as FormData;
      setFieldErrors((fe) => {
        const updated = { ...fe, [n]: validateField(validationConfig, n, next) };
        if (n === "admin_password" || n === "confirm_password") {
          updated.admin_password = validateField(validationConfig, "admin_password", next);
          updated.confirm_password = validateField(validationConfig, "confirm_password", next);
        }
        return updated;
      });
      return next;
    });
    setError(null);
  };

  const handleAddMediaFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 1);
    const newItems: MediaUploadSlotItem[] = [];
    for (const file of arr) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Image size should be less than 2MB");
        continue;
      }
      try {
        const previewUrl = await readFileAsDataUrl(file);
        newItems.push({ id: crypto.randomUUID(), previewUrl });
      } catch {
        setError("Failed to read file.");
      }
    }
    if (newItems.length) {
      setUploadItems(newItems);
      setMediaTab(0);
      setError(null);
    }
  };

  const handleRemoveMediaItem = (itemId: string) => {
    setUploadItems((prev) => prev.filter((x) => x.id !== itemId));
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
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
      setError(
        message || (isEditMode ? "Failed to update tenant." : "Failed to provision tenant.")
      );
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <MediaUploadUrlField
                label="Logo"
                tabIndex={mediaTab}
                onTabChange={setMediaTab}
                urlValue={formData.logo_url.startsWith("data:") ? "" : formData.logo_url}
                urlFieldName="logo_url"
                onUrlChange={handleChange}
                urlError={fieldErrors.logo_url}
                urlInputLabel="Image URL"
                urlPlaceholder="https://example.com/logo.png"
                items={uploadItems}
                onAddFiles={handleAddMediaFiles}
                onRemoveItem={handleRemoveMediaItem}
                accept="image/*"
                multiple={false}
                maxFiles={1}
                tooltipChoose="Choose logo"
                tooltipAdd="Replace logo"
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
              <SelectItem
                label="Branding template"
                name="theme_template_id"
                required={false}
                disableWhenEmpty={false}
                emptyOptionLabel="Default theme"
                options={templates.map((t) => ({
                  id: String(t.id),
                  value: String(t.id),
                  label: t.name,
                }))}
                value={formData.theme_template_id === null ? "" : String(formData.theme_template_id)}
                onValueChange={(v) => {
                  setFormData((prev) => ({
                    ...prev,
                    theme_template_id: v === "" ? null : Number(v),
                  }));
                  setError(null);
                }}
              />
            </Grid>
            {isEditMode &&
            <Grid size={{ xs: 12, sm: 6 }}>
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
            }
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
