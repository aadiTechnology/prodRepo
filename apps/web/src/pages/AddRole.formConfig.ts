import { type FormConfig } from "../components/reusable/formFramework.types";

export type AddRoleFormData = {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
};

type AddRoleFormConfigArgs = {
  isEditMode: boolean;
};

export function createAddRoleFormConfig(_args: AddRoleFormConfigArgs): FormConfig<AddRoleFormData> {
  return {
    fields: {
      name: {
        name: "name",
        label: "Role Name",
        type: "text",
        placeholder: "Enter role name",
        required: true,
        props: {
          htmlInput: { minLength: 2 },
        },
      },
      code: {
        name: "code",
        label: "Role Code",
        type: "text",
        placeholder: "Enter unique role code",
        required: true,
        props: {
          htmlInput: { minLength: 2 },
        },
      },
      description: {
        name: "description",
        label: "Description",
        type: "text",
        placeholder: "Enter description",
        required: false,
        props: {
          multiline: true,
          rows: 3,
        },
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["name"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["code"],
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["description"],
      },
    ],
  };
}
