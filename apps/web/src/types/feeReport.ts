export interface FeeReportSummary {
  total_students: number;
  total_invoiced: number;
  total_collected: number;
  total_pending: number;
  collection_percentage: number;
}

export interface FeeReportRow {
  student_id: number;
  student_name: string;
  student_code: string | null;
  admission_no: string | null;
  class_name: string | null;
  division_name: string | null;
  invoice_no: string;
  installment_label: string | null;
  invoiced_amount: number;
  paid_amount: number;
  due_amount: number;
  invoice_status: string;
  due_date: string | null;
  invoice_date: string | null;
}

export interface FeeReportResponse {
  summary: FeeReportSummary;
  items: FeeReportRow[];
  total: number;
  page: number;
  size: number;
}

export interface FeeReportFilterOptions {
  academic_years: { id: number; name: string }[];
  classes: { id: number; name: string }[];
  installments: string[];
}

export interface FeeReportParams {
  page?: number;
  size?: number;
  academic_year_id?: number | null;
  class_id?: number | null;
  installment?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  search?: string | null;
}
