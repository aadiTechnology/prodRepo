import { type FormConfig } from "../../components/reusable/formFramework.types";

export type AddAcademicYearFormData = {
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type AddAcademicYearFormConfigArgs = {
  isEditMode: boolean;
};

export function createAddAcademicYearFormConfig({
  isEditMode,
}: AddAcademicYearFormConfigArgs): FormConfig<AddAcademicYearFormData> {
  return {
    fields: {
      name: {
        name: "name",
        label: "Academic Year Name",
        type: "text",
        placeholder: "e.g. 2024-2025",
        required: true,
        props: {
          htmlInput: { minLength: 2 },
        },
      },
      code: {
        name: "code",
        label: "Code",
        type: "text",
        placeholder: "e.g. AY2425",
        required: true,
        props: {
          htmlInput: { minLength: 2 },
        },
      },
      start_date: {
        name: "start_date",
        label: "Start Date",
        type: "text",
        required: true,
        props: {
          type: "date",
          slotProps: { inputLabel: { shrink: true } },
        },
      },
      end_date: {
        name: "end_date",
        label: "End Date",
        type: "text",
        required: true,
        props: {
          type: "date",
          slotProps: { inputLabel: { shrink: true } },
        },
      },
      is_active: {
        name: "is_active",
        label: "Status",
        type: "switch",
        conditionalRender: () => isEditMode,
        helperText: "Control system access for this academic year",
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12, sm: 6, md: 6 },
        fieldNames: ["name", "code"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6, md: 6 },
        fieldNames: ["start_date", "end_date"],
      },
      ...(isEditMode
        ? [
            {
              kind: "fields" as const,
              grid: { xs: 12, sm: 12, md: 12 },
              fieldNames: ["is_active" as keyof AddAcademicYearFormData],
            },
          ]
        : []),
    ],
  };
}
