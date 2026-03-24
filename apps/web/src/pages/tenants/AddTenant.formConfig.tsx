import {
  MediaUploadUrlField,
  type MediaUploadSlotItem,
} from "../../components/semantic";
import {
  accountConfirmPasswordField,
  accountEmailField,
  accountPasswordField,
} from "../../utils/accountFormFieldPresets";
import type { FormConfig } from "../../components/reusable/formFramework.types";
import type { ThemeTemplate } from "../../types/themeTemplate";

export type AddTenantFormData = {
  name: string;
  owner_name: string;
  email: string;
  admin_password: string;
  confirm_password: string;
  phone: string;
  description: string;
  is_active: boolean;
  logo_url: string;
  theme_template_id: number | null;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pin_code: string;
};

type AddTenantFormConfigFactoryArgs = {
  isEditMode: boolean;
  mediaTab: number;
  setMediaTab: (value: number) => void;
  uploadItems: MediaUploadSlotItem[];
  handleAddMediaFiles: (files: FileList | File[]) => Promise<void>;
  handleRemoveMediaItem: (itemId: string) => void;
  templates: ThemeTemplate[];
};

export function createAddTenantFormConfig({
  isEditMode,
  mediaTab,
  setMediaTab,
  uploadItems,
  handleAddMediaFiles,
  handleRemoveMediaItem,
  templates,
}: AddTenantFormConfigFactoryArgs): FormConfig<AddTenantFormData> {
  return {
    fields: {
      name: {
        name: "name",
        label: "Tenant name",
        type: "text",
        placeholder: "e.g. Little Stars Academy",
        required: true,
        props: { htmlInput: { minLength: 3 } },
      },
      owner_name: {
        name: "owner_name",
        label: "Owner name",
        type: "text",
        placeholder: "Full name of the principal or owner",
        required: true,
        props: { htmlInput: { minLength: 1 } },
      },
      email: accountEmailField<AddTenantFormData>({
        placeholder: "admin@school.com",
        isEditMode,
      }),
      phone: {
        name: "phone",
        label: "Phone number",
        type: "phone",
        placeholder: "Official contact number",
      },
      admin_password: accountPasswordField<AddTenantFormData>("admin_password", { isEditMode }),
      confirm_password: accountConfirmPasswordField<AddTenantFormData>({ isEditMode }),
      address_line1: {
        name: "address_line1",
        label: "Address line 1",
        type: "text",
        placeholder: "e.g. 123 Education Lane",
        props: { htmlInput: { minLength: 0 } },
      },
      address_line2: {
        name: "address_line2",
        label: "Address line 2",
        type: "text",
        placeholder: "Building, floor or suite",
        props: { htmlInput: { minLength: 0 } },
      },
      state: {
        name: "state",
        label: "State",
        type: "text",
        placeholder: "Maharashtra",
        props: { htmlInput: { minLength: 0 } },
      },
      city: {
        name: "city",
        label: "City",
        type: "text",
        placeholder: "Mumbai",
        props: { htmlInput: { minLength: 0 } },
      },
      pin_code: {
        name: "pin_code",
        label: "Pin code",
        type: "text",
        placeholder: "400001",
        props: { htmlInput: { maxLength: 20, minLength: 0 } },
      },
      theme_template_id: {
        name: "theme_template_id",
        label: "Branding template",
        type: "select",
        required: false,
        props: {
          coerceToNumber: true,
          disableWhenEmpty: false,
          emptyOptionLabel: "Default theme",
          required: false,
          options: templates.map((t) => ({
            id: String(t.id),
            value: String(t.id),
            label: t.name,
          })),
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
        fieldNames: ["name", "owner_name"],
      },
      {
        kind: "custom",
        grid: { xs: 12, md: 6 },
        show: () => true,
        render: (ctx) => (
          <MediaUploadUrlField
            label="Logo"
            tabIndex={mediaTab}
            onTabChange={setMediaTab}
            urlValue={ctx.formData.logo_url.startsWith("data:") ? "" : ctx.formData.logo_url}
            urlFieldName="logo_url"
            onUrlChange={ctx.handleChange}
            urlError={ctx.fieldErrors.logo_url}
            urlInputLabel="Image URL"
            urlPlaceholder="https://example.com/logo.png"
            items={uploadItems}
            onAddFiles={handleAddMediaFiles}
            onRemoveItem={handleRemoveMediaItem}
            accept="image/*"
            multiple={false}
            maxFiles={1}
            tooltipChoose="Choose logo"
            tooltipAdd="Replace logo"
          />
        ),
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["email"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["phone"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["admin_password"],
        show: (c) => !c.isEditMode,
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["confirm_password"],
        show: (c) => !c.isEditMode,
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["address_line1"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["address_line2"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["state"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["city"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["pin_code"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["theme_template_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["is_active"],
        show: (c) => c.isEditMode,
      },
    ],
  };
}
