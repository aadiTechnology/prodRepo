import type { ReactNode } from "react";
import type { FormConfig, FormLayoutContext } from "../../components/reusable/formFramework.types";
import { MediaUploadField, type MediaUploadSlotItem, type SelectItemOption } from "../../components/semantic";

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
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
};

type AddTeacherFormConfigFactoryArgs = {
  isEditMode: boolean;
  classOptions: SelectItemOption[];
  divisionOptions: SelectItemOption[];
  disableAssignmentFields?: boolean;
  classesLoading: boolean;
  divisionsLoading: boolean;
  uploadItems: MediaUploadSlotItem[];
  handleAddMediaFiles: (files: FileList | File[]) => Promise<void>;
  handleRemoveMediaItem: (itemId: string) => void;
  icons?: {
    personal?: ReactNode;
    contact?: ReactNode;
    academic?: ReactNode;
    assignment?: ReactNode;
    address?: ReactNode;
  };
};



export function addTeacherFormConfig({
  isEditMode,
  classOptions,
  divisionOptions,
  disableAssignmentFields = false,
  classesLoading,
  divisionsLoading,
  uploadItems,
  handleAddMediaFiles,
  handleRemoveMediaItem,
  icons,
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
        required: false,
        props: {
          options: classOptions,
          loading: classesLoading,
          emptyListLabel: "No classes available",
          disabled: disableAssignmentFields,
        }
      },
      class_division_id: {
        name: "class_division_id",
        label: "Assigned Division",
        type: "select",
        required: false,
        props: {
          options: divisionOptions,
          loading: divisionsLoading,
          emptyListLabel: "No divisions available",
          disabled: disableAssignmentFields || divisionOptions.length === 0,
        }
      },
      
      is_active: {
        name: "is_active",
        label: "Is Active",
        type: "switch",
        conditionalRender: () => isEditMode,
      },

      // Address Details
      address: {
        name: "address",
        label: "Full Address",
        type: "text",
        placeholder: "Enter full address",
        props: { multiline: true, rows: 2 }
      },
      city: {
        name: "city",
        label: "City",
        type: "text",
        placeholder: "City",
      },
      state: {
        name: "state",
        label: "State",
        type: "text",
        placeholder: "State",
      },
      pincode: {
        name: "pincode",
        label: "Pincode",
        type: "text",
        placeholder: "6-digit pincode",
      },
    },
    layoutRows: [
      {
        kind: "section",
        title: "Information",
        icon: icons?.personal,
      },
      {
        kind: "custom",
        grid: { xs: 12, sm: 2 },
        show: () => true,
        render: (ctx) => (
          <MediaUploadField
            label="Profile Image"
            items={uploadItems}
            onAddFiles={handleAddMediaFiles}
            onRemoveItem={handleRemoveMediaItem}
            accept="image/*"
            multiple={false}
            maxFiles={1}
            size="small"
            tooltipChoose="Upload"
            tooltipAdd="Change"
            tooltip="Upload Teacher Photo"
          />
        ),
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 7 },
        fieldNames: ["full_name"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 3 },
        fieldNames: ["gender"],
      },

      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["mobile_number"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["email"],
      },

      {
        kind: "fields",
        grid: { xs: 12, sm: 5 },
        fieldNames: ["qualification"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["date_of_birth"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 3 },
        fieldNames: ["experience_years"],
      },

      {
        kind: "section",
        title: "Assignment & Status",
        icon: icons?.assignment,
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["class_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["class_division_id"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["is_active"],
        show: (c: FormLayoutContext) => c.isEditMode,
      },

      {
        kind: "section",
        title: "Location",
        icon: icons?.address,
      },
      {
        kind: "fields",
        grid: { xs: 12 },
        fieldNames: ["address"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["city"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["state"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 4 },
        fieldNames: ["pincode"],
      },
    ],



  };
}
