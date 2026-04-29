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
  admission_no?: string | null;
  student_code?: string | null;
  roll_no?: string | null;
  class_name?: string | null;
  division_name?: string | null;
  is_invoice_generated: boolean;
}

export interface GenerateInvoicePayload {
  academic_year_id: number;
  class_id: number;
  division_id: number;
  fee_structure_id: number;
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
  amount?: number;
}

export interface FeeStructureOption {
  id: number;
  name: string;
  class_division_id?: number | null;
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
          admission_no: row.admission_no ? String(row.admission_no) : null,
          student_code: row.student_code ? String(row.student_code) : null,
          roll_no: row.roll_no ? String(row.roll_no) : null,
          class_name: row.class_name ? String(row.class_name) : null,
          division_name: row.division_name ? String(row.division_name) : null,
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

  async getFeeStructureOptions(params: {
    class_id: number;
    division_id: number;
    academic_year_id: number;
  }): Promise<FeeStructureOption[]> {
    const response = await axiosInstance.get("/fees/structures", {
      params: {
        page: 0,
        size: 200,
        class_id: params.class_id,
        academic_year_id: params.academic_year_id,
      },
    });

    const items = Array.isArray(response.data?.items) ? response.data.items : [];
    return items
      .map((item: unknown) => {
        const row = item as Record<string, unknown>;
        const id = Number(row.id);
        if (!id || Number.isNaN(id)) return null;
        return {
          id,
          name: String(row.name ?? `Fee Structure ${id}`),
          class_division_id:
            row.class_division_id === null || row.class_division_id === undefined
              ? null
              : Number(row.class_division_id),
        } as FeeStructureOption;
      })
      .filter((item): item is FeeStructureOption => item !== null)
      .filter(
        (item) =>
          item.class_division_id === params.division_id || item.class_division_id === null
      );
  },

  async getInstallmentOptionsByFeeStructureId(
    feeStructureId: number
  ): Promise<InstallmentOption[]> {
    const response = await axiosInstance.get(`/fees/structures/${feeStructureId}`);
    const installments = Array.isArray(response.data?.installments) ? response.data.installments : [];

    const normalized: InstallmentOption[] = installments
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
          amount: row.amount ? Number(row.amount) : undefined,
        };
      })
      .filter((item: InstallmentOption | null): item is InstallmentOption => item !== null);

    return Array.from(new Map<string, InstallmentOption>(normalized.map((item) => [item.value, item])).values());
  },

  async getStudents(params: {
    class_id: number;
    division_id: number;
    academic_year_id: number;
    fee_structure_id?: number;
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
