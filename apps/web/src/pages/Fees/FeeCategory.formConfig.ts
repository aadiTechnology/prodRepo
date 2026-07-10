import { type FormConfig } from "../../components/reusable/formFramework.types";

export interface FeeCategoryFormData extends Record<string, unknown> {
  name: string;
  academic_year_id: number | "";
  class_id: number | "";
  amount: number | "";
  status: boolean;
}

export function createFeeCategoryFormConfig({
  isEditMode,
  academicYears,
  classes,
}: {
  isEditMode: boolean;
  academicYears: { id: number; name: string }[];
  classes: { id: number; name: string }[];
}): FormConfig<FeeCategoryFormData> {
  return {
    fields: {
      name: {
        name: "name",
        label: "Category Name",
        type: "text",
        placeholder: "e.g. Tuition",
        required: true,
      },
      academic_year_id: {
        name: "academic_year_id",
        label: "Academic Year",
        type: "select",
        required: true,
        props: {
          options: academicYears.map((ay) => ({ value: ay.id, label: ay.name })),
        },
      },
      class_id: {
        name: "class_id",
        label: "Class",
        type: "select",
        required: true,
        props: {
          options: classes.map((c) => ({ value: c.id, label: c.name })),
          disabled: classes.length === 0,
        },
      },
      amount: {
        name: "amount",
        label: "Amount",
        type: "text",
        placeholder: "e.g. 5000",
        required: true,
        props: { type: "number" },
      },
      status: {
        name: "status",
        label: "Status",
        type: "switch",
        helperText: "Active categories are available for use",
        props: {
          sx: {
            width: "fit-content",
            maxWidth: "100%",
            p: 1.25,
          },
        },
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["academic_year_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["class_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["name"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["amount"],
      },
      ...(isEditMode
        ? [
            {
              kind: "fields" as const,
              grid: { xs: 12, sm: 6 },
              fieldNames: ["status"] as (keyof FeeCategoryFormData & string)[],
            },
          ]
        : []),
    ],
  };
}
