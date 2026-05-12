import { type FormConfig } from "../../components/reusable/formFramework.types";

export type AddSubjectItem = {
  id?: number; // Optional ID - only present for existing subjects
  name: string;
  code: string;
  subject_type: string;
  is_mandatory: boolean;
  is_active: boolean;
};

export type AddSubjectFormData = {
  academic_year_id: string;
  class_id: string;
  description: string;
  subjects: AddSubjectItem[];
};

export const createAddSubjectFormConfig = (options: {
  isEditMode: boolean;
  classOptions: { label: string; value: string }[];
  academicYearOptions: { label: string; value: string }[];
}): FormConfig<AddSubjectFormData> => ({

  fields: {
    academic_year_id: {
      name: "academic_year_id",
      label: "Academic Year",
      type: "select",
      required: true,
      props: {
        options: options.academicYearOptions,
        placeholder: "Select Year",
      },
    },
    class_id: {
      name: "class_id",
      label: "Class",
      type: "select",
      required: true,
      props: {
        options: options.classOptions,
        placeholder: "Select Class",
      },
    },
    description: {
      name: "description",
      label: "General Description",
      type: "text",
      placeholder: "Optional notes for this batch",
      required: false,
    },
  },
  layoutRows: [
    {
      kind: "fields",
      grid: { xs: 12, md: 6 },
      fieldNames: ["academic_year_id"],
    },
    {
      kind: "fields",
      grid: { xs: 12, md: 6 },
      fieldNames: ["class_id"],
    },
    {
      kind: "fields",
      grid: { xs: 12 },
      fieldNames: ["description"],
    },
  ],
});


