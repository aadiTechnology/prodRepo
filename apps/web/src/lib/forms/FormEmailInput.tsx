/**
 * FormEmailInput — React Hook Form integrated EmailInput
 * Binds to form state and displays validation errors.
 */

import { Controller, ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { EmailInput } from "../../components/semantic";

type FormEmailInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<ControllerProps<TFieldValues, TName>, "render"> & {
  /** Props passed to EmailInput. */
  inputProps?: Omit<React.ComponentProps<typeof EmailInput>, "name" | "value" | "onChange" | "onBlur" | "error" | "helperText">;
};

export default function FormEmailInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, inputProps, ...controllerProps }: FormEmailInputProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      {...controllerProps}
      render={({ field, fieldState }) => (
        <EmailInput
          {...field}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          {...inputProps}
        />
      )}
    />
  );
}
