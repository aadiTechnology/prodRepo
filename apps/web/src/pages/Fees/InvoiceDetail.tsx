import { useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  Typography,
} from "@mui/material";
import { PageHeader } from "../../components/layout";
import {
  DataTable,
  ListPageLayout,
} from "../../components/reusable";
import FeeInstallmentStatusChip from "../../components/fees/FeeInstallmentStatusChip";
import { useInvoiceDetailController } from "../../hooks/useInvoiceDetailController";
import type { InvoiceFeeBreakdownItem, InvoicePaymentHistoryItem } from "../../types/invoice";
import { colorTokens } from "../../tokens/colors";

function money(v: number): string {
  return `₹${Number(v || 0).toLocaleString()}`;
}

export default function InvoiceDetail() {
  const controller = useInvoiceDetailController();
  const detail = controller.detail;

  const feeBreakdownColumns = useMemo(
    () => [
      {
        id: "component",
        label: "Fee Component",
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
        label: "Paid",
        align: "right" as const,
        render: (row: InvoiceFeeBreakdownItem) => money(row.paid_amount || 0),
      },
      {
        id: "pending_amount",
        label: "Pending",
        align: "right" as const,
        render: (row: InvoiceFeeBreakdownItem) => money(row.pending_amount || 0),
      },
    ],
    [detail?.invoice.installment]
  );

  const paymentHistoryColumns = useMemo(
    () => [
      {
        id: "payment_date",
        label: "Date",
        render: (row: InvoicePaymentHistoryItem) =>
          new Date(row.payment_date).toLocaleDateString(),
      },
      {
        id: "amount",
        label: "Amount",
        align: "right" as const,
        render: (row: InvoicePaymentHistoryItem) => money(row.amount),
      },
      { id: "payment_method", label: "Mode", render: (row: InvoicePaymentHistoryItem) => row.payment_method },
      { id: "reference_no", label: "Ref No", render: (row: InvoicePaymentHistoryItem) => row.reference_no || "-" },
      {
        id: "receipt",
        label: "Receipt",
        align: "center" as const,
        render: (row: InvoicePaymentHistoryItem) => (
          <Link
            component="button"
            variant="body2"
            onClick={() => controller.onOpenReceipt(row)}
            sx={{ textDecoration: "none", fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
          >
            Receipt
          </Link>
        ),
      },
    ],
    [controller]
  );

  return (
    <>
      <ListPageLayout
        header={
          <>
            <PageHeader
              links={[
                { title: "Invoice List", path: "/fees/invoices" },
                { title: "Invoice Detail", path: "#" },
              ]}
              homePath="/"
              actions={
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button variant="outlined" onClick={controller.onBack} sx={{ textTransform: "none" }}>
                    Back
                  </Button>
                  <Button variant="outlined" onClick={controller.onPrint} sx={{ textTransform: "none" }}>
                    Print
                  </Button>
                  <Button variant="outlined" onClick={controller.onDownload} sx={{ textTransform: "none" }}>
                    Download
                  </Button>
                </Box>
              }
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
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                <Typography variant="body2"><strong>Student:</strong> {detail.student_info.student_name}</Typography>
                <Typography variant="body2"><strong>Roll No:</strong> {detail.student_info.roll_no || "-"}</Typography>
                <Typography variant="body2"><strong>Class:</strong> {detail.student_info.class_name || "-"}</Typography>
                <Typography variant="body2"><strong>Invoice:</strong> {detail.invoice.invoice_no}</Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mt: 1 }}>
                <Typography variant="body2">
                  <strong>Installment:</strong> {detail.invoice.installment || detail.invoice.installment_name || "-"}
                </Typography>
                <Typography variant="body2">
                  <strong>Due Date:</strong> {new Date(detail.invoice.due_date).toLocaleDateString()}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2"><strong>Status:</strong></Typography>
                  <FeeInstallmentStatusChip status={detail.invoice.status} />
                </Box>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Fee Breakdown</Typography>
              <DataTable<InvoiceFeeBreakdownItem>
                columns={feeBreakdownColumns}
                data={detail.fee_breakdown}
                emptyMessage="No fee breakup available"
                getRowKey={(row) => row.id}
                size="small"
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>
                  Total: {money(detail.payment_summary.total_amount)}
                </Typography>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Payment Summary</Typography>
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Typography variant="body2"><strong>Paid:</strong> {money(detail.payment_summary.paid_amount)}</Typography>
                <Typography variant="body2"><strong>Due:</strong> {money(detail.payment_summary.due_amount)}</Typography>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Payment History</Typography>
              {detail.payment_history.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No payment records found
                </Typography>
              ) : (
                <DataTable<InvoicePaymentHistoryItem>
                  columns={paymentHistoryColumns}
                  data={detail.payment_history}
                  emptyMessage="No payment records found"
                  getRowKey={(row) => row.payment_id}
                  size="small"
                />
              )}
            </Paper>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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

      <Dialog open={controller.receiptOpen} onClose={() => controller.setReceiptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Receipt</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700 }}>
            {detail?.invoice.invoice_no || "-"} • Payment #{controller.receiptRow?.payment_id || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Amount: {money(controller.receiptRow?.amount || 0)} • Mode: {controller.receiptRow?.payment_method || "-"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reference: {controller.receiptRow?.reference_no || "-"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => controller.setReceiptOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
