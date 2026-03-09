/**
 * TextField — UI Primitive
 * Single point of access to MUI TextField. Border radius from token-based theme
 * (getComponentsFromTokens: MuiTextField). Only adds hover/focus/disabled styles
 * not in theme overrides.
 */

import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps } from "@mui/material";

export type TextFieldProps = MuiTextFieldProps;

export default function TextField({ sx, ...props }: TextFieldProps) {
  return (
    <MuiTextField
      variant="outlined"
      sx={[
        (theme) => ({
          "& .MuiOutlinedInput-root": {
            "&:hover fieldset": { borderColor: theme.palette.grey[400] },
            "&.Mui-focused fieldset": { borderColor: theme.palette.primary.main },
            "&.Mui-disabled .MuiInputBase-input.Mui-disabled": {
              WebkitTextFillColor: theme.palette.grey[600],
            },
          },
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    />
  );
}
