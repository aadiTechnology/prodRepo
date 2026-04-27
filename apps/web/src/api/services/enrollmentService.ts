import { apiClient } from "../client";

export interface EnrollmentPrefill {
  lead_id: number;
  student_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  parent_name?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  academic_year_id?: number | null;
  class_id?: number | null;
  expected_admission_date?: string | null;
  birth_certificate_url?: string | null;
  photo_url?: string | null;
}

export interface EnrollmentCreatePayload {
  lead_id?: number | null;
  student_name: string;
  date_of_birth: string;
  gender?: string | null;
  admission_no?: string | null;
  admission_date: string;
  academic_year_id: number;
  class_id: number;
  class_division_id?: number | null;
  roll_no?: string | null;
  parent_name: string;
  mobile_number: string;
  email?: string | null;
  fee_structure_id: number;
  discount_id?: number | null;
  additional_fee?: number | null;
  birth_certificate_url?: string | null;
  photo_url?: string | null;
}

export interface EnrollmentCreateResponse {
  message: string;
  student_id: number;
  admission_no: string;
  fee_assignment: any;
  printable: any;
}

export interface EnrollmentUploadResponse {
  message: string;
  file_url: string;
  file_name: string;
  document_type: "birth_certificate" | "photo";
}

const BASE = "/api/admissions/enrollments";

const enrollmentService = {
  prefillFromLead: async (leadId: number): Promise<EnrollmentPrefill> => {
    const res = await apiClient.get(`${BASE}/prefill/${leadId}`);
    return res.data;
  },

  enroll: async (payload: EnrollmentCreatePayload): Promise<EnrollmentCreateResponse> => {
    const res = await apiClient.post(BASE, payload);
    return res.data;
  },

  uploadDocument: async (
    file: File,
    documentType: "birth_certificate" | "photo"
  ): Promise<EnrollmentUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post(`${BASE}/upload-document`, formData, {
      params: { document_type: documentType },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

export default enrollmentService;
