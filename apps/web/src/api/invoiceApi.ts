import axiosInstance from "./axiosInstance";

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

export interface FeePlanResponse {
  id: number;
  class_id: number;
  division_id?: number | null;
  academic_year_id: number;
  total_amount: number;
  name?: string | null;
}

export interface InvoiceStudentItem {
  id: number;
  student_name: string;
  roll_no?: string | null;
  is_invoice_generated: boolean;
}

export interface GenerateInvoicePayload {
  academic_year_id: number;
  class_id: number;
  division_id: number;
  installment_name: string;
  invoice_date: string;
  due_date: string;
  student_ids: number[];
}

export interface GenerateInvoiceResponse {
  created_count: number;
  skipped_count: number;
  message: string;
  skipped_student_ids?: number[];
}

export interface InstallmentOption {
  value: string;
  label: string;
  due_date?: string;
}

const toDateInputValue = (raw: unknown): string | undefined => {
  if (!raw) return undefined;
  const text = String(raw).trim();
  if (!text) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().split("T")[0];
};

const invoiceApi = {
  normalizeStudents(raw: unknown[]): InvoiceStudentItem[] {
    return raw
      .map((item) => {
        const row = item as Record<string, unknown>;
        const id = Number(row.id);
        if (!id || Number.isNaN(id)) return null;
        return {
          id,
          student_name: String(row.student_name ?? row.name ?? ""),
          roll_no: row.roll_no ? String(row.roll_no) : null,
          is_invoice_generated: Boolean(row.is_invoice_generated),
        } as InvoiceStudentItem;
      })
      .filter((row): row is InvoiceStudentItem => row !== null);
  },

  async getAcademicYears(): Promise<AcademicYearOption[]> {
    const response = await axiosInstance.get("/api/academic-years");
    return Array.isArray(response.data) ? response.data : [];
  },

  async getClasses(academicYearId: number): Promise<ClassOption[]> {
    const response = await axiosInstance.get("/api/classes", {
      params: { academic_year_id: academicYearId },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async getDivisions(classId: number): Promise<DivisionOption[]> {
    const response = await axiosInstance.get("/api/divisions", {
      params: { class_id: classId },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async getFeePlan(classId: number, divisionId: number): Promise<FeePlanResponse | null> {
    const response = await axiosInstance.get("/api/fee-plans", {
      params: { class_id: classId, division_id: divisionId },
    });
    return response.data ?? null;
  },

  async getInstallmentOptions(params: {
    class_id: number;
    division_id: number;
    academic_year_id: number;
  }): Promise<InstallmentOption[]> {
    const feePlan = await this.getFeePlan(params.class_id, params.division_id);
    if (!feePlan) return [];
    if (feePlan.academic_year_id !== params.academic_year_id) return [];

    const response = await axiosInstance.get(`/fees/structures/${feePlan.id}`);
    const installments = Array.isArray(response.data?.installments) ? response.data.installments : [];

    const normalized = installments
      .map((item: unknown) => {
        const row = item as Record<string, unknown>;
        const numberValue = Number(row.installment_number);
        const description = String(row.description ?? "").trim();
        const label = description || `Installment ${Number.isNaN(numberValue) ? "" : numberValue}`.trim();
        const dueDateValue = toDateInputValue(row.due_date);
        if (!label) return null;
        return {
          value: label,
          label,
          due_date: dueDateValue,
        };
      })
      .filter((item): item is InstallmentOption => item !== null);

    return Array.from(new Map(normalized.map((item) => [item.value, item])).values());
  },

  async getStudents(params: {
    class_id: number;
    division_id: number;
    academic_year_id: number;
    installment_name?: string;
  }): Promise<InvoiceStudentItem[]> {
    const response = await axiosInstance.get("/api/students", { params });
    if (Array.isArray(response.data)) return this.normalizeStudents(response.data);
    if (response.data?.data && Array.isArray(response.data.data)) {
      return this.normalizeStudents(response.data.data);
    }
    return [];
  },

  async generateInvoices(payload: GenerateInvoicePayload): Promise<GenerateInvoiceResponse> {
    const response = await axiosInstance.post("/api/invoices/generate", payload);
    return response.data;
  },
};

export default invoiceApi;
