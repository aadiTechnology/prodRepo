/**
 * PasswordInput — Semantic component
 * Password field with optional show/hide toggle. fullWidth, variant, label, placeholder, name included.
 */

import { useEffect, useState } from "react";
import { TextField, IconButton, InputAdornment, type TextFieldProps } from "../primitives";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export interface PasswordInputProps extends Omit<TextFieldProps, "type"> {
  label?: string;
  showToggle?: boolean;
  /** Blocks browser login autofill (readonly until focus). */
  preventAutofill?: boolean;
  /** Props passed to the underlying HTML input (e.g. minLength). */
  htmlInput?: React.InputHTMLAttributes<HTMLInputElement>;
}

export default function PasswordInput({
  label,
  placeholder = "Enter password",
  name = "password",
  fullWidth = true,
  variant = "outlined",
  showToggle = true,
  preventAutofill = false,
  autoComplete,
  htmlInput,
  slotProps,
  onFocus,
  InputProps: inputPropsFromParent,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [readOnly, setReadOnly] = useState(preventAutofill);
  const type = showPassword ? "text" : "password";

  useEffect(() => {
    if (preventAutofill) setReadOnly(true);
  }, [preventAutofill]);

  const resolvedAutoComplete =
    autoComplete ?? (preventAutofill ? "new-password" : "current-password");

  const toggleAdornment = showToggle ? (
    <InputAdornment position="end">
      <IconButton
        aria-label={showPassword ? "Hide password" : "Show password"}
        onClick={() => setShowPassword((v) => !v)}
        onMouseDown={(e) => e.preventDefault()}
        edge="end"
      >
        {showPassword ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </InputAdornment>
  ) : undefined;

  return (
    <TextField
      type={type}
      label={label}
      placeholder={placeholder}
      name={name}
      fullWidth={fullWidth}
      variant={variant}
      autoComplete={resolvedAutoComplete}
      slotProps={{
        ...slotProps,
        htmlInput: {
          ...htmlInput,
          ...(preventAutofill
            ? { readOnly, autoComplete: "new-password" }
            : {}),
          ...slotProps?.htmlInput,
        },
      }}
      onFocus={(e) => {
        if (preventAutofill) setReadOnly(false);
        onFocus?.(e);
      }}
      InputProps={{
        ...inputPropsFromParent,
        endAdornment: toggleAdornment ?? inputPropsFromParent?.endAdornment,
      }}
      {...props}
    />
  );
}