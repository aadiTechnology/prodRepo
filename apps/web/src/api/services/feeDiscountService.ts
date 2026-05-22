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
  listAllNames: async (): Promise<string[]> => {
    const collectNames = (items: Array<{ discount_name?: string }> | undefined) => {
      const names = new Set<string>();
      for (const row of items ?? []) {
        const n = row.discount_name?.trim();
        if (n) names.add(n);
      }
      return names;
    };

    const first = await apiClient.get<{
      names?: string[];
      data?: Array<{ discount_name?: string }>;
      total?: number;
    }>("/api/fees/discounts", {
      params: { names_only: true },
    });

    const body = first.data;
    if (body && typeof body === "object" && "names" in body && Array.isArray(body.names)) {
      return body.names;
    }

    // Fallback: paginate list including inactive (status=0) discounts
    const inactiveRes = await apiClient.get<{
      data?: Array<{ discount_name?: string }>;
      total?: number;
    }>("/api/fees/discounts", {
      params: { page: 1, page_size: 100, include_inactive: true },
    });
    const inactiveBody = inactiveRes.data;
    const allNames = collectNames(inactiveBody?.data);
    const total = inactiveBody?.total ?? allNames.size;
    const pageSize = 100;
    let page = 2;

    while (allNames.size < total && page <= Math.max(1, Math.ceil(total / pageSize))) {
      const res = await apiClient.get<{
        data?: Array<{ discount_name?: string }>;
        total?: number;
      }>("/api/fees/discounts", {
        params: { page, page_size: pageSize, include_inactive: true },
      });
      const pageBody = res.data;
      const before = allNames.size;
      collectNames(pageBody?.data).forEach((n) => allNames.add(n));
      if (allNames.size === before || !pageBody?.data?.length) break;
      page += 1;
    }

    return [...allNames].sort((a, b) => a.localeCompare(b));
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
