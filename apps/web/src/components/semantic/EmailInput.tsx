/**
 * EmailInput — Semantic component
 * Email field with type="email" and optional validation hint. Uses TextField primitive.
 */

import { TextField, type TextFieldProps } from "../primitives";

export interface EmailInputProps extends Omit<TextFieldProps, "type"> {
  /** Override type only if needed (default email). */
  type?: "email" | "text";
}

export default function EmailInput({
  type = "email",
  label = "Email",
  placeholder,
  ...props
}: EmailInputProps) {
  return (
    <TextField
      type={type}
      label={label}
      placeholder={placeholder ?? "e.g. user@example.com"}
      autoComplete="email"
      {...props}
    />
  );
}
