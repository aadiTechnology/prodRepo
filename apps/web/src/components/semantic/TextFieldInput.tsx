import { TextField, type TextFieldProps } from "../primitives";

export interface TextFieldInputProps extends Omit<TextFieldProps, "variant"> {
  label?: string;
  placeholder?: string;
  /** Props passed to the underlying HTML input (e.g. minLength, maxLength). */
  htmlInput?: React.InputHTMLAttributes<HTMLInputElement>;
}

export default function TextFieldInput({
  label = "Full Name",
  placeholder = "Enter full name",
  fullWidth = true,
  htmlInput,
  slotProps,
  ...props
}: TextFieldInputProps) {
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      fullWidth={fullWidth}
      variant="outlined"
      slotProps={{
        htmlInput: { minLength: 2, ...htmlInput, ...slotProps?.htmlInput },
        ...slotProps,
      }}
      {...props}
    />
  );
}