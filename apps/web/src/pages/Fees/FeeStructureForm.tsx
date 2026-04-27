import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import feeService from "../../api/services/feeService";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import {
  createFeeStructureFormConfig,
  type FeeStructureFormData,
  type FeeInstallmentPreview,
} from "./FeeStructure.formConfig";
import { type FeeCategory, type AcademicYear, type ClassEntity } from "../../types/fee";

// Local utility: calculateInstallments
function calculateInstallments({ total, count, type, startDate }: {
  total: number;
  count: number;
  type: "MONTHLY" | "QUARTERLY" | "YEARLY";
  startDate: Date;
}): FeeInstallmentPreview[] {
  if (count <= 0 || total <= 0) return [];
  const perInstallment = Math.floor((total / count) * 100) / 100;
  const remainder = Math.round((total - perInstallment * count) * 100) / 100;
  const monthStep = type === "MONTHLY" ? 1 : type === "QUARTERLY" ? 3 : 12;
  return Array.from({ length: count }, (_, i) => {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i * monthStep);
    return {
      installment_number: i + 1,
      amount: i === count - 1 ? Math.round((perInstallment + remainder) * 100) / 100 : perInstallment,
      due_date: dueDate.toISOString().split("T")[0],
    };
  });
}
import { type FormValidationConfig } from "../../utils/formValidation";

const FeeStructureForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Lookups
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [installments, setInstallments] = useState<FeeInstallmentPreview[]>([]);

  const initialValues = useMemo<FeeStructureFormData>(
    () => ({
      name: "",
      academic_year_id: "",
      class_id: "",
      class_division_id: "",
      fee_category_ids: [],
      total_amount: "",
      installment_type: "QUARTERLY",
      num_installments: 4,
      description: "",
      is_active: true,
    }),
    []
  );

  // Field-level validation config
  const validationConfig = useMemo<FormValidationConfig<FeeStructureFormData>>(() => ({
    name: [ { type: "required", message: "Fee structure name is required." } ],
    academic_year_id: [ { type: "required", message: "Academic year is required." } ],
    class_id: [ { type: "required", message: "Class is required." } ],
    fee_category_ids: [
      {
        type: "custom",
        validate: (data) => {
          const ids = data.fee_category_ids as string[];
          return !ids || ids.length === 0 ? "At least one fee category is required." : "";
        },
      },
    ],
    total_amount: [
      { type: "required", message: "Total amount is required." },
      { type: "pattern", regex: /^\d+(\.\d{1,2})?$/, message: "Enter a valid amount." },
    ],
    num_installments: [
      { type: "required", message: "Number of installments is required." },
      { type: "pattern", regex: /^\d+$/, message: "Enter a valid number." },
    ],
  }), []);

  const formManager = useFormManager<FeeStructureFormData>({
    initialValues,
    validationConfig,
  });

  const { formData, setFormData, handleFieldValueChange, resetForm } = formManager;

  // Use a ref to track if we are currently fetching the structure to avoid clearing data
  const isInitialLoadRef = useRef(isEditMode);

  // Fetch Lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [cats, years] = await Promise.all([
          feeService.getFeeCategories(),
          feeService.getAcademicYears(),
        ]);
        setCategories(cats);
        setAcademicYears(years);
      } catch (err) {
        console.error("Failed to load lookups", err);
      }
    };
    fetchLookups();
  }, []);

  // Fetch Classes when Academic Year changes
  useEffect(() => {
    const academicYearId = Number(formData.academic_year_id);
    if (!academicYearId) {
      setClasses([]);
      if (!isInitialLoadRef.current) {
        handleFieldValueChange("class_id", "");
        handleFieldValueChange("class_division_id", "");
        handleFieldValueChange("fee_category_ids", []);
      }
      return;
    }

    let isCancelled = false;
    feeService
      .getClasses(academicYearId)
      .then((res) => {
        if (isCancelled) return;
        setClasses(res);
        // Validate current class_id - only if not currently fetching initial data
        if (
          !isInitialLoadRef.current &&
          formData.class_id &&
          !res.find((c) => c.id === Number(formData.class_id))
        ) {
          handleFieldValueChange("class_id", "");
          handleFieldValueChange("class_division_id", "");
          handleFieldValueChange("fee_category_ids", []);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error("Failed to load classes", err);
        setClasses([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [formData.academic_year_id, handleFieldValueChange]);

  // Reset category selection if selected categories belong to a different class
  useEffect(() => {
    if (isInitialLoadRef.current) return;

    const ids = formData.fee_category_ids as string[];
    if (!categories.length) {
      return;
    }

    if (ids && ids.length > 0 && formData.class_id) {
      const allMatch = ids.every(id => {
        const cat = categories.find(c => String(c.id) === String(id));
        return cat && cat.class_id === Number(formData.class_id);
      });
      if (!allMatch) {
        handleFieldValueChange("fee_category_ids", []);
      }
    } else if (ids && ids.length > 0 && !formData.class_id) {
      // If class is cleared, clear categories
      handleFieldValueChange("fee_category_ids", []);
    }

    // Reset division if class changes
    const selectedClass = classes.find(c => c.id === Number(formData.class_id));
    if (formData.class_division_id) {
      const isValidDiv = selectedClass?.divisions?.find(d => d.id === Number(formData.class_division_id));
      if (!isValidDiv) {
        handleFieldValueChange("class_division_id", "");
      }
    }

  }, [formData.class_id, classes, formData.class_division_id, categories, handleFieldValueChange]);

  // Auto-sum selected category amounts → total_amount (read-only when categories selected)
  useEffect(() => {
    const ids = formData.fee_category_ids as string[];
    if (!ids || ids.length === 0) return;
    
    if (isInitialLoadRef.current) return;

    const sum = ids.reduce((acc, id) => {
      const cat = categories.find((c) => String(c.id) === String(id));
      return acc + (cat?.amount ? Number(cat.amount) : 0);
    }, 0);
    handleFieldValueChange("total_amount", sum > 0 ? sum : "");

    // Auto-populate name if empty
    if (!formData.name && categories.length > 0) {
      const selectedNames = ids
        .map((id) => categories.find((c) => String(c.id) === String(id))?.name)
        .filter(Boolean);
      if (selectedNames.length > 0) {
        handleFieldValueChange("name", selectedNames.join(" + "));
      }
    }
  }, [formData.fee_category_ids, categories, handleFieldValueChange, formData.name]);

  // Fetch existing data
  const fetchStructure = useCallback(async () => {
    if (!id) return;
    try {
      setFetchLoading(true);
      isInitialLoadRef.current = true;
      const found = await feeService.getFeeStructure(Number(id));
      if (found) {
        const structureAcademicYearId = Number(found.academic_year_id);
        if (structureAcademicYearId) {
          try {
            const yearClasses = await feeService.getClasses(structureAcademicYearId);
            setClasses(yearClasses);
          } catch (classErr) {
            console.error("Failed to preload classes for fee structure edit", classErr);
            setClasses([]);
          }
        }

        const normalizedCategoryIds =
          found.fee_category_ids && found.fee_category_ids.length > 0
            ? found.fee_category_ids.map((categoryId) => String(categoryId))
            : found.fee_category_id
              ? [String(found.fee_category_id)]
              : [];

        resetForm({
          name: found.name || "",
          academic_year_id: found.academic_year_id || "",
          class_id: found.class_id || "",
          class_division_id: found.class_division_id || "",
          // Support both legacy single id and new array while keeping ids as strings for Select.
          fee_category_ids: normalizedCategoryIds,
          total_amount: found.total_amount || "",
          installment_type: found.installment_type as any,
          num_installments: found.num_installments,
          description: found.description || "",
          is_active: found.is_active,
        });
        if (found.installments) setInstallments(found.installments as any);
      }
    } catch (err: any) {
      setError("Failed to load fee structure.");
    } finally {
      setFetchLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [id, resetForm]);

  useEffect(() => {
    if (isEditMode) fetchStructure();
  }, [isEditMode, fetchStructure]);

  // Installment preview logic (extracted, improved date logic)
  useEffect(() => {
    const count = parseInt(formData.num_installments?.toString() || "0", 10);
    const total = parseFloat(formData.total_amount?.toString() || "0");
    // Use academic year start date if available, else today
    let startDate = new Date();
    const selectedYear = academicYears.find((y) => y.id === Number(formData.academic_year_id));
    // Type guard for start_date (not in AcademicYear interface, but may be present)
    if (selectedYear && (selectedYear as any).start_date && typeof (selectedYear as any).start_date === 'string') {
      const parsed = Date.parse((selectedYear as any).start_date);
      if (!isNaN(parsed)) {
        startDate = new Date(parsed);
      }
    }
    if (count > 0 && total > 0) {
      setInstallments(
        calculateInstallments({
          total,
          count,
          type: formData.installment_type as "MONTHLY" | "QUARTERLY" | "YEARLY",
          startDate,
        })
      );
    } else {
      setInstallments([]);
    }
  }, [formData.num_installments, formData.total_amount, formData.installment_type, formData.academic_year_id, academicYears]);

  const selectedCategoryIds = formData.fee_category_ids as string[];
  const hasSelectedCategories = selectedCategoryIds && selectedCategoryIds.length > 0;

  const formConfig = useMemo(() => {
    const filteredCategories = formData.class_id
      ? categories.filter(c => c.class_id === Number(formData.class_id))
      : [];
      
    const selectedClass = classes.find(c => c.id === Number(formData.class_id));
    const divisions = selectedClass?.divisions || [];

    const cfg = createFeeStructureFormConfig({
      isEditMode,
      academicYears,
      classes,
      installments,
      categories: filteredCategories,
      divisions,
    });
    // Make total_amount read-only when categories drive the value
    if (cfg.fields.total_amount && hasSelectedCategories) {
      cfg.fields.total_amount.props = {
        ...cfg.fields.total_amount.props,
        type: "number",
        disabled: true,
        helperText: "Auto-calculated from selected categories",
      };
    }
    return cfg;
  }, [isEditMode, academicYears, classes, installments, categories, hasSelectedCategories]);

  const onConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure all required fields are numbers for API
      const academic_year_id = Number(formData.academic_year_id);
      const class_id = Number(formData.class_id);
      const class_division_id = formData.class_division_id ? Number(formData.class_division_id) : null;
      const total_amount = Number(formData.total_amount);
      const num_installments = Number(formData.num_installments);
      const fee_category_ids = formData.fee_category_ids as string[];
      // For backward-compat, send primary category id as fee_category_id
      const fee_category_id = fee_category_ids[0] ?? "";
      const payload = {
        ...formData,
        academic_year_id,
        class_id,
        class_division_id,
        fee_category_id,
        fee_category_ids,
        total_amount,
        num_installments,
        installments: installments.map((inst) => ({
          ...inst,
          late_fee_applicable: true,
          late_fee_amount: 100,
        })),
      };

      if (isEditMode && id) {
        await feeService.updateFeeStructure(Number(id), payload);
        setSnackbar("Fee structure updated successfully!");
      } else {
        await feeService.createFeeStructure(payload);
        setSnackbar("Fee structure created successfully!");
      }
      setTimeout(() => navigate("/fees/setup"), 1000);
    } catch (err: any) {
      let msg = err?.message || "Failed to save fee structure.";
      if (err?.response?.status === 409 || msg.toLowerCase().includes("exists")) {
        msg = "Fee structure already exists for this class and category";
      }
      // Map server-side validation errors to form fields if possible
      if (err?.response?.data?.fieldErrors) {
        formManager.setFieldErrors(err.response.data.fieldErrors);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<FeeStructureFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={formManager.fieldErrors}
      handleChange={formManager.handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={formManager.handleSubmit}
      setFormError={setError}
      onConfirmSubmit={onConfirmSubmit}
      isEditMode={isEditMode}
      loading={loading}
      fetchLoading={fetchLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Fee Setup", path: "/fees/setup" },
          { title: isEditMode ? "Edit Structure" : "New Structure", path: "#" },
        ],
        homePath: "/",
      }}
      onCancelNavigate={() => navigate("/fees/setup")}
      confirmMessage={
        isEditMode
          ? "Are you sure you want to update this fee structure?"
          : "Are you sure you want to create this new fee structure?"
      }
    />
  );
};

export default FeeStructureForm;
