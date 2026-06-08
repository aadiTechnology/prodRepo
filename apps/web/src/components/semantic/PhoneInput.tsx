/**
 * PhoneInput — Semantic component
 * Phone number field. Uses TextField primitive.
 */

import type { ChangeEvent } from "react";
import { TextField, type TextFieldProps } from "../primitives";

export interface PhoneInputProps extends Omit<TextFieldProps, "type"> {
  /** Override type (default tel). */
  type?: "tel" | "text";
}

function sanitizePhoneValue(value: string): string {
  return value.replace(/\D/g, "");
}

export default function PhoneInput({
  type = "tel",
  label = "Phone",
  placeholder,
  onChange,
  slotProps,
  inputProps,
  ...props
}: PhoneInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;

    const sanitized = sanitizePhoneValue(event.target.value);
    if (sanitized === event.target.value) {
      onChange(event);
      return;
    }

    onChange({
      ...event,
      target: { ...event.target, value: sanitized },
      currentTarget: { ...event.currentTarget, value: sanitized },
    });
  };

  return (
    <TextField
      type={type}
      fullWidth={true}
      label={label}
      placeholder={placeholder ?? "e.g. 9876543210"}
      autoComplete="tel"
      onChange={handleChange}
      slotProps={{
        ...slotProps,
        htmlInput: {
          inputMode: "numeric",
          pattern: "[0-9]*",
          ...slotProps?.htmlInput,
        },
      }}
      inputProps={{
        inputMode: "numeric",
        pattern: "[0-9]*",
        ...inputProps,
      }}
      {...props}
    />
  );
}
