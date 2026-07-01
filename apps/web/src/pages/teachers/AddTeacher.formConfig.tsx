import type { ReactNode } from "react";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/Person";
import { Tooltip } from "@mui/material";
import type { FormConfig } from "../../components/reusable/formFramework.types";
import { type MediaUploadSlotItem, type SelectItemOption } from "../../components/semantic";
import { Box, IconButton } from "../../components/primitives";

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
  const assignmentFieldGrid = isEditMode ? { xs: 12, sm: 4 } : { xs: 12, sm: 6 };


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
        type: "dob",
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
        type: "phone",
        placeholder: "10-digit mobile number",
        required: true,
      },
      email: {
        name: "email",
        label: "Email Address",
        type: "text",
        placeholder: "user@example.com",
        required: true,
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
        label: "Status",
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
        props: {
          htmlInput: { maxLength: 6, inputMode: "numeric", pattern: "[0-9]*" },
        },
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
        grid: { xs: 12, sm: 2, md: 2 },
        show: () => true,
        render: () => {
          const selectedItem = uploadItems[0];
          return (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                width: "100%",
                minHeight: { xs: 76, sm: 76 },
                pt: 0,
              }}
            >
              <Box
                sx={{
                  width: { xs: 76, sm: 72, md: 76 },
                  height: { xs: 76, sm: 72, md: 76 },
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: "grey.200",
                  bgcolor: "background.paper",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                {selectedItem?.previewUrl ? (
                  <Tooltip title="View photo" arrow>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => window.open(selectedItem.previewUrl, "_blank", "noopener,noreferrer")}
                      sx={{
                        p: 0,
                        m: 0,
                        width: "100%",
                        height: "100%",
                        border: "none",
                        borderRadius: "50%",
                        overflow: "hidden",
                        bgcolor: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <Box
                        component="img"
                        key={selectedItem.previewUrl}
                        src={selectedItem.previewUrl}
                        alt="Teacher profile"
                        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </Box>
                  </Tooltip>
                ) : (
                  <PersonIcon sx={{ fontSize: 34, color: "text.disabled" }} />
                )}

                <Box
                  sx={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 999,
                    bgcolor: "rgba(255,255,255,0.9)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.16)",
                  }}
                >
                  <Tooltip title={selectedItem ? "Change photo" : "Upload photo"} arrow>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const input = document.getElementById("teacher-photo-upload") as HTMLInputElement | null;
                        input?.click();
                      }}
                      sx={{
                        width: 20,
                        height: 20,
                        border: "1px solid",
                        borderColor: "primary.main",
                        color: "primary.main",
                        bgcolor: "background.paper",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                      aria-label="Upload teacher photo"
                    >
                      <PhotoCameraIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>

                  {selectedItem ? (
                    <Tooltip title="Remove photo" arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveMediaItem(selectedItem.id)}
                        sx={{
                          width: 20,
                          height: 20,
                          border: "1px solid",
                          borderColor: "error.main",
                          color: "error.main",
                          bgcolor: "background.paper",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        aria-label="Remove teacher photo"
                      >
                        <DeleteIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Box>
              </Box>

              <input
                id="teacher-photo-upload"
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const { files } = event.target;
                  if (files?.length) void handleAddMediaFiles(files);
                  event.target.value = "";
                }}
              />

            </Box>
          );
        },
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 7, md: 7 },
        fieldNames: ["full_name"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 3, md: 3 },
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
        title: isEditMode ? "Assignment & Status" : "Assignment",
        icon: icons?.assignment,
      },
      {
        kind: "fields",
        grid: assignmentFieldGrid,
        fieldNames: ["class_id"],
      },
      {
        kind: "fields",
        grid: assignmentFieldGrid,
        fieldNames: ["class_division_id"],
      },
      ...(isEditMode
        ? [
            {
              kind: "fields" as const,
              grid: { xs: 12, sm: 4 },
              fieldNames: ["is_active" as keyof AddTeacherFormData],
            },
          ]
        : []),

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
