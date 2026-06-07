import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import BaseForm from "../../components/reusable/BaseForm";
import marketingHubService from "../../api/services/marketingHubService";
import { useFormManager } from "../../hooks/useFormManager";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import {
  normalizeIntegrationUrl,
  validateIntegrationUrl,
} from "./marketingHub.utils";
import {
  createMarketingPlatformFormConfig,
  type MarketingPlatformFormData,
} from "./MarketingPlatformFormPage.formConfig";

const emptyForm = (): MarketingPlatformFormData => ({
  name: "",
  code: "",
  category: "Social Media",
  description: "",
  sort_order: 10,
  integration_url: "",
  link_active: true,
});

export default function MarketingPlatformFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<number | null>(null);

  const initialValues = useMemo(() => emptyForm(), []);

  const validationConfig = useMemo<FormValidationConfig<MarketingPlatformFormData>>(
    () => ({
      name: [{ type: "required", message: "Platform name is required." }],
      code: [{ type: "required", message: "Unique code is required." }],
      category: [{ type: "required", message: "Category is required." }],
    }),
    []
  );

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<MarketingPlatformFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  const formConfig = useMemo(
    () => createMarketingPlatformFormConfig({ isEditMode }),
    [isEditMode]
  );

  useEffect(() => {
    if (!isEditMode || !id) return;

    const platformId = Number(id);
    if (Number.isNaN(platformId)) {
      setError("Invalid platform id.");
      setFetchLoading(false);
      return;
    }

    const load = async () => {
      setFetchLoading(true);
      setError(null);
      try {
        const all = await marketingHubService.getMarketingConfig();
        const row = all.find((item) => item.platform_id === platformId);
        if (!row) {
          throw new Error("Platform not found.");
        }

        setFormData({
          name: row.name,
          code: row.code,
          category: row.category,
          description: row.description || "",
          sort_order: row.sort_order,
          integration_url: row.url ? normalizeIntegrationUrl(row.url) : "",
          link_active: row.link_active ?? true,
        });
        setLinkId(row.link_id);
      } catch (err: unknown) {
        const detail = (err as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail;
        const message = (err as { message?: string })?.message;
        setError(detail || message || "Failed to load platform");
      } finally {
        setFetchLoading(false);
      }
    };

    void load();
  }, [isEditMode, id, setFormData]);

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const trimmedUrl = formData.integration_url.trim();
      if (trimmedUrl) {
        const validationError = validateIntegrationUrl(trimmedUrl);
        if (validationError) {
          setFieldErrors((prev) => ({ ...prev, integration_url: validationError }));
          setError(validationError);
          setLoading(false);
          return;
        }
      }

      const normalizedUrl = trimmedUrl ? normalizeIntegrationUrl(trimmedUrl) : "";

      if (isEditMode && id) {
        const platformId = Number(id);
        if (Number.isNaN(platformId)) {
          setError("Invalid platform id.");
          setLoading(false);
          return;
        }

        try {
          await marketingHubService.updatePlatform(platformId, {
            name: formData.name.trim(),
            category: formData.category,
            description: formData.description.trim() || undefined,
            sort_order: Number(formData.sort_order),
          });
        } catch (platformErr: unknown) {
          const status = (platformErr as { response?: { status?: number } })?.response?.status;
          if (status !== 404) {
            throw platformErr;
          }
        }

        if (normalizedUrl) {
          await marketingHubService.saveMarketingLink({
            platform_id: platformId,
            url: normalizedUrl,
            is_active: formData.link_active,
          });
        } else if (linkId) {
          await marketingHubService.deleteMarketingLink(linkId);
        }

        setSnackbar("Platform updated successfully.");
      } else {
        const created = await marketingHubService.createPlatform({
          name: formData.name.trim(),
          code: formData.code.trim().toLowerCase(),
          category: formData.category,
          description: formData.description.trim() || undefined,
          sort_order: Number(formData.sort_order),
        });

        if (normalizedUrl) {
          await marketingHubService.saveMarketingLink({
            platform_id: created.id,
            url: normalizedUrl,
            is_active: formData.link_active,
          });
        }

        setSnackbar("Platform added successfully.");
      }

      setTimeout(() => navigate("/marketing/hub"), 800);
    } catch (err: unknown) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      if (apiFieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      }
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(message || detail || "Failed to save platform");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<MarketingPlatformFormData>
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
          { title: "Digital Marketing Hub", path: "/marketing/hub" },
          { title: isEditMode ? "Edit Platform" : "Add Platform", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Add Platform",
        saveTooltipEdit: "Update Platform",
      }}
      onCancelNavigate={() => navigate("/marketing/hub")}
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this platform?"
          : "Are you sure you want to add this platform?"
      }
      submitLabelCreate="Add Platform"
      submitLabelEdit="Update Platform"
      gridSpacing={3}
    />
  );
}
