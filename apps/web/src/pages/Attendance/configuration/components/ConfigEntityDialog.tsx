import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Box,
  IconButton,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";

import { SaveButton, CancelButton } from "../../../../components/semantic";
import type { EntityStatus } from "../attendanceConfiguration.types";
import { colorTokens } from "../../../../tokens/colors";

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
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      <Box
        sx={(theme) => ({
          background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        })}
      >
        <DialogTitle sx={{ fontWeight: 700, p: 0, color: "white", m: 0 }}>
          {title}
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: "white", bgcolor: "transparent", borderRadius: 2 }}
        >
          <CancelIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </Box>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ py: 2 }}>
          {fields.map((field) => {
            if (field.type === "select") {
              return (
                <Box key={field.name}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={field.label}
                    value={String(values[field.name] ?? "")}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    required={field.required}
                    inputProps={{ "data-testid": field.testId }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: "0.95rem",
                      },
                    }}
                  >
                    {(field.options ?? []).map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              );
            }

            if (field.type === "date") {
              return (
                <Box key={field.name}>
                  <TextField
                    fullWidth
                    size="small"
                    label={field.label}
                    type="date"
                    value={values[field.name] ?? ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    required={field.required}
                    inputProps={{ "data-testid": field.testId }}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: "0.95rem",
                      },
                      "& input[type='date']": {
                        fontSize: "0.95rem",
                        paddingTop: "10px",
                        paddingBottom: "10px",
                      },
                    }}
                  />
                </Box>
              );
            }

            return (
              <Box key={field.name}>
                <TextField
                  fullWidth
                  size="small"
                  label={field.label}
                  type={field.type === "number" ? "number" : field.type === "color" ? "color" : "text"}
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
                  multiline={field.type === "text" && field.name === "description"}
                  rows={field.name === "description" ? 3 : undefined}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontSize: "0.95rem",
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
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
