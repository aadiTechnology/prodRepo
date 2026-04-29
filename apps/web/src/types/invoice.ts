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
