
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import feeDiscountService from "../api/services/feeDiscountService";
import { useFormManager } from "../hooks/useFormManager";
import BaseForm from "../components/reusable/BaseForm";
import { createAddFeeDiscountFormConfig, type AddFeeDiscountFormData } from "./AddFeeDiscount.formConfig";

const emptyForm = (): AddFeeDiscountFormData => ({
  discountName: "",
  discountType: "PERCENTAGE",
  discountAmount: "",
  feeCategory: "",
  applicableClass: "",
  description: "",
  is_active: true,
});

export default function AddFeeDiscount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const discountId = searchParams.get("id");
  const isEditMode = !!discountId;
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [feeCategoryOptions, setFeeCategoryOptions] = useState<string[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);

  // Fetch options for selects
  useEffect(() => {
    import("../api/services/classFeeCategoryService").then(({ feeCategoryService, classService }) => {
      feeCategoryService.list().then((res: any[]) => setFeeCategoryOptions((res || []).map((cat: any) => cat.name)));
      classService.list().then((res: any[]) => setClassOptions((res || []).map((cls: any) => cls.name)));
    });
  }, []);

  const initialValues = useMemo(() => emptyForm(), []);

  const validationConfig = useMemo(() => ({
    discountName: [
      { type: "required" as const, message: "Discount Name is required." },
      { type: "minLength" as const, value: 2, message: "Min 2 characters." },
    ],
    discountAmount: [
      { type: "required" as const, message: "Discount Amount is required." },
      // No "min" in ValidationRule, so skip or use custom if needed
    ],
  }), []);

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<AddFeeDiscountFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  // Fetch entity for edit mode
  const fetchDiscount = useCallback(async () => {
    if (!discountId) return;
    try {
      setFetchLoading(true);
      const data = await feeDiscountService.getById(Number(discountId));
      setFormData({
        discountName: data.discount_name || "",
        discountType: data.discount_type || "PERCENTAGE",
        discountAmount: data.discount_value ?? "",
        feeCategory: data.fee_category || "",
        applicableClass: data.applicable_class || "",
        description: data.description || "",
        is_active: data.status ?? true,
      });
    } catch (err: unknown) {
      setError("Failed to load discount.");
    } finally {
      setFetchLoading(false);
    }
  }, [discountId, setFormData]);

  useEffect(() => {
    if (isEditMode) fetchDiscount();
  }, [fetchDiscount, isEditMode]);

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        discount_name: formData.discountName,
        discount_type: formData.discountType,
        discount_value: typeof formData.discountAmount === "number" ? formData.discountAmount : 0,
        fee_category: formData.feeCategory,
        applicable_class: formData.applicableClass,
        description: formData.description,
        status: formData.is_active,
      };
      if (isEditMode && discountId) {
        await feeDiscountService.update(Number(discountId), payload);
        setSnackbar("Discount updated successfully.");
      } else {
        await feeDiscountService.create(payload);
        setSnackbar("Discount created successfully.");
      }
      setTimeout(() => navigate("/fees/discounts"), 1000);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        (isEditMode ? "Failed to update discount." : "Failed to create discount.")
      );
    } finally {
      setLoading(false);
    }
  };

  const formConfig = useMemo(
    () => createAddFeeDiscountFormConfig({ isEditMode, feeCategoryOptions, classOptions }),
    [isEditMode, feeCategoryOptions, classOptions]
  );

  return (
    <BaseForm<AddFeeDiscountFormData>
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
          { title: "Fee Discounts", path: "/fees/discounts" },
          { title: isEditMode ? "Edit Fee Discount" : "Add Fee Discount", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Update",
      }}
      onCancelNavigate={() => navigate("/fees/discounts")}
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this discount?"
          : "Are you sure you want to save this discount?"
      }
    />
  );
}