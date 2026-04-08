import React, { useState, useEffect, useCallback, useMemo } from "react";
import { mapApiErrorsToFields } from "../../utils/formValidation";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Snackbar, Box } from "@mui/material";
import {
  createFeeCategory,
  updateFeeCategory,
  getFeeCategory,
} from "../../api/services/feeService";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import {
  createFeeCategoryFormConfig,
  type FeeCategoryFormData,
} from "./FeeCategory.formConfig";

const AddEditFeeCategory = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const initialValues = useMemo<FeeCategoryFormData>(
    () => ({
      name: "",
      status: true,
    }),
    []
  );

  const formConfig = useMemo(
    () => createFeeCategoryFormConfig({ isEditMode }),
    [isEditMode]
  );

  const validationConfig: import("../../utils/formValidation").FormValidationConfig<FeeCategoryFormData> = useMemo(() => ({
    name: [
      { type: "required", message: "Category Name is required." },
      { type: "minLength", value: 2, message: "Min 2 characters." },
      { type: "maxLength", value: 100, message: "Max 100 characters." },
    ],
  }), []);

  const formManager = useFormManager<FeeCategoryFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  const { formData, setFormData, fieldErrors, setFieldErrors, handleChange, handleFieldValueChange, handleSubmit } = formManager;

  const fetchCategory = useCallback(async () => {
    if (!id) return;
    try {
      setFetchLoading(true);
      const data = await getFeeCategory(id);
      setFormData({
        name: data.name,
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
      if (isEditMode && id) {
        await updateFeeCategory(id, formData);
        setSnackbar("Category updated successfully!");
      } else {
        await createFeeCategory(formData);
        setSnackbar("Category created successfully!");
      }
      // Wait for snackbar to show before navigating
      setTimeout(() => {
        setSnackbar(null);
        navigate("/fees/categories");
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
        links: [
          { title: "Fee Categories", path: "/fees/categories" },
          {
            title: isEditMode ? "Edit Fee Category" : "Add Fee Category",
            path: "#",
          },
        ],
        homePath: "/fees/categories",
      }}
      onCancelNavigate={() => navigate("/fees/categories")}
      confirmMessage={isEditMode ? "Update this fee category?" : "Create this fee category?"}
    />
  );
};

export default AddEditFeeCategory;
