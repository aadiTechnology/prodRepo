/**
 * FormSelect — React Hook Form integrated Select
 * Binds value, onChange and error to form state. Use with Controller.
 */

import { Controller, ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { Select } from "../../components/primitives";

type FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<ControllerProps<TFieldValues, TName>, "render"> & {
  /** Props passed to the Select primitive (label, children, etc.). */
  selectProps?: Omit<React.ComponentProps<typeof Select>, "name" | "value" | "onChange" | "error">;
};

export default function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, selectProps, ...controllerProps }: FormSelectProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      {...controllerProps}
      render={({ field, fieldState }) => (
        <Select
          {...field}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          {...selectProps}
        />
      )}
    />
  );
}
