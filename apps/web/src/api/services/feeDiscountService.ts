import { apiClient } from "../client";
import { FeeDiscount, FeeDiscountCreate, FeeDiscountUpdate } from "../../types/feeDiscount";

const feeDiscountService = {
    getById: async (id: number) => {
      const response = await apiClient.get(`/api/fees/discounts/${id}`);
      return response.data;
    },
  list: async (params?: { page?: number; page_size?: number; search?: string }) => {
    const response = await apiClient.get("/api/fees/discounts", { params });
    return response.data;
  },
  create: async (data: FeeDiscountCreate) => {
    const response = await apiClient.post("/api/fees/discounts", data);
    return response.data;
  },
  update: async (id: number, data: FeeDiscountUpdate) => {
    const response = await apiClient.put(`/api/fees/discounts/${id}` , data);
    return response.data;
  },
  delete: async (id: number) => {
    await apiClient.delete(`/api/fees/discounts/${id}`);
  },
};

export default feeDiscountService;
