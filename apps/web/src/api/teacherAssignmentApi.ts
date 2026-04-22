import axiosInstance from "./axiosInstance";

export type TeacherAssignmentStatus = "ASSIGNED" | "NOT_ASSIGNED";

export interface AcademicYearOption {
  id: number;
  name: string;
}

export interface ClassOption {
  id: number;
  name: string;
}

export interface DivisionOption {
  id: number;
  division_name: string;
}

export interface TeacherOption {
  id: number;
  full_name: string;
}

export interface TeacherAssignmentAssignedMap {
  class_ids: number[];
  class_division_ids: number[];
}

export interface TeacherAssignmentApiItem {
  id: number;
  academic_year_id: number | null;
  class_id: number | null;
  class_division_id: number | null;
  class_division_ids?: number[] | null;
  class_name: string | null;
  division_name: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  status: TeacherAssignmentStatus;
}

export interface TeacherAssignmentsApiResponse {
  data: TeacherAssignmentApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface TeacherAssignmentsQueryParams {
  page: number;
  limit: number;
  search?: string;
}

export interface AssignTeacherPayload {
  academic_year_id: number;
  class_id: number;
  class_division_id?: number | null;
  class_division_ids?: number[];
  teacher_id: number;
}

export interface AssignTeacherResponse {
  message: string;
  assignment_id: number | null;
}

export interface UnassignTeacherResponse {
  message: string;
}

export interface CheckAssignmentParams {
  class_id: number;
  division_id: number;
  academic_year_id: number;
}

export interface CheckAssignmentResponse {
  is_assigned: boolean;
  teacher_name: string | null;
}

export interface TeacherAssignmentDetailResponse {
  assignment_id: number;
  academic_year_id: number | null;
  class_id: number | null;
  class_division_id: number | null;
  class_division_ids?: number[] | null;
  teacher_id: number | null;
}

const teacherAssignmentApi = {
  getAcademicYears: async (): Promise<AcademicYearOption[]> => {
    const response = await axiosInstance.get("/api/academic-years");
    return response.data;
  },

  getClasses: async (academicYearId: number): Promise<ClassOption[]> => {
    const response = await axiosInstance.get("/api/classes", {
      params: { academic_year_id: academicYearId },
    });
    return response.data;
  },

  getDivisions: async (classId: number): Promise<DivisionOption[]> => {
    const response = await axiosInstance.get("/api/divisions", {
      params: { class_id: classId },
    });
    return response.data;
  },

  getTeachers: async (): Promise<TeacherOption[]> => {
    const response = await axiosInstance.get("/api/teacher-assignment-teachers", {
      params: { status: "active", limit: 1000 },
    });
    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload.map(
        (item: { id: number; full_name?: string | null; teacher_name?: string | null }) => ({
          id: item.id,
          full_name: item.full_name || item.teacher_name || "",
        })
      );
    }
    if (payload && Array.isArray(payload.items)) {
      return payload.items.map((item: { id: number; full_name?: string | null; teacher_name?: string | null }) => ({
        id: item.id,
        full_name: item.full_name || item.teacher_name || "",
      }));
    }
    if (payload && Array.isArray(payload.data)) {
      return payload.data.map((item: { id: number; full_name?: string | null; teacher_name?: string | null }) => ({
        id: item.id,
        full_name: item.full_name || item.teacher_name || "",
      }));
    }
    return [];
  },

  getTeacherAssignments: async (
    params: TeacherAssignmentsQueryParams
  ): Promise<TeacherAssignmentsApiResponse> => {
    const response = await axiosInstance.get("/api/teacher-assignments", { params });
    return response.data;
  },

  getAssignedMap: async (academicYearId: number): Promise<TeacherAssignmentAssignedMap> => {
    const response = await axiosInstance.get("/api/teacher-assignments/assigned-map", {
      params: { academic_year_id: academicYearId },
    });
    return response.data;
  },

  checkAssignment: async (
    params: CheckAssignmentParams
  ): Promise<CheckAssignmentResponse> => {
    const response = await axiosInstance.get("/api/teacher-assignments/check", { params });
    return response.data;
  },

  assignTeacher: async (payload: AssignTeacherPayload): Promise<AssignTeacherResponse> => {
    const response = await axiosInstance.post("/api/teacher-assignments", payload);
    return response.data;
  },

  updateTeacherAssignment: async (
    assignmentId: number,
    payload: AssignTeacherPayload
  ): Promise<AssignTeacherResponse> => {
    const response = await axiosInstance.put(`/api/teacher-assignments/${assignmentId}`, payload);
    return response.data;
  },

  getTeacherAssignmentById: async (
    assignmentId: number
  ): Promise<TeacherAssignmentDetailResponse> => {
    const response = await axiosInstance.get(`/api/teacher-assignments/${assignmentId}`);
    return response.data;
  },

  unassignTeacher: async (assignmentId: number): Promise<UnassignTeacherResponse> => {
    const response = await axiosInstance.delete(`/api/teacher-assignments/${assignmentId}`);
    return response.data;
  },
};

export default teacherAssignmentApi;
