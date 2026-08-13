import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Box,
  IconButton,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import React from "react";

import { SaveButton, CancelButton } from "../../../../components/semantic";
import type { EntityStatus } from "../attendanceConfiguration.types";
import { colorTokens } from "../../../../tokens/colors";
import { FC } from "react";

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

const ConfigEntityDialog: FC<ConfigEntityDialogProps> = ({
  open,
  title,
  values,
  fields,
  onClose,
  onChange,
  onSave,
  saveLabel = "Save",
  "data-testid": dataTestId,
}) => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setErrors({});
    }
  }, [open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.required && !values[field.name]) {
        if (field.name === "name") newErrors[field.name] = "Please enter name";
        if (field.name === "date") newErrors[field.name] = "Please fill date";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    onChange(name, value);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSave = () => {
    if (validateForm()) onSave();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      data-testid={dataTestId}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          px: 2,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          flexShrink: 0,
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: "white", bgcolor: "transparent", p: 0.3 }}
        >
          <CancelIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <DialogContent
        dividers={false}
        sx={{
          flex: 1,
          py: 1.5,
          px: 2,
          overflowY: "auto",
          overflowX: "hidden",
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
          "&::-webkit-scrollbar-thumb": {
            background: "#c1c1c1",
            borderRadius: "2px",
          },
        }}
      >
        <Stack spacing={1.3}>
          <Box sx={{ fontWeight: 700, color: "#000", fontSize: "0.95rem" }}>
            {title}
          </Box>

          {fields.map((field) => {
            const label = field.label;
            const hasError = !!errors[field.name];

            if (field.type === "select") {
              return (
                <TextField
                  key={field.name}
                  select
                  fullWidth
                  size="small"
                  label={label}
                  value={String(values[field.name] ?? "")}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  error={hasError}
                  helperText={errors[field.name] || " "}
                  slotProps={{ htmlInput: { "data-testid": field.testId } }}
                  sx={{
                    "& .MuiOutlinedInput-root": { fontSize: "0.85rem" },
                    "& .MuiFormLabel-root": { fontSize: "0.85rem" },
                    "& .MuiFormLabel-asterisk": { color: "#d32f2f" },
                  }}
                >
                  {(field.options ?? []).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }

            if (field.type === "date") {
              return (
                <TextField
                  key={field.name}
                  fullWidth
                  size="small"
                  label={label}
                  type="date"
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  error={hasError}
                  helperText={errors[field.name] || " "}
                  slotProps={{
                    htmlInput: { "data-testid": field.testId },
                    inputLabel: { shrink: true },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": { fontSize: "0.85rem" },
                    "& .MuiFormLabel-root": { fontSize: "0.85rem" },
                    "& .MuiFormLabel-asterisk": { color: "#d32f2f" },
                  }}
                />
              );
            }

            return (
              <TextField
                key={field.name}
                fullWidth
                size="small"
                label={label}
                type={
                  field.type === "number"
                    ? "number"
                    : field.type === "color"
                      ? "color"
                      : "text"
                }
                value={values[field.name] ?? ""}
                onChange={(e) =>
                  handleChange(
                    field.name,
                    field.type === "number" ? Number(e.target.value) : e.target.value
                  )
                }
                required={field.required}
                error={hasError}
                helperText={errors[field.name] || " "}
                slotProps={{
                  htmlInput: { "data-testid": field.testId },
                  inputLabel: field.type === "color" ? { shrink: true } : undefined,
                }}
                multiline={field.type === "text" && field.name === "description"}
                rows={field.name === "description" ? 2 : undefined}
                sx={{
                  "& .MuiOutlinedInput-root": { fontSize: "0.85rem" },
                  "& .MuiFormLabel-root": { fontSize: "0.85rem" },
                  "& .MuiFormLabel-asterisk": { color: "#d32f2f" },
                }}
              />
            );
          })}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1, gap: 1, flexShrink: 0 }}>
        <CancelButton onClick={onClose} data-testid="btn-dialog-cancel">
          Cancel
        </CancelButton>
        <SaveButton onClick={handleSave} data-testid="btn-dialog-save">
          {saveLabel}
        </SaveButton>
      </DialogActions>
    </Dialog>
  );
};

export default ConfigEntityDialog;
