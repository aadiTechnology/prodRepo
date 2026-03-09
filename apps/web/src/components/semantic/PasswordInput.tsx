/**
 * PasswordInput — Semantic component
 * Password field with optional show/hide toggle. Uses TextField primitive.
 */

import { useState } from "react";
import { TextField, IconButton, InputAdornment, type TextFieldProps } from "../primitives";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export interface PasswordInputProps extends Omit<TextFieldProps, "type"> {
  label?: string;
  /** Show visibility toggle. Default true. */
  showToggle?: boolean;
}

export default function PasswordInput({
  label = "Password",
  showToggle = true,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const type = showPassword ? "text" : "password";

  return (
    <TextField
      type={type}
      label={label}
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
