import apiClient from "../client";
import type {
  InvoiceDetailResponse,
  InvoiceItem,
  InvoiceListParams,
  InvoiceListResponse,
} from "../../types/invoice";

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

  getInvoiceDetailById: async (invoiceId: number): Promise<InvoiceDetailResponse> => {
    try {
      const response = await apiClient.get(`/fees/invoices/${invoiceId}/detail`);
      const payload = response.data ?? {};
      return {
        ...payload,
        invoice: normalizeInvoiceItem(payload.invoice ?? {}),
        fee_breakdown: Array.isArray(payload.fee_breakdown) ? payload.fee_breakdown : [],
        payment_history: Array.isArray(payload.payment_history) ? payload.payment_history : [],
        available_actions: Array.isArray(payload.available_actions) ? payload.available_actions : [],
      } as InvoiceDetailResponse;
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        throw error;
      }

      // Backward-compatible fallback for environments where /detail is not deployed yet.
      const baseInvoice = await invoiceService.getInvoiceById(invoiceId);
      const dueAmount = Number(baseInvoice.due_amount || 0);
      return {
        invoice: baseInvoice,
        student_info: {
          student_id: baseInvoice.student_id,
          student_name: baseInvoice.student_name,
          admission_no: baseInvoice.admission_no ?? null,
          class_id: baseInvoice.class_id,
          class_name: baseInvoice.class_name ?? null,
          division_id: baseInvoice.division_id ?? null,
          division_name: baseInvoice.division_name ?? null,
          roll_no: null,
        },
        fee_breakdown: [],
        payment_summary: {
          total_amount: Number(baseInvoice.total_amount || 0),
          paid_amount: Number(baseInvoice.paid_amount || 0),
          due_amount: dueAmount,
        },
        payment_history: [],
        available_actions:
          dueAmount > 0
            ? ["download_invoice", "print_invoice", "back", "pay_now", "collect_payment"]
            : ["download_invoice", "print_invoice", "back"],
      };
    }
  },
};

export default invoiceService;
