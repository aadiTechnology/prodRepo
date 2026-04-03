import type { FormConfig } from "../components/reusable/formFramework.types";

export type ChangePasswordFormData = {
  current_password: string;
  new_password: string;
  confirm_password: string;
  is_active: boolean;
};

type ChangePasswordFormConfigArgs = {
  isEditMode: boolean;
};

export function createChangePasswordFormConfig({
  isEditMode,
}: ChangePasswordFormConfigArgs): FormConfig<ChangePasswordFormData> {
  return {
    fields: {
      current_password: {
        name: "current_password",
        label: "Current Password",
        type: "password",
        placeholder: "Enter current password",
        required: true,
        props: { htmlInput: { minLength: 6 } },
      },
      new_password: {
        name: "new_password",
        label: "New Password",
        type: "password",
        placeholder: "Enter new password",
        required: true,
        props: { htmlInput: { minLength: 6 } },
        helperText: "Password must be at least 8 characters and contain at least 1 letter and 1 number.",
      },
      confirm_password: {
        name: "confirm_password",
        label: "Confirm Password",
        type: "password",
        placeholder: "Re-enter new password",
        required: true,
        props: { htmlInput: { minLength: 6 } },
      },
      is_active: {
        name: "is_active",
        label: "Account Active",
        type: "switch",
        helperText: "Control system access for this account",
        conditionalRender: () => isEditMode,
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["current_password"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["new_password"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["confirm_password"],
      },
      ...(
        isEditMode
          ? [
              {
                kind: "fields" as const,
                grid: { xs: 12 },
                fieldNames: ["is_active" as keyof ChangePasswordFormData],
              },
            ]
          : []
      ),
    ],
  };
}
