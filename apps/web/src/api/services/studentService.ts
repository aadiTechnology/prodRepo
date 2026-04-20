
import axiosInstance from "../client";

export interface StudentDropdownItem {
  id: string;
  name: string;
  className: string;
}


export interface StudentDetails {
  id: string;
  name: string;
  roll_no?: string;
  gender?: string;
  date_of_birth?: string;
  mobile?: string;
  email?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  class_id?: number;
  class_division_id?: number;
  class_name?: string;
  class_division_name?: string;
  academic_year_id?: number;
  academic_year_name?: string;
  fee_structure_id?: number;
  fee_structure_name?: string;
  discount_id?: number;
  discount_name?: string;
  is_active?: boolean;
  parent_name?: string;
  parent_mobile?: string;
  tenant_id?: number;
  admission_no?: string;
  created_at?: string;
  updated_at?: string;
  className?: string;
  classId?: number;
  tenantId?: number;
  feeStructureId?: number;
  birth_certificate_url?: string;
  photo_url?: string;
}


const studentService = {
  async update(id: string, payload: any) {
    const { data } = await axiosInstance.put(`/api/students/${id}`, payload);
    return data;
  },
  async create(payload: any) {
    const { data } = await axiosInstance.post("/api/students", payload);
    return data;
  },
  async list(params?: { page?: number; limit?: number; search?: string; class_id?: number; class?: string; status?: string }) {
    const { data } = await axiosInstance.get("/api/students", { params });
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
    await axiosInstance.delete(`/api/students/${id}`);
  },

  async getStudentsDropdown(): Promise<StudentDropdownItem[]> {
    const { data } = await axiosInstance.get("/api/students/dropdown");
    return data.data || data;
  },

  async getStudentById(id: string): Promise<StudentDetails> {
    const { data } = await axiosInstance.get(`/api/students/${id}`);
    const d = data.data || data;
    return {
      ...d,
      roll_no: d.roll_no,
      gender: d.gender,
      date_of_birth: d.date_of_birth,
      mobile: d.mobile,
      email: d.email,
      address: d.address,
      area: d.area,
      city: d.city,
      state: d.state,
      pincode: d.pincode,
      class_id: d.class_id,
      class_division_id: d.class_division_id,
      class_name: d.class_name,
      class_division_name: d.class_division_name,
      academic_year_id: d.academic_year_id,
      academic_year_name: d.academic_year_name,
      fee_structure_id: d.fee_structure_id,
      fee_structure_name: d.fee_structure_name,
      discount_id: d.discount_id,
      discount_name: d.discount_name,
      is_active: d.is_active,
      parent_name: d.parent_name,
      parent_mobile: d.parent_mobile,
      tenant_id: d.tenant_id,
      admission_no: d.admission_no,
      created_at: d.created_at,
      updated_at: d.updated_at,
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
