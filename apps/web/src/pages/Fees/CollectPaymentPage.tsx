/**
 * Fee Collection / Payment Entry Page
 *
 * Architecture:
 *  - All @mui/material imports come through primitives (Box, Typography, etc.)
 *  - All colors reference colorTokens — no hardcoded hex values
 *  - UI is split into focused sub-components:
 *      InvoiceHeaderCard     — title + lock notice
 *      StudentInfoCard       — student info panel
 *      InvoiceInfoCard       — invoice details panel
 *      AmountSummaryBar      — total / paid / due bar
 *      UpiQrPanel            — conditional UPI QR code
 *      EmptyInvoiceState     — fallback when no invoice loaded
 *  - Layout uses AppCard (primitive), Section (primitive), Grid2
 *  - BaseForm + useFormManager + formConfig pattern (unchanged)
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import Grid from "@mui/material/Grid2";
import { alpha, Tooltip } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

// ─── Primitives (single MUI access point) ──────────────────────────────────
import {
  Box,
  Typography,
  IconButton,
} from "../../components/primitives";
import AppCard from "../../components/primitives/AppCard";
import Section from "../../components/primitives/Section";

// ─── Domain & Infrastructure ───────────────────────────────────────────────
import { useAuth } from "../../context/AuthContext";
import { colorTokens } from "../../tokens/colors";
import invoiceService from "../../api/services/invoiceService";
import { collectInvoiceFeePayment } from "../../api/services/feeCollectionService";
import type { InvoiceItem } from "../../types/invoice";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import {
  createCollectPaymentFormConfig,
  type CollectPaymentFormData,
} from "./CollectPaymentPage.formConfig";
import { mapApiErrorsToFields } from "../../utils/formValidation";

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS (page-level constants referencing the token system)
// ═══════════════════════════════════════════════════════════════════════════

const tokens = {
  /** Section card border and tint */
  student: {
    border: alpha(colorTokens.preschool.turquoise.main, 0.25),
    headerColor: colorTokens.preschool.turquoise.dark,
    bgTint: alpha(colorTokens.preschool.turquoise.main, 0.04),
  },
  invoice: {
    border: alpha(colorTokens.preschool.coral.main, 0.25),
    headerColor: colorTokens.preschool.coral.main,
    bgTint: alpha(colorTokens.preschool.coral.main, 0.04),
  },
  summary: {
    bg: alpha(colorTokens.preschool.turquoise.main, 0.06),
    border: alpha(colorTokens.preschool.turquoise.main, 0.12),
    divider: alpha(colorTokens.preschool.turquoise.main, 0.2),
  },
  header: {
    bg: alpha(colorTokens.preschool.turquoise.main, 0.04),
    border: colorTokens.border.subtle,
  },
  status: {
    Paid: {
      bg: alpha(colorTokens.preschool.mint.main, 0.12),
      color: colorTokens.preschool.mint.dark,
    },
    Pending: {
      bg: alpha(colorTokens.preschool.coral.main, 0.1),
      color: colorTokens.preschool.coral.dark,
    },
    Overdue: {
      bg: alpha(colorTokens.preschool.coral.dark, 0.12),
      color: colorTokens.preschool.coral.dark,
    },
    Partial: {
      bg: alpha(colorTokens.preschool.peach.main, 0.12),
      color: colorTokens.preschool.peach.dark,
    },
  } as Record<string, { bg: string; color: string }>,
  upiPanel: {
    border: alpha(colorTokens.preschool.turquoise.main, 0.3),
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/** Labelled key-value row used inside info cards */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Grid container spacing={1} sx={{ mb: 0.5 }}>
      <Grid size={{ xs: 5 }}>
        <Typography variant="body2" sx={{ color: colorTokens.text.secondary }}>
          {label}
        </Typography>
      </Grid>
      <Grid size={{ xs: 7 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: colorTokens.text.primary }}>
          {children}
        </Typography>
      </Grid>
    </Grid>
  );
}

