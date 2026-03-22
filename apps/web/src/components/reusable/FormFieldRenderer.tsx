import {
  EmailInput,
  PasswordInput,
  LabeledSwitch,
  SelectItem,
  type SelectItemOption,
} from "../semantic";
import TextFieldInput from "../semantic/TextFieldInput";
import PhoneInput from "../semantic/PhoneInput";
import type { FormFieldConfig, FormRenderContext } from "./formFramework.types";

function resolveHelperText<T extends Record<string, unknown>>(
  field: FormFieldConfig<T>,
  ctx: FormRenderContext<T>
): string | undefined {
  const err = ctx.fieldErrors[field.name];
  if (typeof field.helperText === "function") {
    const h = field.helperText(ctx);
    if (h !== undefined && h !== "") return h;
    return err || undefined;
  }
  if (field.helperText !== undefined) return field.helperText;
  return err || undefined;
}

export type FormFieldRendererProps<T extends Record<string, unknown>> = {
  field: FormFieldConfig<T>;
  ctx: FormRenderContext<T>;
};

export default function FormFieldRenderer<T extends Record<string, unknown>>({
  field,
  ctx,
}: FormFieldRendererProps<T>) {
  const {
    formData,
    fieldErrors,
    handleChange,
    handleFieldValueChange,
  } = ctx;
  const name = field.name;
  const errorMsg = fieldErrors[name];
  const helperText = resolveHelperText(field, ctx);
  const showError = Boolean(errorMsg);
  const extra = field.props ?? {};
  const conditional =
    field.conditionalRender?.({ isEditMode: ctx.isEditMode }) ?? true;
  if (!conditional) return null;

  if (field.type === "custom") {
    return field.render?.(ctx) ?? null;
  }

  switch (field.type) {
    case "text":
      return (
        <TextFieldInput
          label={field.label}
          placeholder={field.placeholder}
          name={name}
          value={String(formData[name] ?? "")}
          onChange={handleChange}
          required={field.required}
          error={showError}
          helperText={helperText}
          {...(extra as Record<string, unknown>)}
        />
      );
    case "email":
      return (
        <EmailInput
          label={field.label}
          name={name}
          value={String(formData[name] ?? "")}
          onChange={handleChange}
          required={field.required}
          placeholder={field.placeholder}
          error={showError}
          helperText={helperText}
          {...(extra as Record<string, unknown>)}
        />
      );
    case "password":
      return (
        <PasswordInput
          label={field.label}
          name={name}
          value={String(formData[name] ?? "")}
          onChange={handleChange}
          required={field.required}
          placeholder={field.placeholder}
          error={showError}
          helperText={helperText}
          {...(extra as Record<string, unknown>)}
        />
      );
    case "phone":
      return (
        <PhoneInput
          label={field.label}
          name={name}
          value={String(formData[name] ?? "")}
          onChange={handleChange}
          placeholder={field.placeholder}
          error={showError}
          helperText={helperText}
          {...(extra as Record<string, unknown>)}
        />
      );
    case "select": {
      const coerceToNumber = extra.coerceToNumber === true;
      const options = (extra.options as SelectItemOption[] | undefined) ?? [];
      const loading = Boolean(extra.loading);
      const strVal =
        formData[name] === null || formData[name] === undefined
          ? ""
          : String(formData[name]);
      return (
        <SelectItem
          label={field.label}
          name={name}
          value={strVal}
          options={options}
          loading={loading}
          loadingLabel={(extra.loadingLabel as string | undefined) ?? "Loading..."}
          emptyListLabel={(extra.emptyListLabel as string | undefined) ?? "No options available"}
          emptyOptionLabel={extra.emptyOptionLabel as string | undefined}
          disableWhenEmpty={extra.disableWhenEmpty !== false}
          required={field.required ?? true}
          onValueChange={(v) => {
            if (coerceToNumber) {
              handleFieldValueChange(name, v === "" ? null : Number(v));
            } else {
              handleFieldValueChange(name, v);
            }
          }}
          error={showError}
          helperText={helperText}
          {...(Object.fromEntries(
            Object.entries(extra).filter(
              ([k]) =>
                ![
                  "options",
                  "loading",
                  "loadingLabel",
                  "emptyListLabel",
                  "emptyOptionLabel",
                  "disableWhenEmpty",
                  "coerceToNumber",
                ].includes(k)
            )
          ) as Record<string, unknown>)}
        />
      );
    }
    case "switch":
      return (
        <LabeledSwitch
          label={field.label}
          name={name}
          checked={Boolean(formData[name])}
          onChange={(e) => handleFieldValueChange(name, e.target.checked)}
          {...(extra as Record<string, unknown>)}
        />
      );
    default:
      return null;
  }
}
