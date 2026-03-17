// apps/web/src/components/semantic/EmailInput.tsx
import { TextField, type TextFieldProps } from "../primitives";

export interface EmailInputProps extends Omit<TextFieldProps, "type"> {
  type?: "email" | "text";
}

export default function EmailInput({
  type = "email",
  label = "Email Address",
  placeholder = "Enter email address",
  name = "email",
  fullWidth = true,
  variant = "outlined",
  sx,
  ...props
}: EmailInputProps) {
  return (
    <TextField
      type={type}
      label={label}
      placeholder={placeholder}
      name={name}
      fullWidth={fullWidth}
      variant={variant}
      autoComplete="email"
      sx={[
        { bgcolor: "background.paper" },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    />
  );
}