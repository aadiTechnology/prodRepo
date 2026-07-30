import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
} from "@mui/material";

import { SaveButton, CancelButton } from "../../../../components/semantic";
import type { EntityStatus } from "../attendanceConfiguration.types";

export type ConfigEntityDialogField = {
  name: string;
  label: string;
  type: "text" | "date" | "time" | "number" | "color" | "select";
  testId: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};

export interface ConfigEntityDialogProps {
  open: boolean;
  title: string;
  values: Record<string, string | number | boolean>;
  fields: ConfigEntityDialogField[];
  onClose: () => void;
  onChange: (name: string, value: string | number | boolean) => void;
  onSave: () => void;
  saveLabel?: string;
  "data-testid"?: string;
}

const STATUS_OPTIONS: { value: EntityStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function statusField(testId: string): ConfigEntityDialogField {
  return {
    name: "status",
    label: "Status",
    type: "select",
    testId,
    options: STATUS_OPTIONS,
    required: true,
  };
}

export default function ConfigEntityDialog({
  open,
  title,
  values,
  fields,
  onClose,
  onChange,
  onSave,
  saveLabel = "Save",
  "data-testid": dataTestId,
}: ConfigEntityDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid={dataTestId}
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {fields.map((field) => {
            if (field.type === "select") {
              return (
                <TextField
                  key={field.name}
                  select
                  fullWidth
                  size="small"
                  label={field.label}
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  required={field.required}
                  inputProps={{ "data-testid": field.testId }}
                >
                  {(field.options ?? []).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }

            return (
              <TextField
                key={field.name}
                fullWidth
                size="small"
                label={field.label}
                type={field.type === "number" ? "number" : field.type === "color" ? "color" : field.type}
                value={values[field.name] ?? ""}
                onChange={(e) =>
                  onChange(
                    field.name,
                    field.type === "number" ? Number(e.target.value) : e.target.value
                  )
                }
                required={field.required}
                inputProps={{ "data-testid": field.testId }}
                InputLabelProps={field.type === "color" ? { shrink: true } : undefined}
              />
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <CancelButton onClick={onClose} data-testid="btn-dialog-cancel">
          Cancel
        </CancelButton>
        <SaveButton onClick={onSave} data-testid="btn-dialog-save">
          {saveLabel}
        </SaveButton>
      </DialogActions>
    </Dialog>
  );
}
