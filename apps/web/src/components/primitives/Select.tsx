/**
 * Select — UI Primitive
 * Single point of access to MUI Select (as FormControl + Select). Theme-driven.
 * Use for dropdowns; styling aligned with TextField (borderRadius, hover/focus).
 */

import {
  FormControl,
  FormControlProps,
  InputLabel,
  Select as MuiSelect,
  SelectProps as MuiSelectProps,
  FormHelperText,
  Box,
} from "@mui/material";

export interface SelectProps extends Omit<MuiSelectProps, "label"> {
  label?: string; // Change back to string for notch reliability
  required?: boolean;
  helperText?: React.ReactNode;
  error?: boolean;
  formControlProps?: Partial<FormControlProps>;
}

export default function Select({
  label,
  required,
  helperText,
  error = false,
  formControlProps,
  sx,
  labelId,
  id,
  ...props
}: SelectProps) {
  const resolvedId = id ?? labelId ?? (label ? `select-${label.replace(/\s/g, "-")}` : undefined);
  
  const displayLabel = label && required ? (
    <span>
      {label}
      <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>*</Box>
    </span>
  ) : label;

  return (
    <FormControl variant="outlined" fullWidth error={error} {...formControlProps}>
      {label != null && <InputLabel id={resolvedId}>{displayLabel}</InputLabel>}
      <MuiSelect
        label={label} // String label for perfect notch
        labelId={resolvedId}
        id={resolvedId}
        sx={[
          (theme) => ({
            "& .MuiOutlinedInput-notchedOutline": {
              "&:hover": { borderColor: theme.palette.grey[400] },
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.main,
            },
          }),
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
        {...props}
      />
      {helperText != null && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
