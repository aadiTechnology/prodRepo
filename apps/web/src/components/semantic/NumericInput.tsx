/**
 * NumericInput — Semantic component
 * Text field that accepts digits only.
 */

import type { ChangeEvent } from "react";
import { TextField, type TextFieldProps } from "../primitives";
import { withDigitsOnlyChange } from "../../utils/sanitizeDigitsOnly";

export interface NumericInputProps extends Omit<TextFieldProps, "type"> {
  type?: "text" | "tel";
}

export default function NumericInput({
  type = "text",
  label,
  placeholder,
  onChange,
  slotProps,
  inputProps,
  ...props
}: NumericInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    withDigitsOnlyChange(onChange, event);
  };

  return (
    <TextField
      type={type}
      fullWidth={true}
      label={label}
      placeholder={placeholder}
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
