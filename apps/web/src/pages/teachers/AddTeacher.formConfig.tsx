import type { ReactNode } from "react";
import type { FormConfig, FormLayoutContext } from "../../components/reusable/formFramework.types";
import { MediaUploadUrlField, type MediaUploadSlotItem, type SelectItemOption } from "../../components/semantic";

export type AddTeacherFormData = {
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  mobile_number: string;
  email: string | null;
  qualification: string | null;
  experience_years: number | null;
  class_id: string | null;
  class_division_id: string | null;
  photo_url: string;
  is_active: boolean;
};

type AddTeacherFormConfigFactoryArgs = {
  isEditMode: boolean;
  classOptions: SelectItemOption[];
  divisionOptions: SelectItemOption[];
  classesLoading: boolean;
  divisionsLoading: boolean;
  mediaTab: number;
  setMediaTab: (value: number) => void;
  uploadItems: MediaUploadSlotItem[];
  handleAddMediaFiles: (files: FileList | File[]) => Promise<void>;
  handleRemoveMediaItem: (itemId: string) => void;
};

export function addTeacherFormConfig({
  isEditMode,
  classOptions,
  divisionOptions,
  classesLoading,
  divisionsLoading,
  mediaTab,
  setMediaTab,
  uploadItems,
  handleAddMediaFiles,
  handleRemoveMediaItem,
}: AddTeacherFormConfigFactoryArgs): FormConfig<AddTeacherFormData> {
  return {
    fields: {
      // Personal Details
      full_name: {
        name: "full_name",
        label: "Full Name",
        type: "text",
        placeholder: "Enter full name",
        required: true,
      },
      date_of_birth: {
        name: "date_of_birth",
        label: "Date of Birth",
        type: "date",
      },
      gender: {
        name: "gender",
        label: "Gender",
        type: "select",
        required: false,
        props: {
          options: [
            { id: "Male", label: "Male", value: "Male" },
            { id: "Female", label: "Female", value: "Female" },
            { id: "Other", label: "Other", value: "Other" },
          ]
        }
      },
      
      // Contact Details
      mobile_number: {
        name: "mobile_number",
        label: "Mobile Number",
        type: "text",
        placeholder: "10-digit mobile number",
        required: true,
      },
      email: {
        name: "email",
        label: "Email Address",
        type: "text",
        placeholder: "user@example.com",
        required: false,
      },

      // Professional Details
      qualification: {
        name: "qualification",
        label: "Qualification",
        type: "text",
        placeholder: "E.g., B.Ed, M.Sc",
      },
      experience_years: {
        name: "experience_years",
        label: "Experience (Years)",
        type: "text",
        placeholder: "E.g., 5",
      },

      // Class Assignment
      class_id: {
        name: "class_id",
        label: "Assigned Class",
        type: "select",
        props: {
          options: classOptions,
          loading: classesLoading,
          emptyListLabel: "No classes available",
        }
      },
      class_division_id: {
        name: "class_division_id",
        label: "Assigned Division",
        type: "select",
        props: {
          options: divisionOptions,
          loading: divisionsLoading,
          emptyListLabel: "No divisions available",
          disabled: divisionOptions.length === 0,
        }
      },
      
      is_active: {
        name: "is_active",
        label: "Is Active",
        type: "switch",
        conditionalRender: () => isEditMode,
      },
    },
    layoutRows: [
      {
        kind: "fields",
        grid: { xs: 12, md: 4 },
        fieldNames: ["full_name", "date_of_birth", "gender"],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["mobile_number", "email"],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["qualification", "experience_years"],
      },
      {
        kind: "fields",
        grid: { xs: 12, md: 6 },
        fieldNames: ["class_id", "class_division_id"],
      },
      {
        kind: "custom",
        grid: { xs: 12, md: 6 },
        show: () => true,
        render: (ctx) => (
          <MediaUploadUrlField
            label="Profile Photo"
            tabIndex={mediaTab}
            onTabChange={setMediaTab}
            urlValue={ctx.formData.photo_url.startsWith("data:") ? "" : ctx.formData.photo_url}
            urlFieldName="photo_url"
            onUrlChange={ctx.handleChange}
            urlError={ctx.fieldErrors.photo_url}
            urlInputLabel="Image URL"
            urlPlaceholder="https://example.com/photo.png"
            items={uploadItems}
            onAddFiles={handleAddMediaFiles}
            onRemoveItem={handleRemoveMediaItem}
            accept="image/*"
            multiple={false}
            maxFiles={1}
            tooltipChoose="Choose photo"
            tooltipAdd="Replace photo"
          />
        ),
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["is_active"],
        show: (c: FormLayoutContext) => c.isEditMode,
      },
    ],
  };
}
