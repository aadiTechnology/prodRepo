/**
 * Shared invoice context UI: student card, invoice card, amount summary bar.
 * Used by Collect Payment (`/fees/collect-payment`) and Invoice Detail.
 */

import Grid from "@mui/material/Grid2";
import { alpha } from "@mui/material";
import { Box, Typography } from "../primitives";
import AppCard from "../primitives/AppCard";
import { colorTokens } from "../../tokens/colors";
import type { InvoiceItem } from "../../types/invoice";

const tokens = {
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
} as const;

export function formatInvoiceCurrency(value: number): string {
  return `₹${Number(value || 0).toLocaleString()}`;
}

export function formatInvoiceDate(dateStr: string): string {
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

export function StudentInfoCard({ invoice }: { invoice: InvoiceItem }) {
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

export function InvoiceInfoCard({ invoice }: { invoice: InvoiceItem }) {
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
      <InfoRow label="Due Date:">{formatInvoiceDate(invoice.due_date)}</InfoRow>
      <InfoRow label="Status:">
        <StatusBadge status={invoice.status} />
      </InfoRow>
    </InfoCard>
  );
}

export function AmountSummaryBar({ invoice }: { invoice: InvoiceItem }) {
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
      <SummaryMetric label="TOTAL AMOUNT" value={formatInvoiceCurrency(invoice.total_amount)} />
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
        value={formatInvoiceCurrency(invoice.paid_amount)}
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
        value={formatInvoiceCurrency(invoice.due_amount)}
        valueColor={colorTokens.preschool.coral.main}
      />
    </Box>
  );
}
