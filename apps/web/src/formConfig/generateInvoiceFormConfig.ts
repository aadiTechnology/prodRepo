import type { FormConfig } from "../components/reusable/formFramework.types";
import type { SelectItemOption } from "../components/semantic";
import type { ReactNode } from "react";

export type GenerateInvoiceFormData = {
  academic_year_id: number | null;
  class_id: number | null;
  division_id: number | null;
  fee_structure_id: number | null;
  installment_name: string;
  payable_amount: number | null;
  invoice_date: string;
  due_date: string;
  invoice_no: string;
};

type GenerateInvoiceFormConfigArgs = {
  academicYearOptions: SelectItemOption[];
  classOptions: SelectItemOption[];
  divisionOptions: SelectItemOption[];
  feeStructureOptions: SelectItemOption[];
  installmentOptions: SelectItemOption[];
  academicYearsLoading: boolean;
  classesLoading: boolean;
  divisionsLoading: boolean;
  feeStructuresLoading: boolean;
  disableClass: boolean;
  disableDivision: boolean;
  disableFeeStructure: boolean;
  disableInstallment: boolean;
  disableDates: boolean;
  disablePayableAmount: boolean;
  studentSelectionSlot?: ReactNode;
};

export function generateInvoiceFormConfig({
  academicYearOptions,
  classOptions,
  divisionOptions,
  feeStructureOptions,
  installmentOptions,
  academicYearsLoading,
  classesLoading,
  divisionsLoading,
  feeStructuresLoading,
  disableClass,
  disableDivision,
  disableFeeStructure,
  disableInstallment,
  disableDates,
  disablePayableAmount,
  studentSelectionSlot,
}: GenerateInvoiceFormConfigArgs): FormConfig<GenerateInvoiceFormData> {
  const fields: FormConfig<GenerateInvoiceFormData>["fields"] = {
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
          "data-testid": "input-academic-year-id",
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
          "data-testid": "input-class-id",
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
          "data-testid": "input-division-id",
        },
      },
      fee_structure_id: {
        name: "fee_structure_id",
        label: "Fee Structure",
        type: "select",
        required: true,
        props: {
          options: feeStructureOptions,
          loading: feeStructuresLoading,
          emptyOptionLabel: "Select Fee Structure",
          disabled: disableFeeStructure,
          coerceToNumber: true,
          "data-testid": "input-fee-structure-id",
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
          "data-testid": "input-installment-name",
        },
      },
      payable_amount: {
        name: "payable_amount",
        label: "Base Amount (₹)",
        type: "text",
        required: false,
        helperText: "Individual student discounts will be applied automatically during generation.",
        props: {
          disabled: disablePayableAmount,
          readOnly: true,
          htmlInput: { "data-testid": "input-payable-amount" },
          sx: {
            "& .MuiOutlinedInput-root.Mui-disabled .MuiInputBase-input.Mui-disabled": {
              WebkitTextFillColor: "rgba(0, 0, 0, 0.87) !important",
              color: "rgba(0, 0, 0, 0.87) !important",
              opacity: "1 !important",
            },
            "& .MuiInputLabel-root.Mui-disabled": {
              color: "rgba(0, 0, 0, 0.87) !important",
            },
          },
        },
      },
      invoice_date: {
        name: "invoice_date",
        label: "Invoice Date",
        type: "date",
        required: true,
        props: {
          disabled: disableDates,
          htmlInput: { "data-testid": "input-invoice-date" },
        },
      },
      due_date: {
        name: "due_date",
        label: "Due Date",
        type: "date",
        required: true,
        props: {
          disabled: disableDates,
          htmlInput: { "data-testid": "input-due-date" },
        },
      },
  };

  const layoutRows: FormConfig<GenerateInvoiceFormData>["layoutRows"] = [
    { kind: "section", title: "Academic Form", grid: { xs: 12 } },
    { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["academic_year_id"] },
    { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["class_id"] },
    { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["division_id"] },
    { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["fee_structure_id"] },
    { kind: "section", title: "Installment Time", grid: { xs: 12 } },
    { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["installment_name"] },
    { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["payable_amount"] },
    { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["invoice_date"] },
    { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["due_date"] },
  ];

  layoutRows.push(
    { kind: "section", title: "Student Selection", grid: { xs: 12 } },
    {
      kind: "custom",
      grid: { xs: 12 },
      render: () => studentSelectionSlot ?? null,
    }
  );

  return { fields, layoutRows };
}
