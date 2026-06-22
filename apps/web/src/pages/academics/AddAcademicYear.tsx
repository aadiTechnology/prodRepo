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
  const isEditMode = !!id && id !== "new";
  const validId = !!id && id !== "new";

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
            data.start_date && data.end_date && new Date(data.end_date) < new Date(data.start_date)
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
    resetForm,
  } = useFormManager<AddAcademicYearFormData>({
    initialValues,
    validationConfig,
    dependentFieldPairs: [["start_date", "end_date"]],
    onClearError: () => setError(null),
  });

  const formConfig = useMemo(
    () => createAddAcademicYearFormConfig({ isEditMode }),
    [isEditMode]
  );

  const fetchAcademicYear = useCallback(async () => {
    if (!validId) return;
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
      let message = "Failed to load academic year.";
      if (err && typeof err === "object") {
        if ("message" in err && typeof err.message === "string") message = err.message;
        else if (typeof err.toString === "function") message = err.toString();
      }
      setError(message);
    } finally {
      setFetchLoading(false);
    }
  }, [id, setFormData, validId]);

  useEffect(() => {
    if (isEditMode) {
      fetchAcademicYear();
    }
  }, [fetchAcademicYear, isEditMode]);

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (validId) {
        await academicYearService.update(Number(id), {
          name: formData.name.trim(),
          code: formData.code.trim(),
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_active: formData.is_active,
        });
        setSnackbar("Academic year updated successfully.");
      } else {
        await academicYearService.create({
          name: formData.name.trim(),
          code: formData.code.trim(),
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_active: true,
        });
        setSnackbar("Academic year created successfully.");
      }
      window.setTimeout(() => navigate("/academic-years"), 1200);
    } catch (err: unknown) {
      let apiFieldErrors, message;
      try {
        const mapped = mapApiErrorsToFields(err);
        apiFieldErrors = mapped.fieldErrors;
        message = mapped.message;
      } catch {
        message = (err && typeof err === "object" && "message" in err && typeof err.message === "string") ? err.message : "An unknown error occurred.";
      }
      if (apiFieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      }
      if (!apiFieldErrors || Object.keys(apiFieldErrors).length === 0) {
        setError(
          message || (isEditMode ? "Failed to update academic year." : "Failed to create academic year.")
        );
      } else {
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setError(null);
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
        saveTooltipEdit: "Save",
      }}
      onCancelNavigate={handleCancel}
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this academic year?"
          : "Are you sure you want to create this academic year?"
      }
      submitLabelCreate="Save"
      submitLabelEdit="Save"
    />
  );
};

export default AddAcademicYear;
