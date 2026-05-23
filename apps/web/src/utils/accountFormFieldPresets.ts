import type { FormFieldConfig } from "../components/reusable/formFramework.types";

export function accountEmailField<T extends Record<string, unknown> & { email: string }>(
  options: { placeholder: string; isEditMode: boolean }
): FormFieldConfig<T> {
  return {
    name: "email",
    label: "Email address",
    type: "email",
    placeholder: options.placeholder,
    required: true,
    props: options.isEditMode
      ? { disabled: true, autoComplete: "email" }
      : {
          preventAutofill: true,
          autoComplete: "off",
          inputName: "user_account_email",
        },
    helperText: (ctx) =>
      ctx.isEditMode ? "Account identifier cannot be changed" : undefined,
  };
}

export function accountPasswordField<T extends Record<string, unknown>>(
  fieldName: keyof T & string,
  options: { isEditMode: boolean; placeholder?: string }
): FormFieldConfig<T> {
  return {
    name: fieldName,
    label: "Password",
    type: "password",
    placeholder: options.placeholder ?? "Enter secure password",
    required: true,
    conditionalRender: () => !options.isEditMode,
    props: {
      preventAutofill: true,
      autoComplete: "new-password",
      inputName: "user_account_password",
    },
  };
}

export function accountConfirmPasswordField<T extends Record<string, unknown>>(
  options: { isEditMode: boolean; placeholder?: string }
): FormFieldConfig<T> {
  return {
    name: "confirm_password",
    label: "Confirm password",
    type: "password",
    placeholder: options.placeholder ?? "Repeat password",
    required: true,
    conditionalRender: () => !options.isEditMode,
    props: {
      preventAutofill: true,
      autoComplete: "new-password",
      inputName: "user_account_password_confirm",
    },
  };
}
