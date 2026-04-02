import React, { useState, useEffect, useCallback, useMemo } from "react";
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

  const formManager = useFormManager<FeeCategoryFormData>({
    initialValues,
    validationConfig: {}, // Basic required validation handled by browser/logic if config is empty here
  });

  const { formData, setFormData, fieldErrors, handleChange, handleFieldValueChange, handleSubmit } = formManager;

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
      setError("Failed to load category.");
    } finally {
      setFetchLoading(false);
    }
  }, [id, setFormData]);

  useEffect(() => {
    if (isEditMode) fetchCategory();
  }, [isEditMode, fetchCategory]);

  const onConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isEditMode && id) {
        await updateFeeCategory(id, formData);
        setSnackbar("Category updated successfully!");
      } else {
        await createFeeCategory(formData);
        setSnackbar("Category created successfully!");
      }
      setTimeout(() => navigate("/fees/categories"), 1000);
    } catch (err: any) {
      setError(
        err?.message ||
          (isEditMode
            ? "Failed to update category."
            : "Failed to create category.")
      );
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
