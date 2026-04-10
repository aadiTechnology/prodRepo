import { type FormConfig } from "../../components/reusable/formFramework.types";

export type AddClassFormData = {
  name: string;
  academic_year_id: string;
  section: string;
  capacity: string;
  is_active: boolean;
};

export const createAddClassFormConfig = (options: {
  isEditMode: boolean;
  academicYearOptions: { id: string; label: string; value: string }[];
}): FormConfig<AddClassFormData> => ({
  fields: {
    academic_year_id: {
      name: "academic_year_id",
      label: "Academic Year",
      type: "select",
      required: true,
      props: {
        options: [
          { id: "", label: "Select year", value: "" },
          ...options.academicYearOptions,
        ],
        disableWhenEmpty: false,
      },
    },
    name: {
      name: "name",
      label: "Class",
      type: "text",
      placeholder: "e.g. Nursery",
      required: true,
      props: { htmlInput: { minLength: 1 } },
    },
    section: {
      name: "section",
      label: "Division",
      type: "text",
      placeholder: "e.g. A",
      required: true,
      props: { htmlInput: { minLength: 1 } },
    },
    capacity: {
      name: "capacity",
      label: "Capacity",
      type: "text",
      placeholder: "e.g. 30",
      required: true,
      props: { htmlInput: { minLength: 1 } },
    },
    is_active: {
      name: "is_active",
      label: "Status",
      type: "switch",
      helperText: "Control system access for this class",
    },
  },
  layoutRows: [
    {
      kind: "fields",
      grid: { xs: 12, sm: 6 },
      fieldNames: ["academic_year_id", "name"],
    },
    {
      kind: "fields",
      grid: { xs: 12, sm: 6 },
      fieldNames: ["section", "capacity"],
    },
    ...(options.isEditMode
      ? [
          {
            kind: "fields" as const,
            grid: { xs: 12 },
            fieldNames: ["is_active" as keyof AddClassFormData],
          },
        ]
      : []),
  ],
});
