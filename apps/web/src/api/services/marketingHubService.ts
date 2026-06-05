import apiClient from "../client";

export interface MarketingHubConfig {
  platform_id: number;
  name: string;
  code: string;
  category: string;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean; // Catalog active state
  link_id: number | null;
  url: string | null;
  link_active: boolean | null;
}

export interface MarketingPlatform {
  id: number;
  name: string;
  code: string;
  category: string;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const BASE_URL = "/api/marketing";

export const marketingHubService = {
  getMarketingConfig: async (): Promise<MarketingHubConfig[]> => {
    const response = await apiClient.get<MarketingHubConfig[]>(`${BASE_URL}/config`);
    return response.data;
  },

  saveMarketingLink: async (payload: {
    platform_id: number;
    url: string;
    is_active: boolean;
    tenant_id?: number;
  }): Promise<any> => {
    const response = await apiClient.post<any>(`${BASE_URL}/links`, payload);
    return response.data;
  },

  listPlatforms: async (activeOnly: boolean = false): Promise<MarketingPlatform[]> => {
    const response = await apiClient.get<MarketingPlatform[]>(`${BASE_URL}/platforms`, {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  createPlatform: async (platformData: {
    name: string;
    code: string;
    category: string;
    description?: string;
    icon_url?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<MarketingPlatform> => {
    const response = await apiClient.post<MarketingPlatform>(`${BASE_URL}/platforms`, platformData);
    return response.data;
  },
};

export default marketingHubService;
