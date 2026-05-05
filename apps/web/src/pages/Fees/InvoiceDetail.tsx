import { Fragment, useMemo } from "react";
import Grid from "@mui/material/Grid2";
import { Button, Link, Paper, Typography } from "@mui/material";
import { PageHeader } from "../../components/layout";
import { DataTable, ListPageLayout } from "../../components/reusable";
import Section from "../../components/primitives/Section";
import { Box } from "../../components/primitives";
import {
  AmountSummaryBar,
  InvoiceInfoCard,
  StudentInfoCard,
  formatInvoiceCurrency as money,
} from "../../components/fees/InvoiceContextPanel";
import FeeInstallmentStatusChip from "../../components/fees/FeeInstallmentStatusChip";
import { useInvoiceDetailController } from "../../hooks/useInvoiceDetailController";
import type { InvoiceFeeBreakdownItem } from "../../types/invoice";
import { colorTokens } from "../../tokens/colors";

function getFeeLineStatus(
  row: InvoiceFeeBreakdownItem,
  invoiceDueDate?: string | null
): "Paid" | "Pending" | "Partial" {
  const amount = Number(row.amount || 0);
  const paid = Number(row.paid_amount || 0);
  const pending = Number(row.pending_amount || Math.max(amount - paid, 0));

  if (pending <= 0 && (paid > 0 || amount <= 0)) return "Paid";
  if (paid > 0 && pending > 0) return "Partial";

  // Pending remains the status before/after due date for unpaid lines.
  if (invoiceDueDate) {
    const due = new Date(invoiceDueDate);
    if (!Number.isNaN(due.getTime())) {
      return "Pending";
    }
  }

  return "Pending";
}

export default function InvoiceDetail() {
  const controller = useInvoiceDetailController();
  const detail = controller.detail;

  const feeBreakdownColumns = useMemo(
    () => [
      {
        id: "component",
        label: "Fee Type",
        render: (row: InvoiceFeeBreakdownItem) => row.fee_category_name || "-",
      },
      {
        id: "payable_for",
        label: "Payable For",
        render: (row: InvoiceFeeBreakdownItem) =>
          row.payable_for || row.installment_type || detail?.invoice.installment || "As applicable",
      },
      {
        id: "amount",
        label: "Amount",
        align: "right" as const,
        render: (row: InvoiceFeeBreakdownItem) => money(row.amount),
      },
      {
        id: "paid_amount",
        label: "Amt. Paid",
        align: "right" as const,
        render: (row: InvoiceFeeBreakdownItem) => money(row.paid_amount || 0),
      },
      {
        id: "pending_amount",
        label: "Amt. Payable",
        align: "right" as const,
        render: (row: InvoiceFeeBreakdownItem) => money(row.pending_amount || 0),
      },
      {
        id: "status",
        label: "Status",
        align: "center" as const,
        render: (row: InvoiceFeeBreakdownItem) => (
          <FeeInstallmentStatusChip status={getFeeLineStatus(row, detail?.invoice.due_date)} />
        ),
      },
      {
        id: "receipt",
        label: "Receipt",
        align: "center" as const,
        render: (row: InvoiceFeeBreakdownItem) => {
          const paymentId = controller.getPrimaryPaymentId();
          if (Number(row.paid_amount || 0) <= 0) {
            return (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            );
          }
          if (!paymentId) {
            return (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            );
          }
          return (
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => controller.onOpenReceiptForFeeLine(paymentId)}
              sx={{
                fontWeight: 700,
                textDecoration: "none",
                cursor: "pointer",
                border: "none",
                background: "none",
                font: "inherit",
                color: colorTokens.preschool.turquoise.dark,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Receipt
            </Link>
          );
        },
      },
    ],
    [
      detail?.invoice.installment,
      detail?.invoice.due_date,
      controller.getPrimaryPaymentId,
      controller.onOpenReceiptForFeeLine,
    ]
  );

  return (
    <Fragment>
      <ListPageLayout
        header={
          <>
            <PageHeader
              links={[
                { title: "Invoice List", path: "/fees/invoices" },
                { title: "Invoice Detail", path: "#" },
              ]}
              homePath="/"
            />
            {controller.error && (
              <Paper sx={{ p: 2, m: 2, border: `1px solid ${colorTokens.preschool.coral.main}` }}>
                <Typography color="error">{controller.error}</Typography>
              </Paper>
            )}
          </>
        }
      >
        {controller.loading || !detail ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">Loading invoice details...</Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2, display: "grid", gap: 2 }}>
            <Box sx={{ px: { xs: 0, sm: 1 } }}>
              <Section spacing={0}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <StudentInfoCard invoice={detail.invoice} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <InvoiceInfoCard invoice={detail.invoice} />
                  </Grid>
                </Grid>
              </Section>
              <AmountSummaryBar invoice={detail.invoice} />
            </Box>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Fee Details
              </Typography>
              <DataTable<InvoiceFeeBreakdownItem>
                columns={feeBreakdownColumns}
                data={detail.fee_breakdown}
                emptyMessage="No fee breakup available"
                getRowKey={(row) => row.id}
                size="small"
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>Total: {money(detail.payment_summary.total_amount)}</Typography>
              </Box>
            </Paper>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                sx={{ textTransform: "none" }}
                onClick={controller.onOpenFullReceipt}
                disabled={Number(detail.payment_summary.paid_amount || 0) <= 0}
              >
                Full Receipt
              </Button>
              <Button
                variant="contained"
                sx={{ textTransform: "none" }}
                onClick={controller.onPayNow}
                disabled={!detail.available_actions.includes("pay_now")}
              >
                Pay Now
              </Button>
              <Button
                variant="contained"
                sx={{ textTransform: "none" }}
                onClick={controller.onCollectPayment}
                disabled={!detail.available_actions.includes("collect_payment")}
              >
                Collect Payment
              </Button>
            </Box>
          </Box>
        )}
      </ListPageLayout>
    </Fragment>
  );
}
