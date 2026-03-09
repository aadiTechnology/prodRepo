/**
 * PhoneInput — Semantic component
 * Phone number field. Uses TextField primitive.
 */

import { TextField, type TextFieldProps } from "../primitives";

export interface PhoneInputProps extends Omit<TextFieldProps, "type"> {
  /** Override type (default tel). */
  type?: "tel" | "text";
}

export default function PhoneInput({
  type = "tel",
  label = "Phone",
  placeholder,
  ...props
}: PhoneInputProps) {
  return (
    <TextField
      type={type}
      label={label}
      placeholder={placeholder ?? "e.g. +1 234 567 8900"}
      autoComplete="tel"
      {...props}
    />
  );
}
