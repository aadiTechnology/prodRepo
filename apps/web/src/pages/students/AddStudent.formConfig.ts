import { type FormConfig } from "../../components/reusable/formFramework.types";

export type AddStudentFormData = {
  student_name: string;
  gender: string;
  date_of_birth: string;
  mobile_number: string;
  email?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  class_id: number | "";
  class_division_id: number | "";
  is_active: boolean;
  mother_name: string;
  mother_contact_number: string;
  tenant_id: number;
};

type AddStudentFormConfigArgs = {
  isEditMode: boolean;
  classes: any[];
  divisions: any[];
};

export function createAddStudentFormConfig({ isEditMode, classes, divisions }: AddStudentFormConfigArgs): FormConfig<AddStudentFormData> {
  return {
    fields: {
      student_name: { name: "student_name", label: "Student Name", type: "text", required: true },
      gender: {
        name: "gender", label: "Gender", type: "select", required: true,
        props: { options: [
          { id: "Male", value: "Male", label: "Male" },
          { id: "Female", value: "Female", label: "Female" },
          { id: "Other", value: "Other", label: "Other" },
        ] }
      },
      date_of_birth: { name: "date_of_birth", label: "Date of Birth", type: "date", required: true },
      mobile_number: { name: "mobile_number", label: "Mobile Number", type: "text", required: true },
      email: { name: "email", label: "Email", type: "text" },
      address: { name: "address", label: "Address", type: "text" },
      area: { name: "area", label: "Area", type: "text" },
      city: { name: "city", label: "City", type: "text" },
      state: { name: "state", label: "State", type: "text" },
      pincode: { name: "pincode", label: "Pincode", type: "text" },
      class_id: {
        name: "class_id", label: "Class", type: "select", required: true,
        props: { options: classes.map((c) => ({ id: String(c.id), value: String(c.id), label: c.name })) }
      },
      class_division_id: {
        name: "class_division_id", label: "Division", type: "select", required: true,
        props: { options: divisions.map((d) => ({ id: String(d.id), value: String(d.id), label: d.division_name })) }
      },
      mother_name: { name: "mother_name", label: "Mother Name", type: "text", required: true },
      mother_contact_number: { name: "mother_contact_number", label: "Mother Contact Number", type: "text", required: true },
      is_active: { name: "is_active", label: "Active", type: "switch" },
      tenant_id: { name: "tenant_id", label: "Tenant ID", type: "text", conditionalRender: () => false },
    },
    layoutRows: [
      { kind: 'fields' as const, grid: { xs: 12, sm: 6 }, fieldNames: ["student_name", "gender"] as (keyof AddStudentFormData)[] },
      { kind: 'fields' as const, grid: { xs: 12, sm: 6 }, fieldNames: ["date_of_birth", "mobile_number"] as (keyof AddStudentFormData)[] },
      { kind: 'fields' as const, grid: { xs: 12, sm: 6 }, fieldNames: ["email", "address"] as (keyof AddStudentFormData)[] },
      { kind: 'fields' as const, grid: { xs: 12, sm: 6 }, fieldNames: ["area", "city"] as (keyof AddStudentFormData)[] },
      { kind: 'fields' as const, grid: { xs: 12, sm: 6 }, fieldNames: ["state", "pincode"] as (keyof AddStudentFormData)[] },
      { kind: 'fields' as const, grid: { xs: 12, sm: 6 }, fieldNames: ["class_id", "class_division_id"] as (keyof AddStudentFormData)[] },
      { kind: 'fields' as const, grid: { xs: 12, sm: 6 }, fieldNames: ["mother_name", "mother_contact_number"] as (keyof AddStudentFormData)[] },
      ...(isEditMode ? [{ kind: 'fields' as const, grid: { xs: 12, sm: 6 }, fieldNames: ["is_active"] as (keyof AddStudentFormData)[] }] : []),
    ],
  };
}
