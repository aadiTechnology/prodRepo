import type { FormConfig } from "../../components/reusable/formFramework.types";

export type EnrollmentFormData = {
  student_name: string;
  date_of_birth: string;
  gender: string;
  admission_no: string;
  roll_no: string;
  admission_date: string;
  academic_year_id: string;
  class_id: string;
  class_division_id: string;
  parent_name: string;
  mobile_number: string;
  email: string;
  fee_structure_id: string;
  discount_id: string;
  birth_certificate_url: string;
  photo_url: string;
};

type Option = { id: string; label: string; value: string };

type CreateEnrollmentFormConfigArgs = {
  academicYearOptions: Option[];
  classOptions: Option[];
  divisionOptions: Option[];
  feePlanOptions: Option[];
  discountOptions: Option[];
  autoAssignAdmissionNo?: boolean;
};

export function createEnrollmentFormConfig({
  academicYearOptions,
  classOptions,
  divisionOptions,
  feePlanOptions,
  discountOptions,
  autoAssignAdmissionNo = false,
}: CreateEnrollmentFormConfigArgs): FormConfig<EnrollmentFormData> {
  return {
    fields: {
      student_name: {
        name: "student_name",
        label: "Student Name",
        type: "text",
        placeholder: "Enter student name",
        required: true,
      },
      date_of_birth: {
        name: "date_of_birth",
        label: "Date of Birth",
        type: "dob",
        required: false,
      },
      gender: {
        name: "gender",
        label: "Gender",
        type: "select",
        required: false,
        props: {
          options: [
            { id: "", label: "Select gender", value: "" },
            { id: "Male", label: "Male", value: "Male" },
            { id: "Female", label: "Female", value: "Female" },
            { id: "Other", label: "Other", value: "Other" },
          ],
          disableWhenEmpty: false,
        },
      },
      admission_no: {
        name: "admission_no",
        label: "Admission No",
        type: "text",
        placeholder: autoAssignAdmissionNo
          ? "Auto-generated — edit if needed"
          : "Enter admission number",
        required: false,
      },
      roll_no: {
        name: "roll_no",
        label: "Roll Number",
        type: "text",
        placeholder: "Enter roll number",
        required: false,
      },
      admission_date: {
        name: "admission_date",
        label: "Admission Date",
        type: "text",
        required: true,
        props: { type: "date", InputLabelProps: { shrink: true } },
      },
      academic_year_id: {
        name: "academic_year_id",
        label: "Academic Year",
        type: "select",
        required: true,
        props: {
          options: [{ id: "", label: "Select year", value: "" }, ...academicYearOptions],
          disableWhenEmpty: false,
        },
      },
      class_id: {
        name: "class_id",
        label: "Class",
        type: "select",
        required: true,
        props: {
          options: [{ id: "", label: "Select class", value: "" }, ...classOptions],
          disableWhenEmpty: true,
        },
      },
      class_division_id: {
        name: "class_division_id",
        label: "Division",
        type: "select",
        required: false,
        props: {
          options: [{ id: "", label: "Select division", value: "" }, ...divisionOptions],
          disableWhenEmpty: true,
        },
      },
      parent_name: {
        name: "parent_name",
        label: "Parent Name",
        type: "text",
        placeholder: "Enter parent name",
        required: true,
      },
      mobile_number: {
        name: "mobile_number",
        label: "Contact Number",
        type: "phone",
        placeholder: "10-15 digit mobile number",
        required: true,
        props: { htmlInput: { maxLength: 15 } },
      },
      email: {
        name: "email",
        label: "Email Address",
        type: "email",
        placeholder: "parent@email.com",
        required: true,
      },
      fee_structure_id: {
        name: "fee_structure_id",
        label: "Fee Plan",
        type: "select",
        required: true,
        props: {
          options: [{ id: "", label: "Select fee plan", value: "" }, ...feePlanOptions],
          disableWhenEmpty: true,
        },
      },
      discount_id: {
        name: "discount_id",
        label: "Discount",
        type: "select",
        required: false,
        props: {
          options: [{ id: "", label: "None", value: "" }, ...discountOptions],
          disableWhenEmpty: false,
        },
      },
      birth_certificate_url: {
        name: "birth_certificate_url",
        label: "Birth Certificate",
        type: "custom",
        required: false,
      },
      photo_url: {
        name: "photo_url",
        label: "Photo",
        type: "custom",
        required: false,
      },
    },
    layoutRows: [
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["student_name"] },
      { kind: "fields", grid: { xs: 12, sm: 3 }, fieldNames: ["date_of_birth"] },
      { kind: "fields", grid: { xs: 12, sm: 3 }, fieldNames: ["gender"] },

      { kind: "fields", grid: { xs: 12, sm: 4 }, fieldNames: ["admission_no"] },
      { kind: "fields", grid: { xs: 12, sm: 4 }, fieldNames: ["admission_date"] },
      { kind: "fields", grid: { xs: 12, sm: 4 }, fieldNames: ["academic_year_id"] },

      { kind: "fields", grid: { xs: 12, sm: 4 }, fieldNames: ["class_id"] },
      { kind: "fields", grid: { xs: 12, sm: 4 }, fieldNames: ["class_division_id"] },
      { kind: "fields", grid: { xs: 12, sm: 4 }, fieldNames: ["roll_no"] },

      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["parent_name"] },
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["mobile_number"] },
      { kind: "fields", grid: { xs: 12 }, fieldNames: ["email"] },

      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["fee_structure_id"] },
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["discount_id"] },

      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["birth_certificate_url"] },
      { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["photo_url"] },
    ],
  };
}
