import { type FormConfig } from "../../components/reusable/formFramework.types";

export type AddClassDivision = {
  id?: number;
  division_name: string;
  capacity: string;
  is_active: boolean;
};

export type AddClassFormData = {
  name: string;
  academic_year_id: string;
  is_active: boolean;
  divisions: AddClassDivision[];
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
      label: "Class Name",
      type: "text",
      placeholder: "e.g. Nursery",
      required: true,
      props: { htmlInput: { minLength: 1 } },
    },
    is_active: {
      name: "is_active",
      label: "Class Status",
      type: "switch",
      helperText: "Control system access for this entire class",
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
      fieldNames: ["name"],
    },
    {
      kind: "fields",
      grid: { xs: 12 },
      fieldNames: ["is_active"],
      show: (ctx) => ctx.isEditMode,
    },
  ],
});
