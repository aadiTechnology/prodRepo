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
import InvoiceFeeReceiptDialog from "../../components/fees/InvoiceFeeReceiptDialog";
import FeeInstallmentStatusChip from "../../components/fees/FeeInstallmentStatusChip";
import { useAuth } from "../../context/AuthContext";
import { useInvoiceDetailController } from "../../hooks/useInvoiceDetailController";
import type { InvoiceFeeBreakdownItem } from "../../types/invoice";
import { colorTokens } from "../../tokens/colors";

function tenantAddressLines(tenant: { address_line1?: string | null; address_line2?: string | null; city?: string | null; state?: string | null; pin_code?: string | null } | null | undefined): string[] {
  if (!tenant) return [];
  const lines: string[] = [];
  if (tenant.address_line1?.trim()) lines.push(tenant.address_line1.trim());
  if (tenant.address_line2?.trim()) lines.push(tenant.address_line2.trim());
  const cityState = [tenant.city, tenant.state].filter((x) => x?.trim()).join(", ");
  const pin = tenant.pin_code?.trim();
  const last = [cityState, pin].filter(Boolean).join(" ");
  if (last) lines.push(last);
  return lines;
}

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
  const { user } = useAuth();

  const organizationAddressLines = useMemo(
    () => tenantAddressLines(user?.tenant ?? undefined),
    [user?.tenant]
  );
  const invoiceStatus = useMemo(() => {
    if (!detail) return "Pending" as const;

    const totalAmount = Number(detail.payment_summary.total_amount || 0);
    const paidAmount = Number(detail.payment_summary.paid_amount || 0);
    const dueAmount = Number(detail.payment_summary.due_amount || 0);
    const dueDate = detail.invoice.due_date ? new Date(detail.invoice.due_date) : null;
    const isDueDateValid = Boolean(dueDate && !Number.isNaN(dueDate.getTime()));
    const isDueDatePassed = isDueDateValid ? (dueDate as Date).getTime() <= Date.now() : false;

    if (dueAmount <= 0 || (totalAmount > 0 && paidAmount >= totalAmount)) {
      return "Paid" as const;
    }
    if (paidAmount > 0 && dueAmount > 0) {
      return "Partial" as const;
    }
    if (isDueDatePassed || paidAmount <= 0) {
      return "Pending" as const;
    }
    return "Pending" as const;
  }, [detail]);

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
          if (Number(row.paid_amount || 0) <= 0) {
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
              onClick={() => controller.onOpenReceiptForFeeLine(row)}
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
    [detail?.invoice.installment, detail?.invoice.due_date, controller.onOpenReceiptForFeeLine]
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

      {detail && controller.receiptFeeLine ? (
        <InvoiceFeeReceiptDialog
          onClose={controller.onCloseReceipt}
          detail={detail}
          feeLine={controller.receiptFeeLine}
          organizationName={user?.tenant?.name}
          organizationAddressLines={organizationAddressLines}
        />
      ) : null}
    </Fragment>
  );
}
