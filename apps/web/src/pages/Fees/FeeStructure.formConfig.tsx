import React from "react";
import { type FormConfig, type FormRenderContext } from "../../components/reusable/formFramework.types";
import { DataTable } from "../../components/reusable";
import { Box, Typography } from "@mui/material";
import { type ClassEntity } from "../../types/fee";

export interface FeeStructureFormData extends Record<string, unknown> {
  academic_year_id: number | "";
  class_id: number | "";
  fee_category_id: string;
  total_amount: number | "";
  installment_type: "MONTHLY" | "QUARTERLY" | "YEARLY";
  num_installments: number;
  description: string;
  is_active: boolean;
}

export interface FeeInstallmentPreview {
  installment_number: number;
  amount: number;
  due_date: string;
}

export function createFeeStructureFormConfig({
  isEditMode,
  academicYears,
  classes,
  installments,
}: {
  isEditMode: boolean;
  academicYears: { id: number; name: string }[];
  classes: ClassEntity[];
  installments: FeeInstallmentPreview[];
}): FormConfig<FeeStructureFormData> {
  return {
    fields: {
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
          // Deduplicate by name — each class shown once regardless of how many sections exist
          options: classes
            .filter((c, idx, arr) => arr.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase()) === idx)
            .map((c) => ({ value: c.id, label: c.name })),
          disabled: classes.length === 0,
        },
      },
      fee_category_id: {
        name: "fee_category_id",
        label: "Fee Category",
        type: "select",
        required: true,
        // Options will be populated in the component
      },
      total_amount: {
        name: "total_amount",
        label: "Total Amount",
        type: "text", // Use text with number input props for better control
        required: true,
        props: { type: "number" },
      },
      installment_type: {
        name: "installment_type",
        label: "Installment Type",
        type: "select",
        props: {
          options: [
            { value: "MONTHLY", label: "Monthly" },
            { value: "QUARTERLY", label: "Quarterly" },
            { value: "YEARLY", label: "Yearly/One-time" },
          ],
        },
      },
      num_installments: {
        name: "num_installments",
        label: "No. of Installments",
        type: "text",
        props: { type: "number" },
      },
      description: {
        name: "description",
        label: "Description",
        type: "text",
        props: { multiline: true, rows: 2 },
      },
      is_active: {
        name: "is_active",
        label: "Structure Active",
        type: "switch",
        helperText: "Control if this fee is currently being charged",
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: [
          "academic_year_id",
          "class_id",
          "fee_category_id",
          ...(isEditMode ? ["is_active"] : []),
          "description",
        ],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["total_amount", "installment_type", "num_installments"],
      },
      {
        kind: "custom",
        grid: { xs: 12 },
        render: (ctx: FormRenderContext<FeeStructureFormData>) => (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              Installment Schedule Preview
            </Typography>
            {installments.length > 0 ? (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.25, overflow: "hidden" }}>
                <DataTable
                  columns={[
                    { id: "num", label: "#", render: (row: any) => row.installment_number },
                    { id: "amt", label: "Amount", render: (row: any) => `₹${Number(row.amount).toLocaleString()}` },
                    { id: "date", label: "Due Date", render: (row: any) => row.due_date },
                  ]}
                  data={installments}
                />
              </Box>
            ) : (
              <Box sx={{ p: 2, textAlign: "center", bgcolor: "grey.50", borderRadius: 1, border: "1px dashed", borderColor: "grey.300" }}>
                <Typography variant="body2" color="textSecondary">
                  Enter amount and installments to see preview
                </Typography>
              </Box>
            )}
          </Box>
        ),
      },
    ],
  };
}
