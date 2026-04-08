import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useReportProjectSelection } from "../../hooks/useReportProjectSelection";
import sprintService from "../../api/services/sprintService";
import { createSprintFormConfig, type SprintFormData } from "./SprintForm.formConfig";

const emptyForm = (): SprintFormData => ({
  sprint_name: "",
  start_date: "",
  end_date: "",
  is_active: true,
});

export default function SprintForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const { projectId } = useReportProjectSelection();

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const initialValues = useMemo(() => emptyForm(), []);

  const validationConfig = useMemo<FormValidationConfig<SprintFormData>>(
    () => ({
      sprint_name: [
        { type: "required", message: "Required." },
        { type: "minLength", value: 1, message: "Required." },
      ],
    }),
    []
  );

  const { formData, setFormData, fieldErrors, setFieldErrors, handleChange, handleFieldValueChange, handleSubmit } =
    useFormManager<SprintFormData>({
      initialValues,
      validationConfig,
      dependentFieldPairs: [],
      onClearError: () => setError(null),
    });

  const formConfig = useMemo(() => createSprintFormConfig(), []);

  const fetchSprint = useCallback(async () => {
    if (!isEditMode || !id) return;
    if (projectId == null) {
      setError("Please select a project first.");
      setFetchLoading(false);
      return;
    }
    try {
      setFetchLoading(true);
      const s = await sprintService.get(projectId, Number(id));
      setFormData({
        sprint_name: s.sprint_name || "",
        start_date: s.start_date || "",
        end_date: s.end_date || "",
        is_active: Boolean(s.is_active ?? true),
      });
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to load sprint.");
    } finally {
      setFetchLoading(false);
    }
  }, [id, isEditMode, projectId, setFormData]);

  useEffect(() => {
    fetchSprint();
  }, [fetchSprint]);

  const handleConfirmSubmit = async () => {
    if (projectId == null) {
      setError("Please select a project first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        sprint_name: formData.sprint_name,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
      };
      if (isEditMode && id) {
        await sprintService.update(projectId, Number(id), payload);
        setSnackbar("Sprint updated successfully!");
      } else {
        await sprintService.create(projectId, payload);
        setSnackbar("Sprint created successfully!");
      }
      setTimeout(() => navigate("/sprints"), 800);
    } catch (err: unknown) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
      setError(message || (isEditMode ? "Failed to update sprint." : "Failed to create sprint."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<SprintFormData>
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
          { title: "Sprints", path: "/sprints" },
          { title: isEditMode ? "Edit Sprint" : "Add Sprint", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Save",
      }}
      onCancelNavigate={() => navigate("/sprints")}
      confirmMessage={(ctx) =>
        ctx.isEditMode ? "Are you sure you want to update this sprint?" : "Are you sure you want to create this sprint?"
      }
    />
  );
}

