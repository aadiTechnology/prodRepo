import apiClient from "../client";
import type { InvoiceItem, InvoiceListParams, InvoiceListResponse } from "../../types/invoice";

const invoiceService = {
  getInvoices: async (params: InvoiceListParams): Promise<InvoiceListResponse> => {
    const response = await apiClient.get("/fees/invoices", { params });
    return response.data;
  },

  getInvoiceById: async (invoiceId: number): Promise<InvoiceItem> => {
    const response = await apiClient.get(`/fees/invoices/${invoiceId}`);
    return response.data;
  },
};

export default invoiceService;
