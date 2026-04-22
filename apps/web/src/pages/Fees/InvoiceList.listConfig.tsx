import type { InvoiceItem } from "../../types/invoice";
import FeeInstallmentStatusChip from "../../components/fees/FeeInstallmentStatusChip";
import type { ListConfig } from "../../components/reusable/listFramework.types";

function money(v: number): string {
  return `₹${Number(v || 0).toLocaleString()}`;
}

function formatDate(dateValue: string): string {
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString();
}

type InvoiceListConfigArgs = {
  onViewInvoice: (invoice: InvoiceItem) => void;
  onCollectPayment: (invoice: InvoiceItem) => void;
};

export function createInvoiceListConfig({
  onViewInvoice,
  onCollectPayment,
}: InvoiceListConfigArgs): ListConfig<InvoiceItem, "invoice_no" | "due_date" | "student_name"> {
  return {
    columns: [
      { id: "invoice_no", label: "Invoice No", render: (r: InvoiceItem) => r.invoice_no },
      { id: "student_name", label: "Student Name", render: (r: InvoiceItem) => r.student_name },
      { id: "admission_no", label: "Admission No", render: (r: InvoiceItem) => r.admission_no || "-" },
      { id: "class_name", label: "Class", render: (r: InvoiceItem) => r.class_name || "-" },
      {
        id: "total_amount",
        label: "Total Amount",
        align: "right" as const,
        render: (r: InvoiceItem) => money(r.total_amount),
      },
      {
        id: "paid_amount",
        label: "Paid Amount",
        align: "right" as const,
        render: (r: InvoiceItem) => money(r.paid_amount),
      },
      {
        id: "due_amount",
        label: "Due Amount",
        align: "right" as const,
        render: (r: InvoiceItem) => money(r.due_amount),
      },
      { id: "due_date", label: "Due Date", render: (r: InvoiceItem) => formatDate(r.due_date) },
      {
        id: "status",
        label: "Status",
        align: "center" as const,
        render: (r: InvoiceItem) => <FeeInstallmentStatusChip status={r.status} />,
      },
    ],
    sortOptions: [],
    uiPolicy: {
      emptyMessage: "No invoices available for selected filters.",
      errorFallbackMessage: "Unable to load invoices. Please try again.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (invoice: InvoiceItem) => ({
        onView: () => onViewInvoice(invoice),
        onEdit: () => onCollectPayment(invoice),
      }),
    },
  };
}
