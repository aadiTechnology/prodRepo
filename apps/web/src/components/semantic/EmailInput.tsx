// apps/web/src/components/semantic/EmailInput.tsx
import { TextField, type TextFieldProps } from "../primitives";

export interface EmailInputProps extends Omit<TextFieldProps, "type"> {
  /** Override type only if needed (default email). */
  type?: "email" | "text";
}

export default function EmailInput({
  type = "email",
  label = "Email",
  placeholder,
  sx,
  ...props
}: EmailInputProps) {
  return (
    <TextField
      type={type}
      label={label}
      placeholder={placeholder ?? "e.g. user@example.com"}
      autoComplete="email"
      sx={[
        { bgcolor: "background.paper" },          // semantic default
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []), // allow callers to extend/override
      ]}
      {...props}
    />
  );
}