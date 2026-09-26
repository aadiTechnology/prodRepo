import React, { useState, useEffect, useCallback, useMemo } from "react";
import { mapApiErrorsToFields } from "../../utils/formValidation";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  createFeeCategory,
  updateFeeCategory,
  getFeeCategory,
  getAcademicYears,
} from "../../api/services/feeService";
import schoolClassService from "../../api/services/schoolClassService";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import {
  createFeeCategoryFormConfig,
  type FeeCategoryFormData,
} from "./FeeCategory.formConfig";

const resolveCurrentAcademicYearId = (
  years: { id: number; is_current?: boolean | number }[]
): string => {
  const current =
    years.find((y) => y.is_current === true || y.is_current === 1) ?? years[0];
  return current?.id != null ? String(current.id) : "";
};

const AddEditFeeCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const academicYearFromList = (
    location.state as { academic_year_id?: string } | null
  )?.academic_year_id;
  const { buildFormBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();
  const listPath = "/fees/categories";
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<
    { id: number; name: string; is_current?: boolean | number }[]
  >([]);
  const [allClasses, setAllClasses] = useState<
    { id: number; name: string; academic_year_id?: number | null }[]
  >([]);

  const initialValues = useMemo<FeeCategoryFormData>(
    () => ({
      name: "",
      academic_year_id: "",
      class_id: "",
      amount: "",
      status: true,
    }),
    []
  );

  const validationConfig: import("../../utils/formValidation").FormValidationConfig<FeeCategoryFormData> = useMemo(() => ({
    name: [
      { type: "required", message: "Category Name is required." },
      { type: "minLength", value: 2, message: "Min 2 characters." },
      { type: "maxLength", value: 100, message: "Max 100 characters." },
    ],
    academic_year_id: [
      { type: "required", message: "Academic Year is required." },
    ],
    class_id: [
      { type: "required", message: "Class is required." },
    ],
    amount: [
      { type: "required", message: "Amount is required." },
    ],
  }), []);

  const formManager = useFormManager<FeeCategoryFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  const { formData, setFormData, fieldErrors, setFieldErrors, handleChange, handleFieldValueChange, handleSubmit } = formManager;

  const classes = useMemo(() => {
    const ayId = formData.academic_year_id;
    const pool = !ayId
      ? allClasses
      : allClasses.filter(
          (c) => c.academic_year_id != null && String(c.academic_year_id) === String(ayId)
        );
    return pool.map((c) => ({ id: c.id, name: c.name }));
  }, [allClasses, formData.academic_year_id]);

  const formConfig = useMemo(
    () => createFeeCategoryFormConfig({ isEditMode, academicYears, classes }),
    [isEditMode, academicYears, classes]
  );

  useEffect(() => {
    if (!formData.class_id || !formData.academic_year_id) return;
    if (!classes.some((c) => String(c.id) === String(formData.class_id))) {
      setFormData((prev) => ({ ...prev, class_id: "" }));
    }
  }, [formData.academic_year_id, formData.class_id, classes, setFormData]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [yearsRaw, cls] = await Promise.all([
          getAcademicYears(),
          schoolClassService.getAll(),
        ]);
        const years = (yearsRaw || []).map(
          (y: { id: number; name: string; is_current?: boolean | number }) => ({
            id: y.id,
            name: y.name,
            is_current: y.is_current,
          })
        );
        setAcademicYears(years);
        setAllClasses(
          (cls || []).map((c: { id: number; name: string; academic_year_id?: number | null }) => ({
            id: c.id,
            name: c.name,
            academic_year_id: c.academic_year_id,
          }))
        );
        if (!isEditMode) {
          const defaultYearId =
            academicYearFromList || resolveCurrentAcademicYearId(years);
          if (defaultYearId) {
            setFormData((prev) =>
              prev.academic_year_id ? prev : { ...prev, academic_year_id: defaultYearId }
            );
          }
        }
      } catch {
        // Non-critical: dropdown will be empty
      }
    };
    void loadLookups();
  }, [isEditMode, setFormData, academicYearFromList]);

  const fetchCategory = useCallback(async () => {
    if (!id) return;
    try {
      setFetchLoading(true);
      const data = await getFeeCategory(id);
      setFormData({
        name: data.name,
        academic_year_id: data.academic_year_id ?? "",
        class_id: data.class_id ?? "",
        amount: data.amount ?? "",
        status: !!data.status,
      });
    } catch (err: any) {
      let message = "Failed to load category.";
      let apiFieldErrors;
      try {
        const mapped = mapApiErrorsToFields(err);
        apiFieldErrors = mapped.fieldErrors;
        message = mapped.message || message;
      } catch {}
      if (apiFieldErrors) setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      setError(message);
    } finally {
      setFetchLoading(false);
    }
  }, [id, setFormData, setFieldErrors]);

  useEffect(() => {
    if (isEditMode) fetchCategory();
  }, [isEditMode, fetchCategory]);

  const onConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const payload = {
        name: formData.name,
        academic_year_id: formData.academic_year_id !== "" ? Number(formData.academic_year_id) : undefined,
        class_id: formData.class_id !== "" ? Number(formData.class_id) : undefined,
        amount: formData.amount !== "" ? Number(formData.amount) : undefined,
        status: formData.status,
      };
      if (isEditMode && id) {
        await updateFeeCategory(id, payload);
        setSnackbar("Category updated successfully!");
      } else {
        await createFeeCategory(payload);
        setSnackbar("Category created successfully!");
      }
      setTimeout(() => {
        setSnackbar(null);
        navigateWithConfigHub(listPath, {
          state: {
            academic_year_id: formData.academic_year_id
              ? String(formData.academic_year_id)
              : undefined,
          },
        });
      }, 1200);
    } catch (err: any) {
      let message = err?.message || (isEditMode ? "Failed to update category." : "Failed to create category.");
      let apiFieldErrors;
      try {
        const mapped = mapApiErrorsToFields(err);
        apiFieldErrors = mapped.fieldErrors;
        message = mapped.message || message;
      } catch {}
      if (apiFieldErrors) setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<FeeCategoryFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleSubmit}
      onConfirmSubmit={onConfirmSubmit}
      setFormError={setError}
      isEditMode={isEditMode}
      loading={loading}
      fetchLoading={fetchLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: buildFormBreadcrumbs(
          { title: "Fee Categories", path: listPath },
          isEditMode ? "Edit Fee Category" : "Add Fee Category"
        ),
        homePath: listPath,
      }}
      onCancelNavigate={() =>
        navigateWithConfigHub(listPath, {
          state: {
            academic_year_id: formData.academic_year_id
              ? String(formData.academic_year_id)
              : academicYearFromList,
          },
        })
      }
      confirmMessage={isEditMode ? "Update this fee category?" : "Create this fee category?"}
      hideFieldValidationDialog
      gridSpacing={3}
    />
  );
};

export default AddEditFeeCategory;
