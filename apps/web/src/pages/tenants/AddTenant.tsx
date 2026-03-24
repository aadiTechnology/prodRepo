import { useState, useEffect, useCallback, useMemo } from "react";
import {
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
import {
  confirmPasswordMatchRules,
  emailRequiredPatternRules,
  newPasswordRules,
  optionalPhonePatternRules,
} from "../../utils/formValidationPresets";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import {
  createAddTenantFormConfig,
  type AddTenantFormData,
} from "./AddTenant.formConfig";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const emptyForm = (): AddTenantFormData => ({
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

  const validationConfig = useMemo<FormValidationConfig<AddTenantFormData>>(() => {
    const cfg: FormValidationConfig<AddTenantFormData> = {
      name: [
        { type: "required", message: "Required." },
        { type: "minLength", value: 3, message: "Min 3 characters." },
      ],
      owner_name: [{ type: "required", message: "Required." }],
      email: emailRequiredPatternRules<AddTenantFormData>(),
      phone: optionalPhonePatternRules<AddTenantFormData>(),
    };
    if (!isEditMode) {
      cfg.admin_password = newPasswordRules<AddTenantFormData>();
      cfg.confirm_password = confirmPasswordMatchRules<AddTenantFormData>("admin_password");
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
  } = useFormManager<AddTenantFormData>({
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

  const formConfig = useMemo(
    () =>
      createAddTenantFormConfig({
        isEditMode,
        mediaTab,
        setMediaTab,
        uploadItems,
        handleAddMediaFiles,
        handleRemoveMediaItem,
        templates,
      }),
    [isEditMode, mediaTab, uploadItems, templates, handleAddMediaFiles, handleRemoveMediaItem]
  );

  const fetchTenant = useCallback(async () => {
    if (!id) return;
    try {
      setFetchLoading(true);
      const data = await tenantService.get(Number(id));
      const d: AddTenantFormData = {
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
    <BaseForm<AddTenantFormData>
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
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Save",
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
