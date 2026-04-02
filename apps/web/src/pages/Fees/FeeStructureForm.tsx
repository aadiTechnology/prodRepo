import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box } from "@mui/material";
import feeService from "../../api/services/feeService";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import {
  createFeeStructureFormConfig,
  type FeeStructureFormData,
  type FeeInstallmentPreview,
} from "./FeeStructure.formConfig";
import { type FeeCategory, type AcademicYear, type ClassEntity } from "../../types/fee";

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
      academic_year_id: "",
      class_id: "",
      fee_category_id: "",
      total_amount: "",
      installment_type: "QUARTERLY",
      num_installments: 4,
      description: "",
      is_active: true,
    }),
    []
  );

  const formManager = useFormManager<FeeStructureFormData>({
    initialValues,
    validationConfig: {}, // We'll rely on server-side or add UI-side validation if needed
  });

  const { formData, setFormData, handleFieldValueChange } = formManager;

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
    if (!formData.academic_year_id) {
      setClasses([]);
      handleFieldValueChange("class_id", "");
      return;
    }
    feeService.getClasses(Number(formData.academic_year_id)).then((res) => {
      setClasses(res);
      // Validate current class_id
      if (formData.class_id && !res.find((c) => c.id === Number(formData.class_id))) {
        handleFieldValueChange("class_id", "");
      }
    });
  }, [formData.academic_year_id, handleFieldValueChange]);

  // Fetch existing data
  const fetchStructure = useCallback(async () => {
    if (!id) return;
    try {
      setFetchLoading(true);
      const found = await feeService.getFeeStructure(Number(id));
      if (found) {
        setFormData({
          academic_year_id: found.academic_year_id,
          class_id: found.class_id,
          fee_category_id: found.fee_category_id,
          total_amount: found.total_amount,
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
    }
  }, [id, setFormData]);

  useEffect(() => {
    if (isEditMode) fetchStructure();
  }, [isEditMode, fetchStructure]);

  // Installment preview logic
  useEffect(() => {
    const count = parseInt(formData.num_installments.toString()) || 0;
    const total = parseFloat(formData.total_amount.toString()) || 0;

    if (count > 0 && total > 0) {
      const perInstallment = Math.floor((total / count) * 100) / 100;
      const remainder = Math.round((total - perInstallment * count) * 100) / 100;

      const monthStep =
        formData.installment_type === "MONTHLY"
          ? 1
          : formData.installment_type === "QUARTERLY"
          ? 3
          : 12;

      const newInstallments = Array.from({ length: count }, (_, i) => {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i * monthStep);
        return {
          installment_number: i + 1,
          amount:
            i === count - 1
              ? Math.round((perInstallment + remainder) * 100) / 100
              : perInstallment,
          due_date: dueDate.toISOString().split("T")[0],
        };
      });
      setInstallments(newInstallments);
    } else {
      setInstallments([]);
    }
  }, [formData.num_installments, formData.total_amount, formData.installment_type]);

  const formConfig = useMemo(() => {
    const cfg = createFeeStructureFormConfig({
      isEditMode,
      academicYears,
      classes,
      installments,
    });
    // Inject dynamic options for fee category
    if (cfg.fields.fee_category_id) {
      cfg.fields.fee_category_id.props = {
        options: categories.map((cat) => ({ value: cat.id, label: cat.name })),
      };
    }
    return cfg;
  }, [isEditMode, academicYears, classes, installments, categories]);

  const onConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        installments: installments.map((inst) => ({
          ...inst,
          late_fee_applicable: true,
          late_fee_amount: 100,
        })),
      };

      if (isEditMode && id) {
        await feeService.updateFeeStructure(Number(id), payload as any);
        setSnackbar("Fee structure updated successfully!");
      } else {
        await feeService.createFeeStructure(payload as any);
        setSnackbar("Fee structure created successfully!");
      }
      setTimeout(() => navigate("/fees/setup"), 1000);
    } catch (err: any) {
      let msg = err?.message || "Failed to save fee structure.";
      if (err?.response?.status === 409 || msg.toLowerCase().includes("exists")) {
        msg = "Fee structure already exists for this class and category";
      }
      setError(msg);
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
