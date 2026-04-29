import apiClient from "../client";
import type { InvoiceItem, InvoiceListParams, InvoiceListResponse } from "../../types/invoice";

function normalizeInvoiceItem(raw: any): InvoiceItem {
  return {
    ...raw,
    installment: raw.installment ?? raw.Installment ?? null,
    division_id: raw.division_id ?? null,
    division_name: raw.division_name ?? null,
  } as InvoiceItem;
}

const invoiceService = {
  getInvoices: async (params: InvoiceListParams): Promise<InvoiceListResponse> => {
    const response = await apiClient.get("/fees/invoices", { params });
    const payload = response.data ?? {};
    return {
      ...payload,
      items: Array.isArray(payload.items)
        ? payload.items.map((item: any) => normalizeInvoiceItem(item))
        : [],
    };
  },

  getInvoiceById: async (invoiceId: number): Promise<InvoiceItem> => {
    const response = await apiClient.get(`/fees/invoices/${invoiceId}`);
    return normalizeInvoiceItem(response.data);
  },
};

export default invoiceService;
