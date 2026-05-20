import React from "react";
import { type FormConfig, type FormRenderContext } from "../../components/reusable/formFramework.types";
import { DataTable } from "../../components/reusable";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormControl,
  InputLabel,
  FormHelperText,
  TextField,
} from "@mui/material";
import { type ClassEntity, type FeeCategory } from "../../types/fee";

export interface FeeStructureFormData extends Record<string, unknown> {
  name: string;
  academic_year_id: number | "";
  class_id: number | "";
  class_division_id: number | "";
  fee_category_ids: string[];   // multi-select: array of category ids
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

export const INSTALLMENT_COUNT_BY_TYPE: Record<
  FeeStructureFormData["installment_type"],
  number
> = {
  MONTHLY: 12,
  QUARTERLY: 4,
  YEARLY: 1,
};

export function installmentCountForType(
  type: FeeStructureFormData["installment_type"]
): number {
  return INSTALLMENT_COUNT_BY_TYPE[type] ?? 1;
}

export function installmentCountHelperText(
  type: FeeStructureFormData["installment_type"]
): string {
  const count = installmentCountForType(type);
  switch (type) {
    case "MONTHLY":
      return `${count} installments — one per month for the academic year`;
    case "QUARTERLY":
      return `${count} installments — one per quarter for the academic year`;
    case "YEARLY":
      return `${count} installment — yearly / one-time payment`;
    default:
      return `${count} installment(s)`;
  }
}

export function createFeeStructureFormConfig({
  isEditMode,
  academicYears,
  classes,
  installments,
  categories,
  divisions,
  installmentType,
  onInstallmentUpdate,
}: {
  isEditMode: boolean;
  academicYears: { id: number; name: string }[];
  classes: ClassEntity[];
  installments: FeeInstallmentPreview[];
  categories: FeeCategory[];
  divisions: { id: number; division_name: string }[];
  installmentType: FeeStructureFormData["installment_type"];
  onInstallmentUpdate: (index: number, field: keyof FeeInstallmentPreview, value: any) => void;
}): FormConfig<FeeStructureFormData> {
  const installmentCount = installmentCountForType(installmentType);
  return {
    fields: {
      name: {
        name: "name",
        label: "Fee Structure Name",
        type: "text",
        required: true,
        placeholder: "e.g. Annual Tuition Fee, Quarter 1 Fees",
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
          options: classes
            .map((c) => ({ value: c.id, label: c.name })),
          disabled: classes.length === 0,
        },
      },
      class_division_id: {
        name: "class_division_id",
        label: "Division (Optional)",
        type: "custom",
        render: (ctx: FormRenderContext<FeeStructureFormData>) => {
          const selectedValue = ctx.formData.class_division_id;
          const allDivisionsText = divisions.length > 0 ? divisions.map(d => d.division_name).join(", ") : "";
          
          return (
            <FormControl fullWidth>
              <InputLabel
                shrink
                sx={{
                  fontSize: "0.85rem",
                  color: "primary.main",
                }}
              >
                Division (Optional)
              </InputLabel>
              <Select
                value={selectedValue || ""}
                onChange={(e) => {
                  ctx.handleFieldValueChange("class_division_id", e.target.value || "");
                }}
                input={<OutlinedInput notched label="Division (Optional)" />}
                displayEmpty
                renderValue={(value) => {
                  if (!value || String(value) === "") {
                    return (
                      <Typography variant="body2" sx={{ color: allDivisionsText ? "text.primary" : "text.disabled" }}>
                        {allDivisionsText || "All Divisions"}
                      </Typography>
                    );
                  }
                  const selectedDiv = divisions.find(d => String(d.id) === String(value));
                  return <Typography variant="body2">{selectedDiv?.division_name || value}</Typography>;
                }}
              >
                <MenuItem value="">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>All Divisions</Typography>
                </MenuItem>
                {divisions.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    <Typography variant="body2">{d.division_name}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        },
      },
      fee_category_ids: {
        name: "fee_category_ids",
        label: "Fee Category",
        type: "custom",
        required: true,
        render: (ctx: FormRenderContext<FeeStructureFormData>) => {
          const selected = (ctx.formData.fee_category_ids as string[]) ?? [];
          const error = ctx.fieldErrors["fee_category_ids"];
          return (
            <FormControl fullWidth error={Boolean(error)} required>
              <InputLabel
                shrink={selected.length > 0}
                sx={{
                  fontSize: "0.85rem",
                  color: error ? "error.main" : "primary.main",
                }}
              >
                Fee Category
              </InputLabel>
              <Select
                multiple
                value={selected}
                onChange={(e) => {
                  const val = e.target.value as string[];
                  ctx.handleFieldValueChange("fee_category_ids", val);
                }}
                input={
                  <OutlinedInput
                    notched={selected.length > 0}
                    label="Fee Category"
                  />
                }
                renderValue={(chosen) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(chosen as string[]).map((id) => {
                      const cat = categories.find((c) => String(c.id) === String(id));
                      return (
                        <Chip
                          key={id}
                          label={cat ? cat.name : id}
                          size="small"
                          sx={{ borderRadius: 1, fontWeight: 600, fontSize: "0.75rem" }}
                        />
                      );
                    })}
                  </Box>
                )}
                MenuProps={{ PaperProps: { sx: { maxHeight: 260 } } }}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline legend": {
                    fontSize: "0.75rem",
                  },
                }}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={String(cat.id)}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <Typography variant="body2">{cat.name}</Typography>
                      {cat.amount !== undefined && (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                          ₹{Number(cat.amount).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {error && <FormHelperText>{error}</FormHelperText>}
              {selected.length > 0 && (
                <FormHelperText sx={{ color: "text.secondary" }}>
                  {selected.length} categor{selected.length === 1 ? "y" : "ies"} selected
                </FormHelperText>
              )}
            </FormControl>
          );
        },
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
        props: {
          type: "number",
          disabled: true,
          InputProps: { readOnly: true },
        },
        helperText: installmentCountHelperText(installmentType),
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
        kind: "section",
        title: "Academic Context",
        grid: { xs: 12 },
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["academic_year_id", "class_id", "fee_category_ids"],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["name", "class_division_id", ...(isEditMode ? ["is_active"] : [])],
      },
      {
        kind: "section",
        title: "Installment Setup",
        grid: { xs: 12 },
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: [
          "total_amount",
          "installment_type",
        ],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: [
          "num_installments",
          "description",
        ],
      },
      {
        kind: "custom",
        grid: { xs: 12 },
        render: (ctx: FormRenderContext<FeeStructureFormData>) => (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
              Installment Schedule Preview ({installmentCount} installment
              {installmentCount === 1 ? "" : "s"} — {installmentType.toLowerCase()})
            </Typography>
            {installments.length > 0 ? (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.25, overflow: "hidden" }}>
                <DataTable
                  columns={[
                    { 
                      id: "num", 
                      label: "Installment", 
                      align: "left",
                      width: "35%",
                      render: (row: any) => (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          Installment {row.installment_number}
                        </Typography>
                      )
                    },
                    { 
                      id: "amt", 
                      label: "Amount", 
                      align: "right",
                      width: "30%",
                      render: (row: any) => (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                          ₹{Number(row.amount).toLocaleString()}
                        </Typography>
                      )
                    },
                    { 
                      id: "date", 
                      label: "Due Date", 
                      align: "center",
                      width: "35%",
                      render: (row: any, idx: number) => (
                        <TextField
                          type="date"
                          size="small"
                          value={row.due_date}
                          onChange={(e) => onInstallmentUpdate(idx, 'due_date', e.target.value)}
                          variant="standard"
                          InputProps={{ 
                            disableUnderline: false,
                            sx: { 
                              fontSize: '0.875rem',
                              "& input": { textAlign: "center" }
                            } 
                          }}
                          sx={{ width: "160px" }}
                        />
                      ) 
                    },
                  ]}
                  data={installments}
                />
              </Box>
            ) : (
              <Box sx={{ p: 2, textAlign: "center", bgcolor: "grey.50", borderRadius: 1, border: "1px dashed", borderColor: "grey.300" }}>
                <Typography variant="body2" color="textSecondary">
                  Enter total amount to preview {installmentCount}{" "}
                  {installmentType.toLowerCase()} installment
                  {installmentCount === 1 ? "" : "s"}
                </Typography>
              </Box>
            )}
          </Box>
        ),
      },
    ],
  };
}
