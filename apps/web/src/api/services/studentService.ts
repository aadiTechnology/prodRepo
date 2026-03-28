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
