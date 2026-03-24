import {
  accountConfirmPasswordField,
  accountEmailField,
  accountPasswordField,
} from "../utils/accountFormFieldPresets";
import type { FormConfig } from "../components/reusable/formFramework.types";
import type { SelectItemOption } from "../components/semantic";

export type CreateUserFormData = {
  email: string;
  full_name: string;
  password: string;
  confirm_password: string;
  role_code: string;
  is_active: boolean;
};

type CreateUserFormConfigFactoryArgs = {
  isEditMode: boolean;
  roleOptions: SelectItemOption[];
  roleOptionsLoading: boolean;
};

export function createUserFormConfig({
  isEditMode,
  roleOptions,
  roleOptionsLoading,
}: CreateUserFormConfigFactoryArgs): FormConfig<CreateUserFormData> {
  return {
    fields: {
      full_name: {
        name: "full_name",
        label: "Full name",
        type: "text",
        placeholder: "Enter full name",
        required: true,
        props: { htmlInput: { minLength: 2 } },
      },
      email: accountEmailField<CreateUserFormData>({
        placeholder: "user@example.com",
        isEditMode,
      }),
      password: accountPasswordField<CreateUserFormData>("password", { isEditMode }),
      confirm_password: accountConfirmPasswordField<CreateUserFormData>({ isEditMode }),
      role_code: {
        name: "role_code",
        label: "Role",
        type: "select",
        required: true,
        props: {
          options: roleOptions,
          loading: roleOptionsLoading,
          loadingLabel: "Loading roles...",
          emptyListLabel: "No roles found",
          disableWhenEmpty: true,
        },
      },
      is_active: {
        name: "is_active",
        label: "Account active",
        type: "switch",
        conditionalRender: () => isEditMode,
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["full_name", "email"],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["password", "confirm_password"],
        show: (c) => !c.isEditMode,
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["role_code", "is_active"],
        show: (c) => c.isEditMode,
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["role_code"],
        show: (c) => !c.isEditMode,
      },
    ],
  };
}
