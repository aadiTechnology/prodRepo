// apps/web/src/components/semantic/EmailInput.tsx
import { useEffect, useState } from "react";
import { TextField, type TextFieldProps } from "../primitives";

export interface EmailInputProps extends Omit<TextFieldProps, "type"> {
  type?: "email" | "text";
  /** Blocks browser login autofill (readonly until focus). */
  preventAutofill?: boolean;
  htmlInput?: React.InputHTMLAttributes<HTMLInputElement>;
}

export default function EmailInput({
  type = "email",
  label,
  placeholder = "Enter email address",
  name = "email",
  fullWidth = true,
  variant = "outlined",
  preventAutofill = false,
  autoComplete,
  htmlInput,
  slotProps,
  onFocus,
  sx,
  ...props
}: EmailInputProps) {
  const [readOnly, setReadOnly] = useState(preventAutofill);

  useEffect(() => {
    if (preventAutofill) setReadOnly(true);
  }, [preventAutofill]);

  const resolvedType = preventAutofill && type === "email" ? "text" : type;
  const resolvedAutoComplete = autoComplete ?? (preventAutofill ? "off" : "email");

  return (
    <TextField
      type={resolvedType}
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
            ? { readOnly, inputMode: "email", autoComplete: "off" }
            : {}),
          ...slotProps?.htmlInput,
        },
      }}
      onFocus={(e) => {
        if (preventAutofill) setReadOnly(false);
        onFocus?.(e);
      }}
      sx={[
        { bgcolor: "background.paper" },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    />
  );
}