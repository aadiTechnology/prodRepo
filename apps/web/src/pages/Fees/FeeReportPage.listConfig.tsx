import { Chip } from "../../components/primitives";
import type { FeeReportRow } from "../../types/feeReport";
import type { ListConfig } from "../../components/reusable/listFramework.types";
import { alpha } from "@mui/material";
import { colorTokens } from "../../tokens/colors";

/**
 * Standard currency formatter for fee reports
 */
export function money(value: number | undefined | null) {
  if (value === undefined || value === null) return "₹0.00";
  return `₹${value.toLocaleString("en-IN", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

export const feeReportListConfig: ListConfig<FeeReportRow, any> = {
  columns: [
    { 
      id: "student_name", 
      label: "Student", 
      width: 160,
      render: (row) => (
        <span style={{ fontWeight: 600, color: colorTokens.text.primary }}>
          {row.student_name}
        </span>
      )
    },
    { id: "admission_no", label: "Admission No", width: 120 },
    { id: "class_name", label: "Class", width: 100 },
    { id: "division_name", label: "Division", width: 90 },
    { id: "invoice_no", label: "Invoice No", width: 130 },
    { id: "installment_label", label: "Installment", width: 130 },
    {
      id: "invoiced_amount",
      label: "Invoiced",
      width: 120,
      align: "right",
      render: (row: FeeReportRow) => (
        <span style={{ fontWeight: 600 }}>{money(row.invoiced_amount)}</span>
      ),
    },
    {
      id: "paid_amount",
      label: "Paid",
      width: 120,
      align: "right",
      render: (row: FeeReportRow) => (
        <span style={{ color: colorTokens.success.main, fontWeight: 600 }}>
          {money(row.paid_amount)}
        </span>
      ),
    },
    {
      id: "due_amount",
      label: "Due",
      width: 120,
      align: "right",
      render: (row: FeeReportRow) => (
        <span style={{ 
          color: (row.due_amount ?? 0) > 0 ? colorTokens.error.main : colorTokens.text.secondary,
          fontWeight: 700 
        }}>
          {money(row.due_amount)}
        </span>
      ),
    },
    {
      id: "invoice_status",
      label: "Status",
      width: 110,
      align: "center",
      render: (row: FeeReportRow) => {
        const statusColors: Record<string, string> = {
          Paid: colorTokens.preschool.mint.main,
          Partial: colorTokens.preschool.peach.main,
          Pending: colorTokens.preschool.coral.main,
        };
        const color = statusColors[row.invoice_status] ?? colorTokens.text.secondary;
        
        return (
          <Chip
            label={row.invoice_status}
            size="small"
            sx={{ 
              fontWeight: 800,
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              bgcolor: alpha(color, 0.1),
              color: color,
              border: `1px solid ${alpha(color, 0.2)}`,
              borderRadius: '6px',
              height: '22px'
            }}
          />
        );
      },
    },
    {
      id: "due_date",
      label: "Due Date",
      width: 110,
      render: (row: FeeReportRow) => (
        <span style={{ fontSize: '0.85rem', color: colorTokens.text.secondary }}>
          {row.due_date ? new Date(row.due_date).toLocaleDateString("en-IN", {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }) : "—"}
        </span>
      ),
    },
  ],
  sortOptions: [],
  uiPolicy: {
    emptyMessage: "No invoice records found for this period.",
    errorFallbackMessage: "Unable to load fee report. Please try again later.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: () => undefined,
  },
};
