/**
 * FormCheckbox — React Hook Form integrated Checkbox
 * Binds checked state and onChange to form state.
 */

import { Controller, ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { Checkbox, FormControlLabel } from "../../components/primitives";

type FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<ControllerProps<TFieldValues, TName>, "render"> & {
  label?: React.ReactNode;
  /** Props passed to Checkbox primitive. */
  checkboxProps?: Omit<React.ComponentProps<typeof Checkbox>, "checked" | "onChange">;
};

export default function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, label, checkboxProps, ...controllerProps }: FormCheckboxProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      {...controllerProps}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Checkbox
              ref={field.ref}
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              onBlur={field.onBlur}
              {...checkboxProps}
            />
          }
          label={label}
        />
      )}
    />
  );
}
