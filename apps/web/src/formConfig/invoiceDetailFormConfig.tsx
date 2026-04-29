import type { ReactNode } from "react";
import type { FormConfig } from "../components/reusable/formFramework.types";

export type InvoiceDetailFormData = {};

type InvoiceDetailFormConfigArgs = {
  summarySlot: ReactNode;
  breakupSlot: ReactNode;
  paymentSummarySlot: ReactNode;
  paymentHistorySlot: ReactNode;
  actionSlot: ReactNode;
};

export function invoiceDetailFormConfig({
  summarySlot,
  breakupSlot,
  paymentSummarySlot,
  paymentHistorySlot,
  actionSlot,
}: InvoiceDetailFormConfigArgs): FormConfig<InvoiceDetailFormData> {
  return {
    fields: {},
    layoutRows: [
      { kind: "section", title: "Invoice Summary", grid: { xs: 12 } },
      { kind: "custom", grid: { xs: 12 }, render: () => summarySlot },
      { kind: "section", title: "Fee Breakup", grid: { xs: 12 } },
      { kind: "custom", grid: { xs: 12 }, render: () => breakupSlot },
      { kind: "section", title: "Payment Summary", grid: { xs: 12 } },
      { kind: "custom", grid: { xs: 12 }, render: () => paymentSummarySlot },
      { kind: "section", title: "Payment History", grid: { xs: 12 } },
      { kind: "custom", grid: { xs: 12 }, render: () => paymentHistorySlot },
      { kind: "section", title: "Actions", grid: { xs: 12 } },
      { kind: "custom", grid: { xs: 12 }, render: () => actionSlot },
    ],
  };
}
