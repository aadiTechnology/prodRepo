import { apiClient } from "../client";
import type {
  ActivityGallery,
  ActivityGalleryCreateRequest,
  ActivityGalleryDeleteResponse,
  ActivityGalleryListResponse,
  ActivityGalleryMedia,
  ActivityGalleryPublishResponse,
  ActivityGalleryUpdateRequest,
  ClassOption,
  DivisionOption,
  TeacherGalleryScopeResponse,
  GalleryType,
} from "../../types/activityGallery";

const BASE = "/api/activity-galleries";

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

const activityGalleryService = {
  list: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    gallery_type?: GalleryType;
  }): Promise<ActivityGalleryListResponse> => {
    const res = await apiClient.get(BASE, { params });
    return res.data;
  },

  getById: async (id: number): Promise<ActivityGallery> => {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },

  create: async (payload: ActivityGalleryCreateRequest): Promise<ActivityGallery> => {
    const res = await apiClient.post(BASE, payload);
    return res.data;
  },

  update: async (id: number, payload: ActivityGalleryUpdateRequest): Promise<ActivityGallery> => {
    const res = await apiClient.put(`${BASE}/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<ActivityGalleryDeleteResponse> => {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return res.data;
  },

  publish: async (id: number): Promise<ActivityGalleryPublishResponse> => {
    const res = await apiClient.post(`${BASE}/${id}/publish`);
    return res.data;
  },

  uploadMedia: async (galleryId: number, file: File): Promise<ActivityGalleryMedia> => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post(`${BASE}/${galleryId}/media`, form);
    return res.data;
  },

  uploadMediaBulk: async (galleryId: number, files: File[]): Promise<ActivityGalleryMedia[]> => {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    const res = await apiClient.post(`${BASE}/${galleryId}/media/bulk`, form);
    return res.data;
  },

  addYoutubeVideo: async (galleryId: number, youtubeUrl: string): Promise<ActivityGalleryMedia> => {
    const res = await apiClient.post(`${BASE}/${galleryId}/youtube-videos`, {
      youtube_url: youtubeUrl,
    });
    return res.data;
  },

  deleteMedia: async (galleryId: number, mediaId: number): Promise<ActivityGalleryDeleteResponse> => {
    const res = await apiClient.delete(`${BASE}/${galleryId}/media/${mediaId}`);
    return res.data;
  },

  downloadMedia: async (galleryId: number, mediaId: number, filename: string): Promise<void> => {
    const res = await apiClient.get(`${BASE}/${galleryId}/media/${mediaId}/download`, {
      responseType: "blob",
    });
    triggerBlobDownload(res.data, filename);
  },

  fetchMediaContent: async (contentPath: string): Promise<Blob> => {
    const res = await apiClient.get(contentPath, { responseType: "blob" });
    return res.data;
  },

  getTeacherScope: async (): Promise<TeacherGalleryScopeResponse> => {
    const res = await apiClient.get(`${BASE}/teacher-scope`);
    return res.data;
  },

  getTeacherClasses: async (): Promise<ClassOption[]> => {
    const res = await apiClient.get(`${BASE}/teacher-classes`);
    return res.data;
  },

  getDivisions: async (classId: number): Promise<DivisionOption[]> => {
    const res = await apiClient.get(`${BASE}/divisions`, { params: { class_id: classId } });
    return res.data;
  },
};

export default activityGalleryService;
