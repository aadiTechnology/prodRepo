export interface FeeCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status: boolean;
}

export type FeeCategoryResponse = FeeCategory;

export interface FeeCategoryCreate {
  name: string;
  code?: string;
  description?: string;
  status?: boolean;
}

export interface FeeCategoryUpdate {
  name?: string;
  code?: string;
  description?: string;
  status?: boolean;
}


export interface AcademicYear {
  id: number;
  name: string;
  code: string;
  is_current: boolean;
}

export interface ClassEntity {
  id: number;
  name: string;
  code: string;
}

export interface FeeInstallment {
  id?: number;
  installment_number: number;
  amount: number;
  due_date: string;
  late_fee_applicable: boolean;
  late_fee_amount: number;
}

export interface FeeStructure {
  id: number;
  class_id: number;
  class_name?: string;
  academic_year_id: number;
  academic_year_name?: string;
  fee_category_id: string;
  fee_category_name?: string;
  total_amount: number;
  installment_type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  num_installments: number;
  description?: string;
  is_active: boolean;
  installments?: FeeInstallment[];
}

export interface FeeStructureCreate {
  class_id: number;
  academic_year_id: number;
  fee_category_id: string;
  total_amount: number;
  installment_type: string;
  num_installments: number;
  description?: string;
  is_active: boolean;
  installments: Omit<FeeInstallment, 'id'>[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
