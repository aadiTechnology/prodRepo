import { type FormConfig } from "../components/reusable/formFramework.types";

export type AddFeeDiscountFormData = {
  discountName: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountAmount: number | "";
  feeCategory: string;
  applicableClass: string;
  description: string;
  is_active: boolean;
};

type AddFeeDiscountFormConfigArgs = {
  isEditMode: boolean;
  feeCategoryOptions: string[];
  classOptions: string[];
};

export function createAddFeeDiscountFormConfig({
  isEditMode,
  feeCategoryOptions,
  classOptions,
}: AddFeeDiscountFormConfigArgs): FormConfig<AddFeeDiscountFormData> {
  return {
    fields: {
      discountName: {
        name: "discountName",
        label: "Discount Name",
        type: "text",
        placeholder: "Enter discount name",
        required: true,
        props: {
          htmlInput: { minLength: 2 },
        },
      },
      discountType: {
        name: "discountType",
        label: "Discount Type",
        type: "select",
        required: true,
        props: {
          options: [
            { id: "PERCENTAGE", label: "Percentage", value: "PERCENTAGE" },
            { id: "FIXED", label: "Fixed", value: "FIXED" },
          ],
          disableWhenEmpty: false,
        },
      },
      discountAmount: {
        name: "discountAmount",
        label: "Discount Amount",
        type: "text",
        placeholder: "Enter amount or %",
        required: true,
        props: {
          type: "number",
          htmlInput: { min: 0 },
        },
      },
      feeCategory: {
        name: "feeCategory",
        label: "Fee Category",
        type: "select",
        required: false,
        props: {
          options: [
            { id: "", label: "", value: "" },
            ...feeCategoryOptions.map((v: string) => ({
              id: v,
              label: v,
              value: v,
            })),
          ],
          disableWhenEmpty: false,
        },
      },
      applicableClass: {
        name: "applicableClass",
        label: "Applicable Class",
        type: "select",
        required: false,
        props: {
          options: [
            { id: "", label: "", value: "" },
            ...classOptions.map((v: string) => ({
              id: v,
              label: v,
              value: v,
            })),
          ],
          disableWhenEmpty: false,
        },
      },
      description: {
        name: "description",
        label: "Description",
        type: "text",
        placeholder: "Enter description",
        required: false,
        props: {
          multiline: true,
          rows: 3,
        },
      },
      is_active: {
        name: "is_active",
        label: "Discount Active",
        helperText: "Control system access for this discount",
        type: "switch",
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["discountName", "discountType"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["discountAmount", "feeCategory"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["applicableClass"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["description"],
      },
      ...(
        isEditMode
          ? [
              {
                kind: "fields" as const,
                grid: { xs: 12 },
                fieldNames: ["is_active" as keyof AddFeeDiscountFormData],
              },
            ]
          : []
      ),
    ],
  };
}
