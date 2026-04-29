/**
 * Fee Collection / Payment Entry Page
 * 
 * Allows searching for an invoice and recording a payment.
 * Uses BaseForm for layout and state management.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  alpha,
  CircularProgress,
  Button
} from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { colorTokens } from "../../tokens/colors";
import invoiceService from "../../api/services/invoiceService";
import { collectInvoiceFeePayment } from "../../api/services/feeCollectionService";
import type { InvoiceItem } from "../../types/invoice";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import { createCollectPaymentFormConfig, type CollectPaymentFormData } from "./CollectPaymentPage.formConfig";
import { mapApiErrorsToFields } from "../../utils/formValidation";

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

const NON_CASH_PAYMENT_METHODS = new Set<CollectPaymentFormData["payment_method"]>([
  "UPI",
  "BANK_TRANSFER",
]);
const UPI_QR_CODE_SRC = "/upi-qr-code.jpg";

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

const emptyForm = (): CollectPaymentFormData => ({
  amount_to_collect: 0,
  payment_method: "CASH",
  reference_no: "",
  payment_date: new Date().toISOString().split("T")[0],
  notes: "",
  allocation_mode: "custom",
  bank_account_holder_name: "",
  bank_account_no: "",
  ifsc_code: "",
});

export default function CollectPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const tenantId = user?.tenant_id || 1;

  const invoiceIdFromState = Number((location.state as { invoice_id?: number } | null)?.invoice_id);
  const invoiceIdFromQuery = Number(searchParams.get("invoice_id"));
  const selectedInvoiceId =
    Number.isFinite(invoiceIdFromState) && invoiceIdFromState > 0
      ? invoiceIdFromState
      : Number.isFinite(invoiceIdFromQuery) && invoiceIdFromQuery > 0
        ? invoiceIdFromQuery
        : null;

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  // ─── FORM STATE ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const initialValues = useMemo(() => emptyForm(), []);

  const validationConfig = useMemo(() => ({
    amount_to_collect: [
      { type: "required" as const, message: "Amount is required" },
      {
        type: "custom" as const,
        validate: (data: CollectPaymentFormData) => {
          const val = Number(data.amount_to_collect);
          if (val <= 0) return "Amount must be greater than 0";
          if (selectedInvoice && val > selectedInvoice.due_amount) {
            return `Amount cannot exceed due balance (${formatCurrency(selectedInvoice.due_amount)})`;
          }
          return "";
        }
      }
    ],
    payment_method: [{ type: "required" as const, message: "Payment method is required" }],
    payment_date: [
      {
        type: "custom" as const,
        validate: (data: CollectPaymentFormData) => {
          const paymentDate = String(data.payment_date ?? "").trim();
          if (!paymentDate) return "Payment date is required";
          return "";
        },
      },
    ],
    reference_no: [
      {
        type: "custom" as const,
        validate: (data: CollectPaymentFormData) => {
          const referenceNo = String(data.reference_no ?? "").trim();
          if (NON_CASH_PAYMENT_METHODS.has(data.payment_method) && !referenceNo) {
            return "Reference number required for selected mode";
          }
          return "";
        },
      },
    ],
    bank_account_holder_name: [
      {
        type: "custom" as const,
        validate: (data: CollectPaymentFormData) => {
          if (data.payment_method === "BANK_TRANSFER") {
            const name = String(data.bank_account_holder_name ?? "").trim();
            if (!name) return "Account holder name is required for bank transfers";
          }
          return "";
        },
      },
    ],
    bank_account_no: [
      {
        type: "custom" as const,
        validate: (data: CollectPaymentFormData) => {
          if (data.payment_method === "BANK_TRANSFER") {
            const accountNo = String(data.bank_account_no ?? "").trim();
            if (!accountNo) return "Bank account number is required";
            if (!/^\d{9,18}$/.test(accountNo)) return "Invalid account number format";
          }
          return "";
        },
      },
    ],
    ifsc_code: [
      {
        type: "custom" as const,
        validate: (data: CollectPaymentFormData) => {
          if (data.payment_method === "BANK_TRANSFER") {
            const ifscCode = String(data.ifsc_code ?? "").trim();
            if (!ifscCode) return "IFSC code is required";
            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) return "Invalid IFSC code format";
          }
          return "";
        },
      },
    ],
  }), [selectedInvoice]);

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
    dependentFieldPairs: [["payment_method", "reference_no"]],
    onClearError: () => setError(null),
  });

  // ─── SYNC AMOUNT ON MODE CHANGE ──────────────────────────────────
  useEffect(() => {
    if (formData.allocation_mode === "full" && selectedInvoice) {
      handleFieldValueChange("amount_to_collect", selectedInvoice.due_amount);
    }
  }, [formData.allocation_mode, selectedInvoice, handleFieldValueChange]);

  useEffect(() => {
    if (formData.payment_method === "CASH" && formData.reference_no) {
      handleFieldValueChange("reference_no", "");
    }
  }, [formData.payment_method, formData.reference_no, handleFieldValueChange]);

  // ─── CLEAR BANK FIELDS ON PAYMENT METHOD CHANGE ──────────────────
  useEffect(() => {
    if (formData.payment_method !== "BANK_TRANSFER") {
      handleFieldValueChange("bank_account_holder_name", "");
      handleFieldValueChange("bank_account_no", "");
      handleFieldValueChange("ifsc_code", "");
    }
  }, [formData.payment_method, handleFieldValueChange]);

  useEffect(() => {
    if (!selectedInvoiceId) {
      setSelectedInvoice(null);
      setError("Invoice ID is missing. Open this page from Invoice Detail.");
      return;
    }

    let mounted = true;
    const loadInvoice = async () => {
      try {
        setLoading(true);
        setError(null);
        const invoice = await invoiceService.getInvoiceById(selectedInvoiceId);
        if (!mounted) return;
        setSelectedInvoice(invoice);
        setFormData({
          ...emptyForm(),
          amount_to_collect: Number(invoice.due_amount || 0),
          allocation_mode: "full",
        });
      } catch (err: any) {
        if (!mounted) return;
        setSelectedInvoice(null);
        setError(err?.message || "Unable to fetch invoice details");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadInvoice();
    return () => {
      mounted = false;
    };
  }, [selectedInvoiceId, setFormData]);

  // ─── FORM CONFIG ───────────────────────────────────────────────────
  const formConfig = useMemo(
    () =>
      createCollectPaymentFormConfig({
        maxBalance: selectedInvoice?.due_amount ?? 0,
        collectFullBalance: formData.allocation_mode === "full",
        paymentMethod: formData.payment_method,
      }),
    [selectedInvoice?.due_amount, formData.allocation_mode, formData.payment_method]
  );

  // ─── SUBMISSION ────────────────────────────────────────────────────
  const handleCollectPayment = useCallback(async () => {
    if (!selectedInvoice) return;

    setLoading(true);
    setError(null);

    try {
      const collectAmount = formData.allocation_mode === "full"
        ? selectedInvoice.due_amount
        : Number(formData.amount_to_collect || 0);
      const normalizedReferenceNo = String(formData.reference_no ?? "").trim();
      const referenceNo = formData.payment_method === "CASH"
        ? null
        : normalizedReferenceNo || null;

      const payload: any = {
        invoice_id: selectedInvoice.id,
        tenant_id: tenantId,
        payment_amount: collectAmount,
        payment_method: formData.payment_method,
        reference_no: referenceNo,
        payment_date: formData.payment_date ? `${formData.payment_date}T00:00:00` : null,
        notes: formData.notes,
      };

      // Add bank transfer details if applicable
      if (formData.payment_method === "BANK_TRANSFER") {
        payload.bank_account_holder_name = String(formData.bank_account_holder_name ?? "").trim();
        payload.bank_account_no = String(formData.bank_account_no ?? "").trim();
        payload.ifsc_code = String(formData.ifsc_code ?? "").trim().toUpperCase();
      }

      await collectInvoiceFeePayment(payload);
      setSnackbar("Payment recorded successfully!");
      const refreshedInvoice = await invoiceService.getInvoiceById(selectedInvoice.id);
      setSelectedInvoice(refreshedInvoice);
      setFormData((prev) => ({
        ...prev,
        amount_to_collect: Number(refreshedInvoice.due_amount || 0),
        allocation_mode: "full",
        reference_no: "",
        notes: "",
        bank_account_holder_name: "",
        bank_account_no: "",
        ifsc_code: "",
      }));

    } catch (err: any) {
      console.error("Payment failure:", err);
      const { message, fieldErrors: apiErrors } = mapApiErrorsToFields(err);
      setError(message || "Payment failed. Please retry.");
      if (apiErrors) {
        setFieldErrors(p => ({
          ...p,
          ...apiErrors
        } as Partial<Record<keyof CollectPaymentFormData & string, string>>));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedInvoice, formData, tenantId, setFieldErrors, setFormData]);

  // ─── RENDER HELPERS ────────────────────────────────────────────────

  const topSlot = (
    <Box sx={{ px: 2 }}>
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: `1px solid ${colorTokens.border.subtle}`, bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.02) }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Fee Collection / Payment Entry
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          Invoice is locked from Invoice Detail: {selectedInvoice?.invoice_no || "-"}
        </Typography>
      </Paper>

      {selectedInvoice ? (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={3}>
            {/* Student Info */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', borderColor: alpha(colorTokens.preschool.turquoise.main, 0.2) }}>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  Student Information
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={5}><Typography variant="body2" color="textSecondary">Student Name:</Typography></Grid>
                  <Grid item xs={7}><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedInvoice.student_name}</Typography></Grid>

                  <Grid item xs={5}><Typography variant="body2" color="textSecondary">Class / Div:</Typography></Grid>
                  <Grid item xs={7}><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedInvoice.class_name || "-"}</Typography></Grid>

                  <Grid item xs={5}><Typography variant="body2" color="textSecondary">Admission No:</Typography></Grid>
                  <Grid item xs={7}><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedInvoice.admission_no || "-"}</Typography></Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Invoice Info */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', borderColor: alpha(colorTokens.preschool.coral.main, 0.2) }}>
                <Typography variant="subtitle2" sx={{ color: colorTokens.preschool.coral.main, mb: 1.5, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  Invoice Details
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={5}><Typography variant="body2" color="textSecondary">Invoice ID:</Typography></Grid>
                  <Grid item xs={7}><Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedInvoice.invoice_no}</Typography></Grid>

                  <Grid item xs={5}><Typography variant="body2" color="textSecondary">Installment:</Typography></Grid>
                  <Grid item xs={7}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedInvoice.installment_name || selectedInvoice.installment || "-"}
                    </Typography>
                  </Grid>

                  <Grid item xs={5}><Typography variant="body2" color="textSecondary">Due Date:</Typography></Grid>
                  <Grid item xs={7}><Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(selectedInvoice.due_date)}</Typography></Grid>

                  <Grid item xs={5}><Typography variant="body2" color="textSecondary">Status:</Typography></Grid>
                  <Grid item xs={7}>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1, py: 0.25, borderRadius: 1, fontWeight: 700,
                        bgcolor: alpha(selectedInvoice.status === 'Paid' ? colorTokens.preschool.mint.main : colorTokens.preschool.coral.main, 0.1),
                        color: selectedInvoice.status === 'Paid' ? colorTokens.preschool.mint.dark : colorTokens.preschool.coral.dark
                      }}
                    >
                      {selectedInvoice.status}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          {/* Summary Bar */}
          <Box sx={{
            mt: 3, p: 2, borderRadius: 2,
            bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.05),
            display: 'flex', justifyContent: 'space-around',
            border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.1)}`
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>TOTAL AMOUNT</Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>{formatCurrency(selectedInvoice.total_amount)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>PAID</Typography>
              <Typography variant="body1" sx={{ color: colorTokens.preschool.mint.main, fontWeight: 800 }}>{formatCurrency(selectedInvoice.paid_amount)}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>DUE BALANCE</Typography>
              <Typography variant="body1" sx={{ color: colorTokens.preschool.coral.main, fontWeight: 800 }}>{formatCurrency(selectedInvoice.due_amount)}</Typography>
            </Box>
          </Box>

          {formData.payment_method === "UPI" && (
            <Paper
              variant="outlined"
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                borderColor: alpha(colorTokens.preschool.turquoise.main, 0.25),
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Scan QR for UPI Payment
              </Typography>
              <Box
                component="img"
                src={UPI_QR_CODE_SRC}
                alt="UPI QR Code"
                sx={{
                  width: { xs: 190, sm: 240 },
                  maxWidth: "100%",
                  borderRadius: 1,
                  border: `1px solid ${colorTokens.border.subtle}`,
                }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>
                After successful payment, enter the UPI transaction ID.
              </Typography>
            </Paper>
          )}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
          <Typography variant="body1" color="textSecondary">
            Unable to load invoice. Open this page from Invoice Detail.
          </Typography>
        </Box>
      )}
    </Box>
  );

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
      onConfirmSubmit={handleCollectPayment}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      isEditMode={false}
      submitLabelCreate="Save Payment"
      confirmMessage="Confirm payment collection?"
      formTopSlot={topSlot}
      headerConfig={{
        links: [
          { title: "Fees", path: "/fees" },
          { title: "Invoices", path: "/fees/invoices" },
          { title: "Collection", path: "#" }
        ],
        homePath: "/",
        saveTooltipCreate: "Save Payment",
        cancelTooltip: "Discard"
      }}
      headerRightBelowSlot={
        selectedInvoice && (
          <Button
            variant="contained"
            color="secondary"
            onClick={(e) => handleSubmit(e, handleCollectPayment)}
            disabled={loading}
            sx={{ borderRadius: 2, fontWeight: 700, px: 3, boxShadow: 3 }}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? "Processing..." : "Save & Print"}
          </Button>
        )
      }
      onCancelNavigate={() =>
        selectedInvoice ? navigate(`/fees/invoices/${selectedInvoice.id}/detail`) : navigate("/fees/invoices")
      }
      canSubmit={!!selectedInvoice}
    />
  );
}
