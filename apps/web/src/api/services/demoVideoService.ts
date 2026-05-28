import apiClient from "../client";
import { apiBaseUrl } from "../../config";

export interface DemoVideoRecord {
  id: number;
  module_key: string;
  module_name: string;
  title: string;
  description: string | null;
  video_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface DemoVideoCreatePayload {
  module_key: string;
  module_name: string;
  title: string;
  description?: string | null;
  video_url: string;
  is_active?: boolean;
}

export interface DemoVideoUpdatePayload {
  module_key?: string;
  module_name?: string;
  title?: string;
  description?: string | null;
  video_url?: string;
  is_active?: boolean;
}

class DemoVideoService {
  private getBaseUrl(): string {
    if (import.meta.env.DEV && typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return "http://127.0.0.1:8022";
      }
    }
    return apiBaseUrl;
  }

  private endpoint(path: string): string {
    return `${this.getBaseUrl()}${path}`;
  }

  async list(params?: { module_key?: string; active_only?: boolean }): Promise<DemoVideoRecord[]> {
    const response = await apiClient.get(this.endpoint("/demo-videos/"), { params });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getById(id: number): Promise<DemoVideoRecord> {
    const response = await apiClient.get(this.endpoint(`/demo-videos/${id}`));
    return response.data;
  }

  async create(payload: DemoVideoCreatePayload): Promise<DemoVideoRecord> {
    const response = await apiClient.post(this.endpoint("/demo-videos/"), payload);
    return response.data;
  }

  async update(id: number, payload: DemoVideoUpdatePayload): Promise<DemoVideoRecord> {
    const response = await apiClient.put(this.endpoint(`/demo-videos/${id}`), payload);
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(this.endpoint(`/demo-videos/${id}`));
  }
}

export default new DemoVideoService();