/** Section card with a colored top-border accent and labelled header */
function InfoCard({
  title,
  accentColor,
  borderColor,
  bgTint,
  children,
}: {
  title: string;
  accentColor: string;
  borderColor: string;
  bgTint: string;
  children: React.ReactNode;
}) {
  return (
    <AppCard
      paddingSize="dense"
      sx={{
        borderColor,
        bgcolor: bgTint,
        borderRadius: "16px",
        height: "100%",
        borderTopWidth: 3,
        borderTopColor: accentColor,
        borderTopStyle: "solid",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "block",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: accentColor,
          mb: 1.5,
          fontSize: "0.7rem",
        }}
      >
        {title}
      </Typography>
      {children}
    </AppCard>
  );
}

/** Status badge chip for invoice status */
function StatusBadge({ status }: { status: string }) {
  const style = tokens.status[status] ?? tokens.status["Pending"];
  return (
    <Typography
      variant="caption"
      sx={{
        display: "inline-block",
        px: 1.25,
        py: 0.4,
        borderRadius: "8px",
        fontWeight: 800,
        fontSize: "0.72rem",
        bgcolor: style.bg,
        color: style.color,
      }}
    >
      {status}
    </Typography>
  );
}

/** Student info card */
function StudentInfoCard({ invoice }: { invoice: InvoiceItem }) {
  return (
    <InfoCard
      title="Student Information"
      accentColor={tokens.student.headerColor}
      borderColor={tokens.student.border}
      bgTint={tokens.student.bgTint}
    >
      <InfoRow label="Student Name:">{invoice.student_name}</InfoRow>
      <InfoRow label="Class / Div:">{invoice.class_name || "-"}</InfoRow>
      <InfoRow label="Admission No:">{invoice.admission_no || "-"}</InfoRow>
    </InfoCard>
  );
}

/** Invoice details card */
function InvoiceInfoCard({ invoice }: { invoice: InvoiceItem }) {
  return (
    <InfoCard
      title="Invoice Details"
      accentColor={tokens.invoice.headerColor}
      borderColor={tokens.invoice.border}
      bgTint={tokens.invoice.bgTint}
    >
      <InfoRow label="Invoice ID:">{invoice.invoice_no}</InfoRow>
      <InfoRow label="Installment:">
        {invoice.installment_name || invoice.installment || "-"}
      </InfoRow>
      <InfoRow label="Due Date:">{formatDate(invoice.due_date)}</InfoRow>
      <InfoRow label="Status:">
        <StatusBadge status={invoice.status} />
      </InfoRow>
    </InfoCard>
  );
}

