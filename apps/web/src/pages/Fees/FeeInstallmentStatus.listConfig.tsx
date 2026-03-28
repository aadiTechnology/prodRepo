import { useTheme, Box, Button, Link, alpha } from "@mui/material";
import { type ListConfig } from "../../components/reusable/listFramework.types";
import FeeInstallmentStatusChip from "../../components/fees/FeeInstallmentStatusChip";
import { TableRowActions } from "../../components/reusable";
import { colorTokens } from "../../tokens/colors";
import {
  type FeeInstallmentStatusValue,
  type StudentSearchItem,
} from "../../hooks/useFeeInstallmentStatusListController";

// ═══════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

type FeeInstallmentListConfigArgs = {
  onCollectPayment: (row: FeeInstallmentStatusValue) => void;
  onViewReceipt?: (row: FeeInstallmentStatusValue) => void;
};

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Format currency value with ₹ symbol
 */
function formatCurrency(value: number): string {
  return `₹${Number(value || 0).toLocaleString()}`;
}

/**
 * Format date string to readable format
 */
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
// CONFIGURATION FACTORY
// ═══════════════════════════════════════════════════════════════════════

export const createFeeInstallmentStatusListConfig = ({
  onCollectPayment,
  onViewReceipt,
}: FeeInstallmentListConfigArgs): ListConfig<FeeInstallmentStatusValue> => ({
  columns: [
    {
      id: "installment",
      label: "Installment",
      field: "installment",
      render: (row: FeeInstallmentStatusValue) => row.installment,
    },
    {
      id: "category",
      label: "Category",
      field: "category",
      render: (row: FeeInstallmentStatusValue) => row.category,
    },
    {
      id: "due_date",
      label: "Due Date",
      field: "due_date",
      render: (row: FeeInstallmentStatusValue) => formatDate(row.due_date),
    },
    {
      id: "amount",
      label: "Amount",
      field: "amount",
      render: (row: FeeInstallmentStatusValue) => formatCurrency(row.amount),
    },
    {
      id: "paid",
      label: "Paid",
      field: "paid",
      render: (row: FeeInstallmentStatusValue) => formatCurrency(row.paid),
    },
    {
      id: "balance",
      label: "Balance",
      field: "balance",
      render: (row: FeeInstallmentStatusValue) => {
        const isOverdue = row.status === "Overdue" && row.balance > 0;
        return (
          <Box
            sx={{
              fontWeight: 900,
              color: isOverdue ? colorTokens.preschool.coral.main : colorTokens.text.primary,
            }}
          >
            {formatCurrency(row.balance)}
          </Box>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      render: (row: FeeInstallmentStatusValue) => (
        <FeeInstallmentStatusChip status={row.status} />
      ),
    },
  ],

  sortOptions: [
    {
      id: "installment-asc",
      label: "Installment (1st → 4th)",
      sortBy: "installment",
      sortOrder: "asc" as const,
    },
    {
      id: "due-date-asc",
      label: "Due Date (earliest)",
      sortBy: "due_date",
      sortOrder: "asc" as const,
    },
    {
      id: "due-date-desc",
      label: "Due Date (latest)",
      sortBy: "due_date",
      sortOrder: "desc" as const,
    },
    {
      id: "balance-desc",
      label: "Balance (highest)",
      sortBy: "balance",
      sortOrder: "desc" as const,
    },
  ],

  uiPolicy: {
    emptyMessage: "No installment records found.",
    errorFallbackMessage: "Failed to load installment status.",
    retryLabel: "Retry",
  },

  actions: {
    rowActions: (row: FeeInstallmentStatusValue) => ({
      onEdit:
        row.status === "Paid" && onViewReceipt
          ? () => onViewReceipt(row)
          : undefined,
      onDelete:
        row.status !== "Paid" && onCollectPayment
          ? () => onCollectPayment(row)
          : undefined,
    }),
  },
});
