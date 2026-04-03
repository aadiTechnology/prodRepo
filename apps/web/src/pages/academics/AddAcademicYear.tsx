import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import academicYearService from "../../api/services/academicYearService";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import {
  createAddAcademicYearFormConfig,
  type AddAcademicYearFormData,
} from "./AddAcademicYear.formConfig";

const AddAcademicYear = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id && id !== "new");

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const initialValues = useMemo<AddAcademicYearFormData>(
    () => ({
      name: "",
      code: "",
      start_date: "",
      end_date: "",
      is_active: true,
    }),
    []
  );

  const validationConfig = useMemo<FormValidationConfig<AddAcademicYearFormData>>(
    () => ({
      name: [
        { type: "required", message: "Academic Year Name is required." },
        { type: "minLength", value: 2, message: "Min 2 characters." },
      ],
      code: [
        { type: "required", message: "Code is required." },
        { type: "minLength", value: 2, message: "Min 2 characters." },
      ],
      start_date: [{ type: "required", message: "Start Date is required." }],
      end_date: [
        { type: "required", message: "End Date is required." },
        {
          type: "custom",
          validate: (data) =>
            data.start_date && data.end_date && new Date(data.end_date) <= new Date(data.start_date)
              ? "End date must be after start date."
              : "",
        },
      ],
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
    handleSubmit: baseHandleSubmit,
  } = useFormManager<AddAcademicYearFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  const formConfig = useMemo(
    () => createAddAcademicYearFormConfig({ isEditMode }),
    [isEditMode]
  );

  const fetchAcademicYear = useCallback(async () => {
    if (!id || id === "new") return;
    try {
      setFetchLoading(true);
      const data = await academicYearService.getById(Number(id));
      setFormData({
        name: data.name || "",
        code: data.code || "",
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        is_active: data.is_active ?? true,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load academic year.");
    } finally {
      setFetchLoading(false);
    }
  }, [id, setFormData]);

  useEffect(() => {
    if (isEditMode) {
      fetchAcademicYear();
    }
  }, [fetchAcademicYear, isEditMode]);

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
      };

      if (isEditMode && id && id !== "new") {
        await academicYearService.update(Number(id), payload);
        setSnackbar("Academic Year updated successfully.");
      } else {
        await academicYearService.create(payload);
        setSnackbar("Academic Year created successfully.");
      }
      setTimeout(() => navigate("/academic-years"), 1000);
    } catch (err: unknown) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      if (apiFieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      }
      setError(
        message || (isEditMode ? "Failed to update academic year." : "Failed to create academic year.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<AddAcademicYearFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={baseHandleSubmit}
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
          { title: "Academic Years", path: "/academic-years" },
          { title: isEditMode ? "Edit Academic Year" : "Add Academic Year", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Save Changes",
      }}
      onCancelNavigate={() => navigate("/academic-years")}
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this academic year?"
          : "Are you sure you want to create this academic year?"
      }
      submitLabelCreate="Save"
      submitLabelEdit="Save Changes"
    />
  );
};

export default AddAcademicYear;
