import { Box, Typography } from "@mui/material";

import BaseForm from "../../components/reusable/BaseForm";
import type { AssignTeacherFormData } from "../../formConfig/assignTeacherFormConfig";
import { useAssignTeacherController } from "./useAssignTeacherController";

export default function AssignTeacher() {
  const {
    formData,
    setFormData,
    fieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
    formConfig,
    assignmentCheck,
    assignmentChecking,
    canShowAssignmentHint,
    handleConfirmSubmit,
    assignTeacherPending,
    isEditMode,
    error,
    setError,
    snackbar,
    setSnackbar,
    clearForm,
  } = useAssignTeacherController();

  return (
    <BaseForm<AssignTeacherFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleSubmit}
      setFormError={setError}
      onConfirmSubmit={handleConfirmSubmit}
      isEditMode={isEditMode}
      loading={assignTeacherPending}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Assigned Class Teachers", path: "/teacher-assignments" },
          { title: isEditMode ? "Edit Assignment" : "Assign Teacher", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Reset",
        saveTooltipCreate: isEditMode ? "Update" : "Save",
      }}
      onCancelNavigate={clearForm}
      confirmMessage={
        isEditMode
          ? "Are you sure you want to update this teacher assignment?"
          : "Are you sure you want to assign this teacher?"
      }
      submitLabelCreate={isEditMode ? "Update" : "Save"}
      formTopSlot={
        canShowAssignmentHint && assignmentCheck?.is_assigned ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1,
              py: 0.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "success.main", fontWeight: 600, fontSize: "0.9rem" }}
            >
              {"● Already assigned class teacher"}
              {assignmentChecking ? "..." : assignmentCheck.teacher_name ? `: ${assignmentCheck.teacher_name}` : ""}
            </Typography>
          </Box>
        ) : null
      }
    />
  );
}
