/**
 * FormPasswordInput — React Hook Form integrated PasswordInput
 * Binds to form state and displays validation errors.
 */

import { Controller, ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { PasswordInput } from "../../components/semantic";

type FormPasswordInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<ControllerProps<TFieldValues, TName>, "render"> & {
  /** Props passed to PasswordInput. */
  inputProps?: Omit<React.ComponentProps<typeof PasswordInput>, "name" | "value" | "onChange" | "onBlur" | "error" | "helperText">;
};

export default function FormPasswordInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, inputProps, ...controllerProps }: FormPasswordInputProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      {...controllerProps}
      render={({ field, fieldState }) => (
        <PasswordInput
          {...field}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          {...inputProps}
        />
      )}
    />
  );
}
