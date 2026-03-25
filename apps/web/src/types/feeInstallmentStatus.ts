export interface FeeInstallmentStatusSummary {
  total_due: number;
  total_paid: number;
  outstanding_balance: number;
}

export type FeeInstallmentStatusValue = "Paid" | "Partial" | "Pending" | "Overdue";

export interface FeeInstallmentStatusInstallment {
  fee_installment_id: number;
  installment: string;
  category: string;
  due_date: string; // ISO date
  amount: number;
  paid: number;
  balance: number;
  status: FeeInstallmentStatusValue;
}

export interface FeeInstallmentStatusResponse {
  summary: FeeInstallmentStatusSummary;
  installments: FeeInstallmentStatusInstallment[];
}

export interface StudentSearchItem {
  id: number;
  student_name: string;
  student_code?: string | null;
  admission_no?: string | null;
  roll_no?: string | null;
  class_id?: number | null;
  class_name?: string | null;
}

