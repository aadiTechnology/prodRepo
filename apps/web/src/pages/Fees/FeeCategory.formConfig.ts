import { type FormConfig } from "../../components/reusable/formFramework.types";

export interface FeeCategoryFormData extends Record<string, unknown> {
  name: string;
  status: boolean;
}

export function createFeeCategoryFormConfig({
  isEditMode,
}: {
  isEditMode: boolean;
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
      status: {
        name: "status",
        label: "Status",
        type: "switch",
        helperText: "Active categories are available for use",
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["name"],
      },
      ...(isEditMode
        ? [
            {
              kind: "fields" as const,
              grid: { xs: 12 },
              fieldNames: ["status"] as (keyof FeeCategoryFormData & string)[],
            },
          ]
        : []),
    ],
  };
}
