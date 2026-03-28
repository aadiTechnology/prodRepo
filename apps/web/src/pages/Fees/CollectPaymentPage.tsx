/**
 * Collect Payment Page
 *
 * Form to collect fee payment for a student installment.
 * Uses BaseForm architecture with token-based styling.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, alpha, Divider } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import { createCollectPaymentFormConfig, type CollectPaymentFormData } from "./CollectPaymentPage.formConfig";
import { collectFeePayment } from "../../api/services/feeCollectionService";
import { colorTokens } from "../../tokens/colors";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface StudentSearchItem {
  id: number;
  student_name: string;
  student_code?: string | null;
  admission_no?: string | null;
  roll_no?: string | null;
  class_id?: number | null;
  class_name?: string | null;
}

interface FeeInstallmentStatusInstallment {
  fee_installment_id: number;
  installment: string;
  category: string;
  due_date: string;
  amount: number;
  paid: number;
  balance: number;
  status: "Paid" | "Partial" | "Pending" | "Overdue";
}

interface CollectPaymentState {
  student: StudentSearchItem;
  installment: FeeInstallmentStatusInstallment;
  academicYearId?: number;
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════

function formatCurrency(value: number): string {
  return `₹${Number(value || 0).toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

const emptyForm = (): CollectPaymentFormData => ({
  amount_to_collect: 0,
  payment_method: "CASH",
  reference_no: "",
  notes: "",
  allocation_mode: "custom",
});

export default function CollectPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const tenantId = user?.tenant_id || 1;

  // ─── STATE INITIALIZATION ───────────────────────────────────────────
  const state = location.state as CollectPaymentState | null;
  const [student, setStudent] = useState<StudentSearchItem | null>(state?.student || null);
  const [installment, setInstallment] = useState<FeeInstallmentStatusInstallment | null>(
    state?.installment || null
  );
  const academicYearId = state?.academicYearId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // ─── FORM MANAGER SETUP ────────────────────────────────────────────
  const initialValues = useMemo(() => emptyForm(), []);

  const validationConfig = useMemo<FormValidationConfig<CollectPaymentFormData>>(
    () => ({
      amount_to_collect: [
        { type: "required", message: "Amount is required." },
        {
          type: "custom" as const,
          validate: (formData: CollectPaymentFormData, fieldName: keyof CollectPaymentFormData & string): string => {
            const n = Number(formData.amount_to_collect || 0);
            if (n <= 0) return "Must be greater than 0.";
            if (installment && n > installment.balance) {
              return `Cannot exceed balance of ${formatCurrency(installment.balance)}.`;
            }
            return "";
          },
        },
      ],
      payment_method: [
        { type: "required", message: "Payment method is required." },
      ],
    }),
    [installment]
  );

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<CollectPaymentFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  // ─── FORM CONFIG ───────────────────────────────────────────────────
  const formConfig = useMemo(
    () =>
      createCollectPaymentFormConfig({
        maxBalance: installment?.balance ?? 0,
        collectFullBalance: formData.allocation_mode === "full",
      }),
    [installment?.balance, formData.allocation_mode]
  );

  // ─── PAYMENT PREVIEW SECTION ────────────────────────────────────────
  const paymentPreviewContent = useMemo(() => {
    if (!student || !installment) return null;

    return (
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          border: `1.5px dashed ${alpha(colorTokens.border.subtle, 0.5)}`,
          bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.02),
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 800,
            color: colorTokens.preschool.turquoise.dark,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Payment Preview
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary, fontWeight: 600 }}>
              Student Name
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, mt: 0.5 }}>
              {student.student_name || "-"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary, fontWeight: 600 }}>
              Student Code
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, mt: 0.5 }}>
              {student.student_code || "-"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary, fontWeight: 600 }}>
              Class
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, mt: 0.5 }}>
              {student.class_name || "N/A"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary, fontWeight: 600 }}>
              Roll No
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, mt: 0.5 }}>
              {student.roll_no || "-"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary, fontWeight: 600 }}>
              Installment
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, mt: 0.5 }}>
              {installment.installment || "-"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary, fontWeight: 600 }}>
              Category
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, mt: 0.5 }}>
              {installment.category || "-"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary, fontWeight: 600 }}>
              Due Date
            </Typography>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, mt: 0.5 }}>
              {formatDate(installment.due_date)}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary, fontWeight: 600 }}>
              Balance
            </Typography>
            <Typography
              sx={{
                fontSize: "0.9rem",
                fontWeight: 700,
                mt: 0.5,
                color:
                  installment.balance > 0
                    ? colorTokens.preschool.coral.main
                    : colorTokens.preschool.mint.main,
              }}
            >
              {formatCurrency(installment.balance)}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: alpha(colorTokens.border.subtle, 0.5), my: 1 }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1.5,
            borderRadius: 1,
            bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.04),
            border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.1)}`,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: colorTokens.text.primary }}>
              {formData.allocation_mode === "full" ? "Collect Full Balance" : "Custom Amount"}
            </Typography>
            {installment.balance > 0 && (
              <Typography sx={{ fontSize: "0.75rem", color: colorTokens.text.secondary, mt: 0.5 }}>
                Remaining:{" "}
                {formatCurrency(
                  Math.max(0, installment.balance - (formData.allocation_mode === "full" ? installment.balance : Number(formData.amount_to_collect || 0)))
                )}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  }, [student, installment, formData.allocation_mode, formData.amount_to_collect]);

  // ─── FORM SUBMISSION ────────────────────────────────────────────────
  const handleConfirmSubmit = useCallback(async () => {
    if (!student || !installment) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate final collection amount
      const collectAmount =
        formData.allocation_mode === "full"
          ? installment.balance
          : Number(formData.amount_to_collect || 0);

      if (collectAmount <= 0) {
        throw new Error("Collection amount must be greater than 0.");
      }

      // Call payment API
      const response = await collectFeePayment({
        student_id: student.id,
        tenant_id: tenantId,
        payment_method: formData.payment_method,
        reference_no: formData.reference_no || undefined,
        notes: formData.notes || undefined,
        allocations: [
          {
            fee_installment_id: installment.fee_installment_id,
            amount_allocated: collectAmount,
          },
        ],
      });

      setSnackbar(`Payment collected successfully! Payment ID: ${response.payment_id}`);

      // Navigate after 1 second
      setTimeout(() => {
        navigate("/fees/installment-status", {
          state: {
            student,
            classId: student.class_id,
            ...(typeof academicYearId === "number" ? { academicYearId } : {}),
            payment_success: true,
          },
        });
      }, 1000);
    } catch (err: unknown) {
      console.error("Payment collection error:", err);
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      if (apiFieldErrors) {
        setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
      }
      setError(message || "Failed to collect payment. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [student, installment, formData, tenantId, academicYearId, navigate, setFieldErrors]);

  // ─── HANDLE ALLOCATION MODE TOGGLE ────────────────────────────────
  useEffect(() => {
    if (formData.allocation_mode === "full" && installment) {
      handleFieldValueChange("amount_to_collect", installment.balance);
    }
  }, [formData.allocation_mode, installment, handleFieldValueChange]);

  // ─── RENDER: NO DATA ────────────────────────────────────────────────
  if (!student || !installment) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          gap: 2,
        }}
      >
        <Typography variant="h6" color={colorTokens.text.secondary}>
          No payment data available.
        </Typography>
        <Typography
          onClick={() => navigate("/fees/installment-status")}
          sx={{
            cursor: "pointer",
            color: colorTokens.preschool.turquoise.main,
            fontWeight: 700,
            textDecoration: "underline",
          }}
        >
          Return to Installment Status
        </Typography>
      </Box>
    );
  }

  // ─── RENDER: FORM WITH PAYMENT PREVIEW ───────────────────────────
  return (
    <BaseForm<CollectPaymentFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleSubmit}
      setFormError={setError}
      onConfirmSubmit={handleConfirmSubmit}
      isEditMode={false}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Fee Management", path: "/fees" },
          { title: "Collect Payment", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Discard Changes",
        saveTooltipCreate: "Collect Payment",
      }}
      onCancelNavigate={() => navigate("/fees/installment-status")}
      confirmMessage="Are you sure you want to collect this payment?"
      submitLabelCreate="Collect Payment"
      // Custom render for payment preview via renderActions in header
    />
  );
}
