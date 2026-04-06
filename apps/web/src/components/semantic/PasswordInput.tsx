/**
 * PasswordInput — Semantic component
 * Password field with optional show/hide toggle. fullWidth, variant, label, placeholder, name included.
 */

import { useState } from "react";
import { TextField, IconButton, InputAdornment, type TextFieldProps } from "../primitives";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export interface PasswordInputProps extends Omit<TextFieldProps, "type"> {
  label?: string;
  showToggle?: boolean;
}

export default function PasswordInput({
  label,
  placeholder = "Enter password",
  name = "password",
  fullWidth = true,
  variant = "outlined",
  showToggle = true,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const type = showPassword ? "text" : "password";

  return (
    <TextField
      type={type}
      label={label}
      placeholder={placeholder}
      name={name}
      fullWidth={fullWidth}
      variant={variant}
      autoComplete="current-password"
      InputProps={
        showToggle
          ? {
              endAdornment: (
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
              ),
            }
          : undefined
      }
      {...props}
    />
  );
}