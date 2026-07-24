import type { ReactNode } from "react";
import { Box } from "../../components/primitives";
import FormFieldRenderer from "../../components/reusable/FormFieldRenderer";
import type { FormConfig } from "../../components/reusable/formFramework.types";
import type { SelectItemOption } from "../../components/semantic";
import { HOLIDAY_TYPE_OPTIONS, type HolidayFormData } from "./holidayForm.config";

export type HolidayFormConfigFactoryArgs = {
  academicYears: { id: number; name: string }[];
  yearsLoading: boolean;
  associatedClassesSlot: ReactNode;
};

export function createHolidayFormConfig({
  academicYears,
  yearsLoading,
  associatedClassesSlot,
}: HolidayFormConfigFactoryArgs): FormConfig<HolidayFormData> {
  const yearOptions: SelectItemOption[] = academicYears.map((y) => ({
    id: `year-${y.id}`,
    value: String(y.id),
    label: y.name,
  }));

  const fields: FormConfig<HolidayFormData>["fields"] = {
    academic_year_id: {
      name: "academic_year_id",
      label: "Academic Year",
      type: "select",
      required: true,
      props: {
        options: yearOptions,
        loading: yearsLoading,
        coerceToNumber: true,
        loadingLabel: "Loading academic years…",
        emptyListLabel: "No academic years available",
        disableWhenEmpty: true,
        size: "small",
        slotProps: {
          htmlInput: { "aria-label": "Academic year" },
        },
      },
    },
    holiday_name: {
      name: "holiday_name",
      label: "Holiday Name",
      type: "text",
      required: true,
      placeholder: "e.g. Independence Day",
      props: {
        size: "small",
        slotProps: { htmlInput: { "aria-label": "Holiday name", minLength: 0 } },
      },
    },
    holiday_type: {
      name: "holiday_type",
      label: "Holiday Type",
      type: "select",
      required: true,
      props: {
        options: HOLIDAY_TYPE_OPTIONS.map((o) => ({
          id: `holiday-type-${o.value}`,
          value: o.value,
          label: o.label,
        })),
        size: "small",
        slotProps: {
          htmlInput: { "aria-label": "Holiday type" },
        },
      },
    },
    // Label only — rendered via associatedClassesSlot; needed for ValidationErrorDialog.
    class_ids: {
      name: "class_ids",
      label: "Associated Classes",
      type: "custom",
      required: false,
    },
    start_date: {
      name: "start_date",
      label: "Start Date",
      type: "date",
      required: true,
      props: {
        size: "small",
        slotProps: { htmlInput: { "aria-label": "Start date" } },
      },
    },
    end_date: {
      name: "end_date",
      label: "End Date",
      type: "date",
      required: false,
      props: {
        size: "small",
        slotProps: { htmlInput: { "aria-label": "End date" } },
      },
    },
    description: {
      name: "description",
      label: "Description",
      type: "text",
      required: false,
      props: {
        multiline: true,
        minRows: 4,
        size: "small",
        slotProps: { htmlInput: { "aria-label": "Description", minLength: 0 } },
      },
    },
  };

  const academicYearField = fields.academic_year_id!;
  const holidayNameField = fields.holiday_name!;

  return {
    fields,
    layoutRows: [
      { kind: "section", title: "Holiday details" },
      {
        kind: "custom",
        grid: { xs: 12 },
        render: (ctx) => (
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FormFieldRenderer<HolidayFormData> field={academicYearField} ctx={ctx} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FormFieldRenderer<HolidayFormData> field={holidayNameField} ctx={ctx} />
            </Box>
          </Box>
        ),
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["holiday_type"],
      },
      {
        kind: "custom",
        grid: { xs: 12 },
        render: () => <Box sx={{ mt: 0.5 }}>{associatedClassesSlot}</Box>,
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["start_date"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["end_date"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["description"],
      },
    ],
  };
}
