/**
 * FormTextField — React Hook Form integrated TextField
 * Binds value, onChange, onBlur and error to form state. Use with Controller.
 */

import { Controller, ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { TextField } from "../../components/primitives";

type FormTextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<ControllerProps<TFieldValues, TName>, "render"> & {
  /** Props passed to the TextField primitive. */
  textFieldProps?: Omit<React.ComponentProps<typeof TextField>, "name" | "value" | "onChange" | "onBlur" | "error" | "helperText">;
};

export default function FormTextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, textFieldProps, ...controllerProps }: FormTextFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      {...controllerProps}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          {...textFieldProps}
        />
      )}
    />
  );
}
