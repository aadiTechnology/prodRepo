import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MediaUploadUrlField,
  type MediaUploadSlotItem,
} from "../../components/semantic";
import { useNavigate, useParams } from "react-router-dom";
import tenantService from "../../api/services/tenantService";
import themeTemplateService from "../../api/services/themeTemplateService";
import type { ThemeTemplate } from "../../types/themeTemplate";
import {
  mapApiErrorsToFields,
  type FormValidationConfig,
} from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import type { FormConfig } from "../../components/reusable/formFramework.types";

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
  const [mediaTab, setMediaTab] = useState(0);
  const [uploadItems, setUploadItems] = useState<MediaUploadSlotItem[]>([]);
  const [templates, setTemplates] = useState<ThemeTemplate[]>([]);

  const initialValues = useMemo(() => emptyForm(), []);

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

  const dependentFieldPairs = useMemo(
    () => (!isEditMode ? ([["admin_password", "confirm_password"]] as const) : []),
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

  const handleRemoveMediaItem = useCallback((itemId: string) => {
    setUploadItems((prev) => prev.filter((x) => x.id !== itemId));
  }, []);

  const handleAddMediaFiles = useCallback(async (files: FileList | File[]) => {
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
  }, []);

  const formConfig = useMemo<FormConfig<FormData>>(
    () => ({
      fields: {
        name: {
          name: "name",
          label: "Tenant name",
          type: "text",
          placeholder: "e.g. Little Stars Academy",
          required: true,
          props: { htmlInput: { minLength: 3 } },
        },
        owner_name: {
          name: "owner_name",
          label: "Owner name",
          type: "text",
          placeholder: "Full name of the principal or owner",
          required: true,
          props: { htmlInput: { minLength: 1 } },
        },
        email: {
          name: "email",
          label: "Email address",
          type: "email",
          placeholder: "admin@school.com",
          required: true,
          props: { disabled: isEditMode },
          helperText: (ctx) =>
            ctx.isEditMode ? "Account identifier cannot be changed" : undefined,
        },
        phone: {
          name: "phone",
          label: "Phone number",
          type: "phone",
          placeholder: "Official contact number",
        },
        admin_password: {
          name: "admin_password",
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
        address_line1: {
          name: "address_line1",
          label: "Address line 1",
          type: "text",
          placeholder: "e.g. 123 Education Lane",
          props: { htmlInput: { minLength: 0 } },
        },
        address_line2: {
          name: "address_line2",
          label: "Address line 2",
          type: "text",
          placeholder: "Building, floor or suite",
          props: { htmlInput: { minLength: 0 } },
        },
        state: {
          name: "state",
          label: "State",
          type: "text",
          placeholder: "Maharashtra",
          props: { htmlInput: { minLength: 0 } },
        },
        city: {
          name: "city",
          label: "City",
          type: "text",
          placeholder: "Mumbai",
          props: { htmlInput: { minLength: 0 } },
        },
        pin_code: {
          name: "pin_code",
          label: "Pin code",
          type: "text",
          placeholder: "400001",
          props: { htmlInput: { maxLength: 20, minLength: 0 } },
        },
        theme_template_id: {
          name: "theme_template_id",
          label: "Branding template",
          type: "select",
          required: false,
          props: {
            coerceToNumber: true,
            disableWhenEmpty: false,
            emptyOptionLabel: "Default theme",
            required: false,
            options: templates.map((t) => ({
              id: String(t.id),
              value: String(t.id),
              label: t.name,
            })),
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
          fieldNames: ["name", "owner_name"],
        },
        {
          kind: "custom",
          grid: { xs: 12, md: 6 },
          show: () => true,
          render: (ctx) => (
            <MediaUploadUrlField
              label="Logo"
              tabIndex={mediaTab}
              onTabChange={setMediaTab}
              urlValue={ctx.formData.logo_url.startsWith("data:") ? "" : ctx.formData.logo_url}
              urlFieldName="logo_url"
              onUrlChange={ctx.handleChange}
              urlError={ctx.fieldErrors.logo_url}
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
          ),
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["email"],
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["phone"],
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["admin_password"],
          show: (c) => !c.isEditMode,
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["confirm_password"],
          show: (c) => !c.isEditMode,
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["address_line1"],
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["address_line2"],
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["state"],
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["city"],
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["pin_code"],
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["theme_template_id"],
        },
        {
          kind: "fields",
          grid: { xs: 12, sm: 6 },
          fieldNames: ["is_active"],
          show: (c) => c.isEditMode,
        },
      ],
    }),
    [isEditMode, mediaTab, uploadItems, templates, handleAddMediaFiles, handleRemoveMediaItem]
  );

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
  }, [id, setFormData]);

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
  }, [mediaTab, uploadItems, setFormData]);

  const handleConfirmSubmit = async () => {
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
      fetchLoading={fetchLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Tenants", path: "/tenants" },
          { title: isEditMode ? "Edit Tenant" : "Add Tenant", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Finish & Create",
        saveTooltipEdit: "Update Changes",
      }}
      onCancelNavigate={() => navigate("/tenants")}
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this tenant?"
          : "Are you sure you want to create this tenant?"
      }
    />
  );
}