/** Metric column inside the amount summary bar */
function SummaryMetric({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Box sx={{ textAlign: "center", flex: 1 }}>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          fontWeight: 800,
          letterSpacing: "0.07em",
          fontSize: "0.62rem",
          color: colorTokens.text.secondary,
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 900,
          fontSize: "1.15rem",
          color: valueColor ?? colorTokens.text.primary,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/** Horizontal summary bar: total / paid / due */
function AmountSummaryBar({ invoice }: { invoice: InvoiceItem }) {
  return (
    <Box
      sx={{
        mt: 2.5,
        display: "flex",
        alignItems: "center",
        bgcolor: tokens.summary.bg,
        border: `1px solid ${tokens.summary.border}`,
        borderRadius: "14px",
        px: 2,
        py: 1.5,
        gap: 1,
      }}
    >
      <SummaryMetric
        label="TOTAL AMOUNT"
        value={formatCurrency(invoice.total_amount)}
      />
      <Box
        sx={{
          width: "1px",
          height: 36,
          bgcolor: tokens.summary.divider,
          flexShrink: 0,
        }}
      />
      <SummaryMetric
        label="PAID"
        value={formatCurrency(invoice.paid_amount)}
        valueColor={colorTokens.preschool.mint.main}
      />
      <Box
        sx={{
          width: "1px",
          height: 36,
          bgcolor: tokens.summary.divider,
          flexShrink: 0,
        }}
      />
      <SummaryMetric
        label="DUE BALANCE"
        value={formatCurrency(invoice.due_amount)}
        valueColor={colorTokens.preschool.coral.main}
      />
    </Box>
  );
}

/** UPI QR code panel — shown only when payment_method === "UPI" */
function UpiQrPanel() {
  return (
    <AppCard
      paddingSize="dense"
      sx={{
        mt: 2,
        textAlign: "center",
        borderColor: tokens.upiPanel.border,
        borderRadius: "14px",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
        Scan QR for UPI Payment
      </Typography>
      <Box
        component="img"
        src={UPI_QR_CODE_SRC}
        alt="UPI QR Code"
        sx={{
          width: { xs: 180, sm: 230 },
          maxWidth: "100%",
          borderRadius: "10px",
          border: `1px solid ${colorTokens.border.subtle}`,
        }}
      />
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 1.5, color: colorTokens.text.secondary }}
      >
        After successful payment, enter the UPI transaction ID below.
      </Typography>
    </AppCard>
  );
}

/** Page-level header card with page title and invoice lock info */
function InvoiceHeaderCard({ invoiceNo }: { invoiceNo: string }) {
  return (
    <AppCard
      paddingSize="dense"
      sx={{
        mb: 2.5,
        bgcolor: tokens.header.bg,
        borderColor: tokens.header.border,
        borderRadius: "14px",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        Fee Collection / Payment Entry
      </Typography>
      <Typography variant="body2" sx={{ color: colorTokens.text.secondary, mt: 0.5 }}>
        Invoice is locked from Invoice Detail:{" "}
        <Box component="span" sx={{ fontWeight: 700, color: colorTokens.text.primary }}>
          {invoiceNo || "-"}
        </Box>
      </Typography>
    </AppCard>
  );
}

/** Empty / error state when invoice is not loaded */
function EmptyInvoiceState() {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 10,
        color: colorTokens.text.secondary,
        opacity: 0.65,
      }}
    >
      <Typography variant="body1">
        Unable to load invoice. Open this page from Invoice Detail.
      </Typography>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DEFAULT
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function CollectPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const tenantId = user?.tenant_id || 1;

  // ─── Resolve invoice ID from location state or query param ─────────────
  const invoiceIdFromState = Number(
    (location.state as { invoice_id?: number } | null)?.invoice_id
  );
  const invoiceIdFromQuery = Number(searchParams.get("invoice_id"));
  const selectedInvoiceId =
    Number.isFinite(invoiceIdFromState) && invoiceIdFromState > 0
      ? invoiceIdFromState
      : Number.isFinite(invoiceIdFromQuery) && invoiceIdFromQuery > 0
        ? invoiceIdFromQuery
        : null;

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  // ─── Form state ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const initialValues = useMemo(() => emptyForm(), []);

  // ─── Validation config ─────────────────────────────────────────────────
  const validationConfig = useMemo(
    () => ({
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
          },
        },
      ],
      payment_method: [
        { type: "required" as const, message: "Payment method is required" },
      ],
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
              if (!String(data.bank_account_holder_name ?? "").trim())
                return "Account holder name is required for bank transfers";
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
    }),
    [selectedInvoice]
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
    dependentFieldPairs: [["payment_method", "reference_no"]],
    onClearError: () => setError(null),
  });

  // ─── Sync amount when allocation mode changes ──────────────────────────
  useEffect(() => {
    if (formData.allocation_mode === "full" && selectedInvoice) {
      handleFieldValueChange("amount_to_collect", selectedInvoice.due_amount);
    }
  }, [formData.allocation_mode, selectedInvoice, handleFieldValueChange]);

  // ─── Clear reference_no when switching to CASH ─────────────────────────
  useEffect(() => {
    if (formData.payment_method === "CASH" && formData.reference_no) {
      handleFieldValueChange("reference_no", "");
    }
  }, [formData.payment_method, formData.reference_no, handleFieldValueChange]);

  // ─── Clear bank fields when payment method is not BANK_TRANSFER ────────
  useEffect(() => {
    if (formData.payment_method !== "BANK_TRANSFER") {
      handleFieldValueChange("bank_account_holder_name", "");
      handleFieldValueChange("bank_account_no", "");
      handleFieldValueChange("ifsc_code", "");
    }
  }, [formData.payment_method, handleFieldValueChange]);

  // ─── Load invoice by ID ────────────────────────────────────────────────
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

  // ─── Form config (memoized) ────────────────────────────────────────────
  const formConfig = useMemo(
    () =>
      createCollectPaymentFormConfig({
        maxBalance: selectedInvoice?.due_amount ?? 0,
        collectFullBalance: formData.allocation_mode === "full",
        paymentMethod: formData.payment_method,
      }),
    [selectedInvoice?.due_amount, formData.allocation_mode, formData.payment_method]
  );

  // ─── Submission handler ────────────────────────────────────────────────
  const handleCollectPayment = useCallback(async () => {
    if (!selectedInvoice) return;

    setLoading(true);
    setError(null);

    try {
      const collectAmount =
        formData.allocation_mode === "full"
          ? selectedInvoice.due_amount
          : Number(formData.amount_to_collect || 0);

      const normalizedReferenceNo = String(formData.reference_no ?? "").trim();
      const referenceNo =
        formData.payment_method === "CASH" ? null : normalizedReferenceNo || null;

      const payload: any = {
        invoice_id: selectedInvoice.id,
        tenant_id: tenantId,
        payment_amount: collectAmount,
        payment_method: formData.payment_method,
        reference_no: referenceNo,
        payment_date: formData.payment_date
          ? `${formData.payment_date}T00:00:00`
          : null,
        notes: formData.notes,
      };

      if (formData.payment_method === "BANK_TRANSFER") {
        payload.bank_account_holder_name = String(
          formData.bank_account_holder_name ?? ""
        ).trim();
        payload.bank_account_no = String(formData.bank_account_no ?? "").trim();
        payload.ifsc_code = String(formData.ifsc_code ?? "")
          .trim()
          .toUpperCase();
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
        setFieldErrors(
          (p) =>
            ({
              ...p,
              ...apiErrors,
            } as Partial<Record<keyof CollectPaymentFormData & string, string>>)
        );
      }
    } finally {
      setLoading(false);
    }
  }, [selectedInvoice, formData, tenantId, setFieldErrors, setFormData]);

  // ─── Top slot: invoice context panel ──────────────────────────────────
  const topSlot = (
    <Box sx={{ px: { xs: 0, sm: 1 } }}>
      <InvoiceHeaderCard invoiceNo={selectedInvoice?.invoice_no ?? ""} />

      {selectedInvoice ? (
        <>
          {/* Info cards — student + invoice side by side */}
          <Section spacing={0}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <StudentInfoCard invoice={selectedInvoice} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InvoiceInfoCard invoice={selectedInvoice} />
              </Grid>
            </Grid>
          </Section>

          {/* Amount summary bar */}
          <AmountSummaryBar invoice={selectedInvoice} />

          {/* UPI QR panel (conditional) */}
          {formData.payment_method === "UPI" && <UpiQrPanel />}
        </>
      ) : (
        <EmptyInvoiceState />
      )}
    </Box>
  );

  // ─── Render ────────────────────────────────────────────────────────────
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
          { title: "Collection", path: "#" },
        ],
        homePath: "/",
        saveTooltipCreate: "Save Payment",
        cancelTooltip: "Discard",
      }}
      extraHeaderActions={
        selectedInvoice && (
          <Tooltip title={loading ? "Processing..." : "Save & Print"} placement="left">
            <span style={{ display: "inline-flex" }}>
              <IconButton
                aria-label="Save and Print"
                onClick={(e) => handleSubmit(e, handleCollectPayment)}
                disabled={loading}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  color: colorTokens.preschool.turquoise.dark,
                  backgroundColor: alpha(colorTokens.preschool.turquoise.main, 0.1),
                  border: `1.5px solid ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: alpha(colorTokens.preschool.turquoise.main, 0.18),
                    borderColor: colorTokens.preschool.turquoise.main,
                    transform: "translateY(-2px)",
                    boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.25)}`,
                  },
                  "&.Mui-disabled": {
                    background: "#e2e8f0",
                    color: "#94a3b8",
                    border: "none",
                  },
                }}
              >
                <PrintIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </span>
          </Tooltip>
        )
      }
      onCancelNavigate={() =>
        selectedInvoice
          ? navigate(`/fees/invoices/${selectedInvoice.id}/detail`)
          : navigate("/fees/invoices")
      }
      canSubmit={!!selectedInvoice}
    />
  );
}
