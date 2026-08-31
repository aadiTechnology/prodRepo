import type { InvoiceItem } from "../../types/invoice";
import FeeInstallmentStatusChip from "../../components/fees/FeeInstallmentStatusChip";
import type { ListConfig } from "../../components/reusable/listFramework.types";

function money(v: number): string {
  return `₹${Number(v || 0).toLocaleString()}`;
}

const INVOICE_LIST_COLUMN_WIDTHS = {
  student_name: 200,
  class_name: 140,
  installment: 160,
  amount: 120,
  paid: 120,
  due: 120,
  status: 120,
} as const;

type InvoiceListConfigArgs = {
  onViewInvoice: (invoice: InvoiceItem) => void;
  showStudentName?: boolean;
};

export function createInvoiceListConfig({
  onViewInvoice,
  showStudentName = true,
}: InvoiceListConfigArgs): ListConfig<InvoiceItem, "due_date" | "student_name"> {
  return {
    columns: [
      ...(showStudentName
        ? [{
            id: "student_name" as const,
            label: "Student Name",
            width: INVOICE_LIST_COLUMN_WIDTHS.student_name,
            render: (r: InvoiceItem) => r.student_name,
          }]
        : []),
      {
        id: "class_name",
        label: "Class",
        width: INVOICE_LIST_COLUMN_WIDTHS.class_name,
        render: (r: InvoiceItem) => r.class_name || "-",
      },
      {
        id: "installment",
        label: "Installment",
        width: INVOICE_LIST_COLUMN_WIDTHS.installment,
        render: (r: InvoiceItem) => r.installment || "-",
      },
      {
        id: "total_amount",
        label: "Amount",
        align: "right" as const,
        width: INVOICE_LIST_COLUMN_WIDTHS.amount,
        render: (r: InvoiceItem) => money(r.total_amount),
      },
      {
        id: "paid_amount",
        label: "Paid",
        align: "right" as const,
        width: INVOICE_LIST_COLUMN_WIDTHS.paid,
        render: (r: InvoiceItem) => money(r.paid_amount),
      },
      {
        id: "due_amount",
        label: "Due",
        align: "right" as const,
        width: INVOICE_LIST_COLUMN_WIDTHS.due,
        render: (r: InvoiceItem) => money(r.due_amount),
      },
      {
        id: "status",
        label: "Status",
        align: "center" as const,
        width: INVOICE_LIST_COLUMN_WIDTHS.status,
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
      }),
    },
  };
}
