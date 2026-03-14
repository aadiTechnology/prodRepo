/**
 * TextField — UI Primitive
 * Single point of access to MUI TextField. Border radius from token-based theme
 * (getComponentsFromTokens: MuiTextField). Only adds hover/focus/disabled styles
 * not in theme overrides.
 */

import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps, Box } from "@mui/material";

export type TextFieldProps = MuiTextFieldProps & { required?: boolean };

export default function TextField({ sx, label, required, ...props }: TextFieldProps) {
  const displayLabel = label && required && typeof label === "string" ? (
    <span>
      {label}
      <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>*</Box>
    </span>
  ) : label;

  return (
    <MuiTextField
      variant="outlined"
      label={displayLabel}
      InputProps={{
        ...props.InputProps,
        // Pass the string label to the internal OutlinedInput for correct notch calculation
        ...(typeof label === "string" ? { label } : {}),
      }}
      sx={[
        (theme) => ({
          "& .MuiOutlinedInput-root": {
            "&:hover fieldset": { borderColor: theme.palette.grey[400] },
            "&.Mui-focused fieldset": { borderColor: theme.palette.primary.main },
            "&.Mui-disabled .MuiInputBase-input.Mui-disabled": {
              WebkitTextFillColor: theme.palette.grey[600],
              bgcolor: theme.palette.background.paper ,
            },
          },
          "& .MuiFormLabel-asterisk": {
            color: theme.palette.error.main,
          },
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    />
  );
}
