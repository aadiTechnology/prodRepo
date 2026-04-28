import type { FormConfig } from "../components/reusable/formFramework.types";
import type { SelectItemOption } from "../components/semantic";
import type { ReactNode } from "react";

export type GenerateInvoiceFormData = {
  academic_year_id: number | null;
  class_id: number | null;
  division_id: number | null;
  installment_name: string;
  invoice_date: string;
  due_date: string;
};

type GenerateInvoiceFormConfigArgs = {
  academicYearOptions: SelectItemOption[];
  classOptions: SelectItemOption[];
  divisionOptions: SelectItemOption[];
  installmentOptions: SelectItemOption[];
  academicYearsLoading: boolean;
  classesLoading: boolean;
  divisionsLoading: boolean;
  disableClass: boolean;
  disableDivision: boolean;
  disableInstallment: boolean;
  disableDates: boolean;
  studentSelectionSlot?: ReactNode;
};

export function generateInvoiceFormConfig({
  academicYearOptions,
  classOptions,
  divisionOptions,
  installmentOptions,
  academicYearsLoading,
  classesLoading,
  divisionsLoading,
  disableClass,
  disableDivision,
  disableInstallment,
  disableDates,
  studentSelectionSlot,
}: GenerateInvoiceFormConfigArgs): FormConfig<GenerateInvoiceFormData> {
  return {
    fields: {
      academic_year_id: {
        name: "academic_year_id",
        label: "Academic Year",
        type: "select",
        required: true,
        props: {
          options: academicYearOptions,
          loading: academicYearsLoading,
          emptyOptionLabel: "Select Academic Year",
          disabled: academicYearsLoading,
          coerceToNumber: true,
        },
      },
      class_id: {
        name: "class_id",
        label: "Class",
        type: "select",
        required: true,
        props: {
          options: classOptions,
          loading: classesLoading,
          emptyOptionLabel: "Select Class",
          disabled: disableClass,
          coerceToNumber: true,
        },
      },
      division_id: {
        name: "division_id",
        label: "Division",
        type: "select",
        required: true,
        props: {
          options: divisionOptions,
          loading: divisionsLoading,
          emptyOptionLabel: "Select Division",
          disabled: disableDivision,
          coerceToNumber: true,
        },
      },
      installment_name: {
        name: "installment_name",
        label: "Installment",
        type: "select",
        required: true,
        props: {
          options: installmentOptions,
          emptyOptionLabel: "Select Installment",
          disabled: disableInstallment,
        },
      },
      invoice_date: {
        name: "invoice_date",
        label: "Invoice Date",
        type: "date",
        required: true,
        props: {
          disabled: disableDates,
        },
      },
      due_date: {
        name: "due_date",
        label: "Due Date",
        type: "date",
        required: true,
        props: {
          disabled: disableDates,
        },
      },
    },
    layoutRows: [
      { kind: "section", title: "Academic Form", grid: { xs: 12 } },
      { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["academic_year_id"] },
      { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["class_id"] },
      { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["division_id"] },
      { kind: "section", title: "Installment Time", grid: { xs: 12 } },
      { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["installment_name"] },
      { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["invoice_date"] },
      { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["due_date"] },
      { kind: "section", title: "Student Selection", grid: { xs: 12 } },
      {
        kind: "custom",
        grid: { xs: 12 },
        render: () => studentSelectionSlot ?? null,
      },
    ],
  };
}
