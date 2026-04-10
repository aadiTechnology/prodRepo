import { type FormConfig } from "../../components/reusable/formFramework.types";

export type AddLeadFormData = {
  // Parent info
  parent_name: string;
  mobile_number: string;
  alternate_mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  relationship: string;

  // Child info
  child_name: string;
  child_dob: string;
  child_gender: string;

  // Lead meta
  lead_source_id: string;
  lead_status_id: string;
  preferred_class_id: string;
  preferred_academic_year_id: string;
  expected_admission_date: string;
  notes: string;
  remarks: string;
  assigned_to: string;
};

type AddLeadFormConfigArgs = {
  isEditMode: boolean;
  sourceOptions: { id: string; label: string; value: string }[];
  statusOptions: { id: string; label: string; value: string }[];
  classOptions: { id: string; label: string; value: string }[];
  academicYearOptions: { id: string; label: string; value: string }[];
  staffOptions: { id: string; label: string; value: string }[];
};

export function createAddLeadFormConfig({
  isEditMode,
  sourceOptions,
  statusOptions,
  classOptions,
  academicYearOptions,
  staffOptions,
}: AddLeadFormConfigArgs): FormConfig<AddLeadFormData> {
  return {
    fields: {
      // ─── Parent Section ───────────────────────────────────
      parent_name: {
        name: "parent_name",
        label: "Parent / Guardian Name",
        type: "text",
        placeholder: "Enter full name",
        required: true,
      },
      mobile_number: {
        name: "mobile_number",
        label: "Contact Number",
        type: "text",
        placeholder: "10-digit mobile number",
        required: true,
        props: { htmlInput: { maxLength: 15 } },
      },
      alternate_mobile: {
        name: "alternate_mobile",
        label: "Alternate Contact",
        type: "text",
        placeholder: "Optional",
        required: false,
        props: { htmlInput: { maxLength: 15 } },
      },
      email: {
        name: "email",
        label: "Email Address",
        type: "text",
        placeholder: "parent@email.com",
        required: false,
        props: { type: "email" },
      },
      relationship: {
        name: "relationship",
        label: "Relationship",
        type: "select",
        required: false,
        props: {
          options: [
            { id: "", label: "Select relationship", value: "" },
            { id: "Father", label: "Father", value: "Father" },
            { id: "Mother", label: "Mother", value: "Mother" },
            { id: "Guardian", label: "Guardian", value: "Guardian" },
          ],
          disableWhenEmpty: false,
        },
      },
      address: {
        name: "address",
        label: "Address",
        type: "text",
        placeholder: "Street / Area",
        required: false,
        props: { multiline: true, rows: 2 },
      },
      city: {
        name: "city",
        label: "City",
        type: "text",
        placeholder: "City",
        required: false,
      },
      state: {
        name: "state",
        label: "State",
        type: "text",
        placeholder: "State",
        required: false,
      },
      pin_code: {
        name: "pin_code",
        label: "PIN Code",
        type: "text",
        placeholder: "6-digit PIN",
        required: false,
        props: { htmlInput: { maxLength: 6 } },
      },

      // ─── Child Section ───────────────────────────────────
      child_name: {
        name: "child_name",
        label: "Child Name",
        type: "text",
        placeholder: "Enter child's full name",
        required: true,
      },
      child_dob: {
        name: "child_dob",
        label: "Date of Birth",
        type: "text",
        placeholder: "YYYY-MM-DD",
        required: false,
        props: { type: "date" },
      },
      child_gender: {
        name: "child_gender",
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

      // ─── Lead Meta Section ───────────────────────────────
      lead_source_id: {
        name: "lead_source_id",
        label: "Lead Source",
        type: "select",
        required: true,
        props: {
          options: [
            { id: "", label: "Select source", value: "" },
            ...sourceOptions,
          ],
          disableWhenEmpty: false,
        },
      },
      lead_status_id: {
        name: "lead_status_id",
        label: "Lead Status",
        type: "select",
        required: true,
        props: {
          options: [
            { id: "", label: "Select status", value: "" },
            ...statusOptions,
          ],
          disableWhenEmpty: false,
        },
      },
      preferred_class_id: {
        name: "preferred_class_id",
        label: "Preferred Class",
        type: "select",
        required: false,
        props: {
          options: [
            { id: "", label: "Select class", value: "" },
            ...classOptions,
          ],
          disableWhenEmpty: false,
        },
      },
      preferred_academic_year_id: {
        name: "preferred_academic_year_id",
        label: "Academic Year",
        type: "select",
        required: false,
        props: {
          options: [
            { id: "", label: "Select year", value: "" },
            ...academicYearOptions,
          ],
          disableWhenEmpty: false,
        },
      },
      expected_admission_date: {
        name: "expected_admission_date",
        label: "Expected Admission Date",
        type: "text",
        placeholder: "YYYY-MM-DD",
        required: false,
        props: { type: "date" },
      },
      assigned_to: {
        name: "assigned_to",
        label: "Assigned To (Staff)",
        type: "select",
        required: false,
        props: {
          options: [
            { id: "", label: "Unassigned", value: "" },
            ...staffOptions,
          ],
          disableWhenEmpty: false,
        },
      },
      notes: {
        name: "notes",
        label: "Notes",
        type: "text",
        placeholder: "Additional notes about this lead",
        required: false,
        props: { multiline: true, rows: 3 },
      },
      remarks: {
        name: "remarks",
        label: "Internal Remarks",
        type: "text",
        placeholder: "Internal staff remarks (not visible to parent)",
        required: false,
        props: { multiline: true, rows: 2 },
      },
    },
    layoutRows: [
      // Section: Parent Information
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["parent_name", "mobile_number"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["alternate_mobile", "email"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["relationship", "city", "state"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["address"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["pin_code"],
      },

      // Section: Child Information
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["child_name", "child_gender", "child_dob"],
      },

      // Section: Lead Meta
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["lead_source_id", "lead_status_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["preferred_class_id", "preferred_academic_year_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["expected_admission_date", "assigned_to"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["notes"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["remarks"],
      },
    ],
  };
}
