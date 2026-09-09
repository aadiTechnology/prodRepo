import { Fragment, useMemo } from "react";
import { Button, Paper, Typography } from "@mui/material";
import { PageHeader } from "../../components/layout";
import { DataTable, ListPageLayout } from "../../components/reusable";
import { Box } from "../../components/primitives";
import {
  AmountSummaryBar,
  formatInvoiceCurrency as money,
} from "../../components/fees/InvoiceContextPanel";
import FeeInstallmentStatusChip from "../../components/fees/FeeInstallmentStatusChip";
import { useInvoiceDetailController } from "../../hooks/useInvoiceDetailController";
import type { InvoiceFeeBreakdownItem } from "../../types/invoice";
import { formatShortDate } from "../../utils/formatters";

function getFeeLineStatus(
  row: InvoiceFeeBreakdownItem,
  invoiceDueDate?: string | null
): "Paid" | "Pending" | "Partial" {
  const amount = Number(row.amount || 0);
  const paid = Number(row.paid_amount || 0);
  const pending = Number(row.pending_amount || Math.max(amount - paid, 0));

  if (pending <= 0 && (paid > 0 || amount <= 0)) return "Paid";
  if (paid > 0 && pending > 0) return "Partial";

  if (invoiceDueDate) {
    const due = new Date(invoiceDueDate);
    if (!Number.isNaN(due.getTime())) {
      return "Pending";
    }
  }

  return "Pending";
}

function feeLineLabel(row: InvoiceFeeBreakdownItem, fallbackInstallment?: string | null): string {
  return row.fee_category_name || row.payable_for || row.installment_type || fallbackInstallment || "-";
}

function payableForLabel(row: InvoiceFeeBreakdownItem, fallbackInstallment?: string | null): string {
  return row.payable_for || row.installment_type || fallbackInstallment || "As applicable";
}

