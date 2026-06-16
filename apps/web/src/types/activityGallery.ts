export type GalleryType = "Photo" | "Video";
export type MediaType = "Photo" | "Video";

export interface ActivityGalleryMedia {
  id: number;
  gallery_id: number;
  media_type: MediaType;
  file_name: string;
  original_file_name?: string | null;
  file_path: string;
  file_size?: number | null;
  display_order: number;
  uploaded_at: string;
}

export interface ActivityGalleryClassMapping {
  id: number;
  gallery_id: number;
  class_id: number;
  division_id: number;
  class_name?: string | null;
  division_name?: string | null;
  created_at?: string | null;
}

export interface ActivityGallery {
  id: number;
  tenant_id: number;
  gallery_name: string;
  gallery_type: GalleryType;
  description?: string | null;
  activity_date: string;
  created_by: number;
  is_published: boolean;
  status: number;
  created_at: string;
  updated_at: string;
  class_id?: number | null;
  class_name?: string | null;
  division_id?: number | null;
  division_name?: string | null;
  photo_count: number;
  video_count: number;
  media_count: number;
  class_mappings?: ActivityGalleryClassMapping[];
  media_items?: ActivityGalleryMedia[];
}

export interface ActivityGalleryListItem {
  id: number;
  tenant_id: number;
  gallery_name: string;
  gallery_type: GalleryType;
  activity_date: string;
  description?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  class_id?: number | null;
  class_name?: string | null;
  division_id?: number | null;
  division_name?: string | null;
  photo_count: number;
  video_count: number;
  media_count: number;
}

export interface ActivityGalleryListResponse {
  data: ActivityGalleryListItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ActivityGalleryClassTarget {
  class_id: number;
  division_id: number;
}

export interface ActivityGalleryCreateRequest {
  gallery_name: string;
  gallery_type: GalleryType;
  activity_date: string;
  description?: string | null;
  targets: ActivityGalleryClassTarget[];
}

export interface ActivityGalleryUpdateRequest {
  gallery_name?: string;
  activity_date?: string;
  description?: string | null;
  targets?: ActivityGalleryClassTarget[];
}

export interface ActivityGalleryPublishResponse {
  message: string;
  gallery: ActivityGallery;
}

export interface ActivityGalleryDeleteResponse {
  message: string;
}

export interface ClassOption {
  id: number;
  name: string;
}

export interface DivisionOption {
  id: number;
  division_name: string;
}

export interface TeacherGalleryClassDivision {
  id: number;
  division_name: string;
}

export interface TeacherGalleryClassOption {
  id: number;
  name: string;
  divisions: TeacherGalleryClassDivision[];
}

export interface TeacherGalleryScopeResponse {
  is_teacher: boolean;
  default_targets: ActivityGalleryClassTarget[];
  classes: TeacherGalleryClassOption[];
}

export interface GalleryAccessPermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_download: boolean;
}
