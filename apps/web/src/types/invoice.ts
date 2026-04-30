export type InvoiceStatus = "Paid" | "Partial" | "Pending" | "Overdue";

export interface InvoiceItem {
  id: number;
  tenant_id: number;
  student_id: number;
  student_name: string;
  admission_no?: string | null;
  academic_year_id: number;
  class_id: number;
  class_name?: string | null;
  division_id?: number | null;
  division_name?: string | null;
  fee_structure_id: number;
  invoice_no: string;
  installment?: string | null;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  due_date: string;
  status: InvoiceStatus;
  created_at: string;
  fee_installment_id?: number | null;
  installment_name?: string | null;
}

export interface InvoiceListResponse {
  items: InvoiceItem[];
  total: number;
  page: number;
  size: number;
}

export interface InvoiceListParams {
  page?: number;
  size?: number;
  academic_year_id?: number;
  class_id?: number;
  division_id?: number;
  installment?: string;
  status?: InvoiceStatus;
  search?: string;
}

export interface InvoiceFeeBreakdownItem {
  id: number;
  fee_category_id?: string | null;
  fee_category_name?: string | null;
  amount: number;
  paid_amount?: number;
  pending_amount?: number;
  payable_for?: string | null;
  installment_type?: string | null;
}

export interface InvoicePaymentSummary {
  total_amount: number;
  paid_amount: number;
  due_amount: number;
}

export interface InvoicePaymentHistoryItem {
  payment_id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_no?: string | null;
}

export interface InvoiceStudentInfo {
  student_id: number;
  student_name: string;
  admission_no?: string | null;
  roll_no?: string | null;
  class_id: number;
  class_name?: string | null;
  division_id?: number | null;
  division_name?: string | null;
}

export interface InvoiceDetailResponse {
  invoice: InvoiceItem;
  student_info: InvoiceStudentInfo;
  fee_breakdown: InvoiceFeeBreakdownItem[];
  payment_summary: InvoicePaymentSummary;
  payment_history: InvoicePaymentHistoryItem[];
  available_actions: string[];
}
