import { type FormConfig } from "../../components/reusable/formFramework.types";
import { FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText } from "@mui/material";

export type AddSubjectFormData = {
  name: string;
  code: string;
  description: string;
  subject_type: string;
  is_active: boolean;
  class_ids: number[];
};

export const createAddSubjectFormConfig = (options: {
  isEditMode: boolean;
  classOptions: { id: number; label: string }[];
}): FormConfig<AddSubjectFormData> => ({
  fields: {
    name: {
      name: "name",
      label: "Subject Name",
      type: "text",
      placeholder: "e.g. Mathematics",
      required: true,
      props: { htmlInput: { minLength: 1 } },
    },
    code: {
      name: "code",
      label: "Subject Code",
      type: "text",
      placeholder: "e.g. MAT101",
      required: true,
    },
    subject_type: {
      name: "subject_type",
      label: "Subject Type",
      type: "select",
      required: true,
      props: {
        options: [
          { id: "Theory", label: "Theory", value: "Theory" },
          { id: "Practical", label: "Practical", value: "Practical" },
          { id: "Activity", label: "Activity", value: "Activity" },
        ],
        disableWhenEmpty: false,
      },
    },
    description: {
      name: "description",
      label: "Description",
      type: "text",
      placeholder: "Optional description",
      required: false,
    },
    class_ids: {
      name: "class_ids",
      label: "Applicable Classes",
      type: "select",
      required: false,
      props: {
        multiple: true,
        coerceToNumberArray: true,
        options: options.classOptions.map((c) => ({
          id: String(c.id),
          value: String(c.id),
          label: c.label,
        })),
        disableWhenEmpty: false,
        emptyListLabel: "No classes available",
      },
    },
    is_active: {
      name: "is_active",
      label: "Subject Status",
      type: "switch",
      helperText: "Control system access for this subject",
    },
  },
  layoutRows: [
    {
      kind: "fields",
      grid: { xs: 12, md: 6 },
      fieldNames: ["name", "code"],
    },
    {
      kind: "fields",
      grid: { xs: 12, md: 6 },
      fieldNames: ["subject_type", "class_ids"],
    },
    {
      kind: "fields",
      grid: { xs: 12 },
      fieldNames: ["description"],
    },
    {
      kind: "fields",
      grid: { xs: 12 },
      fieldNames: ["is_active"],
      show: (ctx) => ctx.isEditMode,
    },
  ],
});
