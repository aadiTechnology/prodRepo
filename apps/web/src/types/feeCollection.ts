export type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER";

export interface FeePaymentAllocationCreate {
  fee_installment_id: number;
  amount_allocated: number;
}

export interface FeePaymentCollectRequest {
  student_id: number;
  tenant_id?: number;
  payment_method: PaymentMethod;
  reference_no?: string | null;
  notes?: string | null;
  allocations: FeePaymentAllocationCreate[];
}

export interface FeePaymentCollectResponse {
  payment_id: number;
  student_id: number;
  total_amount: number;
  payment_date: string;
  receipt_number?: string;
  payment_status?: string;
  pending_approval?: boolean;
}

export interface InvoicePaymentCollectRequest {
  invoice_id: number;
  tenant_id?: number;
  payment_amount: number;
  payment_method: PaymentMethod;
  reference_no?: string | null;
  payment_date?: string | null;
  notes?: string | null;
  bank_account_holder_name?: string | null;
  bank_account_no?: string | null;
  ifsc_code?: string | null;
}

export interface FeeReceiptPaymentLineItem {
  sr_no: number;
  txn_number?: string | null;
  payment_type: string;
  bank_name?: string | null;
  amount: number;
}

export interface FeeReceiptFeeDetailItem {
  sr_no: number;
  fee_category_name?: string | null;
  payable_for?: string | null;
  amount: number;
  paid_amount: number;
}

export interface FeeReceiptDetailResponse {
  payment_id: number;
  receipt_number?: string | null;
  payment_date: string;
  payment_method: string;
  transaction_number?: string | null;
  total_amount: number;
  amount_in_words: string;
  notes?: string | null;
  student_name: string;
  parent_name?: string | null;
  admission_no?: string | null;
  class_name?: string | null;
  division_name?: string | null;
  academic_year?: string | null;
  invoice_no?: string | null;
  installment?: string | null;
  paid_for?: string | null;
  created_by_name?: string | null;
  payment_lines: FeeReceiptPaymentLineItem[];
  fee_details: FeeReceiptFeeDetailItem[];
}

export type FeeApprovalStatus = "Pending Approval" | "Approved" | "Rejected" | "ALL";

export interface FeePaymentApprovalListItem {
  id: number;
  request_date: string;
  student_id: number;
  student_name: string;
  class_id?: number | null;
  class_name?: string | null;
  division_id?: number | null;
  division_name?: string | null;
  amount: number;
  payment_method: string;
  transaction_id?: string | null;
  status: FeeApprovalStatus;
}

export interface FeePaymentApprovalListResponse {
  items: FeePaymentApprovalListItem[];
  total: number;
  page: number;
  size: number;
}

export interface FeePaymentApprovalListParams {
  page?: number;
  size?: number;
  class_id?: number;
  division_id?: number;
  student_id?: number;
  status?: FeeApprovalStatus;
  search?: string;
}
