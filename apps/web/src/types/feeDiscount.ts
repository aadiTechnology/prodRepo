export interface FeeDiscount {
  id: number;
  discount_name: string;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  fee_category: string;
  applicable_class?: string;
  description?: string;
  status: boolean;
  created_at: string;
}

export interface FeeDiscountCreate {
  discount_name: string;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  fee_category: string;
  applicable_class?: string;
  description?: string;
  status: boolean;
}

export interface FeeDiscountUpdate extends FeeDiscountCreate {}
