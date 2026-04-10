// ...existing code...
import axiosInstance from "../client";

export interface StudentDropdownItem {
  id: string;
  name: string;
  className: string;
}

export interface StudentDetails {
  id: string;
  name: string;
  className: string;
  classId?: number;
  tenantId?: number;
  feeStructureId?: number;
  // Add other fields as needed
}


const studentService = {
  async list(params?: { page?: number; limit?: number; search?: string; class_id?: number; class?: string; status?: string }) {
    const { data } = await axiosInstance.get("/students", { params });
    // Support both { data, pagination } and { items, total }
    if (Array.isArray(data.data)) {
      // Map 'class' to 'className' for each student
      const items = data.data.map((student: any) => ({ ...student, className: student.className || student.class || student.class_name }));
      return { items, total: data.pagination?.total ?? items.length };
    }
    if (Array.isArray(data.items)) {
      const items = data.items.map((student: any) => ({ ...student, className: student.className || student.class || student.class_name }));
      return { items, total: typeof data.total === "number" ? data.total : items.length };
    }
    return { items: [], total: 0 };
  },

  async delete(id: string) {
    await axiosInstance.delete(`/students/${id}`);
  },

  async getStudentsDropdown(): Promise<StudentDropdownItem[]> {
    const { data } = await axiosInstance.get("/students/dropdown");
    return data.data || data;
  },

  async getStudentById(id: string): Promise<StudentDetails> {
    const { data } = await axiosInstance.get(`/students/${id}`);
    const d = data.data || data;
    return {
      ...d,
      className: d.className || d.class_name,
      classId: d.classId || d.class_id,
      tenantId: d.tenantId || d.tenant_id,
      feeStructureId: d.feeStructureId || d.fee_structure_id,
    };
  },

  async assignFeeToStudent(payload: {
    student_id: number,
    academic_year_id: number,
    fee_structure_id: number,
    discount_id?: number,
    additional_fee?: number,
    remarks?: string
  }) {
    const { data } = await axiosInstance.post("/students/assign-fee", payload);
    return data;
  },
};

export default studentService;
