import type { InvoiceItem } from "../../types/invoice";
import FeeInstallmentStatusChip from "../../components/fees/FeeInstallmentStatusChip";
import type { ListConfig } from "../../components/reusable/listFramework.types";

function money(v: number): string {
  return `₹${Number(v || 0).toLocaleString()}`;
}

type InvoiceListConfigArgs = {
  onViewInvoice: (invoice: InvoiceItem) => void;
  onEditInvoice: (invoice: InvoiceItem) => void;
};

export function createInvoiceListConfig({
  onViewInvoice,
  onEditInvoice,
}: InvoiceListConfigArgs): ListConfig<InvoiceItem, "invoice_no" | "due_date" | "student_name"> {
  return {
    columns: [
      { id: "invoice_no", label: "Invoice No", render: (r: InvoiceItem) => r.invoice_no },
      { id: "student_name", label: "Student Name", render: (r: InvoiceItem) => r.student_name },
      { id: "class_name", label: "Class", render: (r: InvoiceItem) => r.class_name || "-" },
      { id: "installment", label: "Installment", render: (r: InvoiceItem) => r.installment || "-" },
      {
        id: "total_amount",
        label: "Amount",
        align: "right" as const,
        render: (r: InvoiceItem) => money(r.total_amount),
      },
      {
        id: "paid_amount",
        label: "Paid",
        align: "right" as const,
        render: (r: InvoiceItem) => money(r.paid_amount),
      },
      {
        id: "due_amount",
        label: "Due",
        align: "right" as const,
        render: (r: InvoiceItem) => money(r.due_amount),
      },
      {
        id: "status",
        label: "Status",
        align: "center" as const,
        render: (r: InvoiceItem) => <FeeInstallmentStatusChip status={r.status} />,
      },
    ],
    sortOptions: [],
    uiPolicy: {
      emptyMessage: "No invoices found",
      errorFallbackMessage: "Unable to load invoices. Please try again.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (invoice: InvoiceItem) => ({
        onView: () => onViewInvoice(invoice),
        onEdit: () => onEditInvoice(invoice),
      }),
    },
  };
}