export default function InvoiceDetail() {
  const controller = useInvoiceDetailController();
  const detail = controller.detail;

  const canPayNow = Boolean(detail?.available_actions.includes("pay_now"));

  const paidItems = useMemo(
    () =>
      (detail?.fee_breakdown ?? []).filter(
        (row) => Number(row.pending_amount || 0) <= 0 && Number(row.paid_amount || 0) > 0
      ),
    [detail?.fee_breakdown]
  );

  const pendingItems = useMemo(
    () => (detail?.fee_breakdown ?? []).filter((row) => Number(row.pending_amount || 0) > 0),
    [detail?.fee_breakdown]
  );

  const paidColumns = useMemo(
    () => [
      {
        id: "fee_name",
        label: "Fee / Installment",
        render: (row: InvoiceFeeBreakdownItem) => feeLineLabel(row, detail?.invoice.installment),
      },
      {
        id: "payable_for",
        label: "Payable For",
        render: (row: InvoiceFeeBreakdownItem) => payableForLabel(row, detail?.invoice.installment),
      },
      {
        id: "paid_amount",
        label: "Paid Amount",
        align: "right" as const,
        render: (row: InvoiceFeeBreakdownItem) => money(row.paid_amount || 0),
      },
      {
        id: "payment_date",
        label: "Payment Date",
        render: (row: InvoiceFeeBreakdownItem) =>
          row.payment_date ? formatShortDate(row.payment_date) : "—",
      },
      {
        id: "payment_method",
        label: "Payment Method",
        render: (row: InvoiceFeeBreakdownItem) => row.payment_method || "—",
      },
      {
        id: "status",
        label: "Status",
        align: "center" as const,
        render: (row: InvoiceFeeBreakdownItem) => (
          <FeeInstallmentStatusChip status={getFeeLineStatus(row, row.due_date || detail?.invoice.due_date)} />
        ),
      },
      {
        id: "receipt_action",
        label: "Action",
        align: "center" as const,
        render: (row: InvoiceFeeBreakdownItem) => {
          const paymentId = row.payment_id || controller.getPrimaryPaymentId();
          if (!paymentId) {
            return (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            );
          }
          return (
            <Button
              variant="outlined"
              size="small"
              sx={{ textTransform: "none" }}
              data-testid={`btn-show-receipt-${paymentId}`}
              onClick={() => controller.onOpenReceiptForFeeLine(paymentId)}
            >
              Show Receipt
            </Button>
          );
        },
      },
    ],
    [
      controller.getPrimaryPaymentId,
      controller.onOpenReceiptForFeeLine,
      detail?.invoice.due_date,
      detail?.invoice.installment,
    ]
  );

  const pendingColumns = useMemo(
    () => [
      {
        id: "fee_name",
        label: "Fee / Installment",
        render: (row: InvoiceFeeBreakdownItem) => feeLineLabel(row, detail?.invoice.installment),
      },
      {
        id: "payable_for",
        label: "Payable For",
        render: (row: InvoiceFeeBreakdownItem) => payableForLabel(row, detail?.invoice.installment),
      },
      {
        id: "pending_amount",
        label: "Pending Amount",
        align: "right" as const,
        render: (row: InvoiceFeeBreakdownItem) => money(row.pending_amount || 0),
      },
      {
        id: "due_date",
        label: "Due Date",
        render: (row: InvoiceFeeBreakdownItem) =>
          row.due_date ? formatShortDate(row.due_date) : detail?.invoice.due_date ? formatShortDate(detail.invoice.due_date) : "—",
      },
      {
        id: "status",
        label: "Status",
        align: "center" as const,
        render: (row: InvoiceFeeBreakdownItem) => (
          <FeeInstallmentStatusChip status={getFeeLineStatus(row, row.due_date || detail?.invoice.due_date)} />
        ),
      },
      {
        id: "pay_action",
        label: "Action",
        align: "center" as const,
        render: (row: InvoiceFeeBreakdownItem) => (
          <Button
            variant="contained"
            size="small"
            sx={{ textTransform: "none" }}
            data-testid={`btn-pay-now-line-${row.id}`}
            onClick={() => controller.onPayNow(row.invoice_id || row.id)}
            disabled={!canPayNow}
          >
            Pay Now
          </Button>
        ),
      },
    ],
    [canPayNow, controller.onPayNow, detail?.invoice.due_date, detail?.invoice.installment]
  );

  return (
    <Fragment>
      <ListPageLayout
        data-testid="page-invoice-detail"
        header={
          <>
            <PageHeader
              links={[
                { title: "Invoices", path: "/fees/invoices" },
                { title: "Invoice Details", path: "#" },
              ]}
              homePath="/"
            />
            {controller.error && (
              <Paper sx={{ p: 2, m: 2, border: "1px solid", borderColor: "error.main" }}>
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
              <AmountSummaryBar invoice={detail.invoice} />
            </Box>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Fee Paid Details
              </Typography>
              <DataTable<InvoiceFeeBreakdownItem>
                data-testid="grid-fee-paid"
                rowTestId={(row) => `grid-fee-paid-row-${row.id}`}
                emptyTestId="grid-fee-paid-empty"
                columns={paidColumns}
                data={paidItems}
                emptyMessage="No paid fee details available"
                getRowKey={(row) => row.id}
                size="small"
              />
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Fee Pending Details
              </Typography>
              <DataTable<InvoiceFeeBreakdownItem>
                data-testid="grid-fee-pending"
                rowTestId={(row) => `grid-fee-pending-row-${row.id}`}
                emptyTestId="grid-fee-pending-empty"
                columns={pendingColumns}
                data={pendingItems}
                emptyMessage="No pending fee details available"
                getRowKey={(row) => row.id}
                size="small"
              />
            </Paper>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                sx={{ textTransform: "none" }}
                data-testid="btn-full-receipt"
                onClick={controller.onOpenFullReceipt}
                disabled={Number(detail.payment_summary.paid_amount || 0) <= 0}
              >
                Full Receipt
              </Button>
              <Button
                variant="contained"
                sx={{ textTransform: "none" }}
                data-testid="btn-pay-now"
                onClick={() =>
                  controller.onPayNow(pendingItems[0]?.invoice_id || pendingItems[0]?.id)
                }
                disabled={!canPayNow || pendingItems.length === 0}
              >
                Pay Now
              </Button>
            </Box>
          </Box>
        )}
      </ListPageLayout>
    </Fragment>
  );
}
