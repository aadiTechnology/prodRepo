import { type FormConfig } from "../../components/reusable/formFramework.types";

export type AddClassFormData = {
  academic_year_id: number | "";
  name: string;
  section: string;
  capacity: string;
  is_active: boolean;
};

export const createAddClassFormConfig = (options: {
  isEditMode: boolean;
}): FormConfig<AddClassFormData> => ({
  fields: {
    name: {
      name: "name",
      label: "Class Name",
      type: "text",
      placeholder: "e.g. Nursery",
      required: true,
    },
    section: {
      name: "section",
      label: "Section",
      type: "text",
      placeholder: "e.g. A",
      required: true,
    },
    capacity: {
      name: "capacity",
      label: "Capacity",
      type: "text",
      placeholder: "e.g. 30",
      required: true,
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
      fieldNames: ["name", "section"],
    },
    {
      kind: "fields",
      grid: { xs: 12, sm: 6 },
      fieldNames: ["capacity"],
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
