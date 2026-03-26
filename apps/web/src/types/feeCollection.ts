export interface FeePaymentAllocationCreate {
  fee_installment_id: number;
  amount_allocated: number;
}

export interface FeePaymentCollectRequest {
  student_id: number;
  tenant_id?: number;
  payment_method: string;
  reference_no?: string | null;
  notes?: string | null;
  allocations: FeePaymentAllocationCreate[];
}

export interface FeePaymentCollectResponse {
  payment_id: number;
  student_id: number;
  total_amount: number;
  payment_date: string;
}

