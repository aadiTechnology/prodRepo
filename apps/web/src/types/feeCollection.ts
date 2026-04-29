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
