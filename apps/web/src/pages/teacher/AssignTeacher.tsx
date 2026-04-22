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
    hasAssignedLegend,
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
        <Box sx={{ px: 1, py: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {hasAssignedLegend ? (
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.88rem" }}>
              <Box component="span" sx={{ color: "#29b6f6", fontWeight: 700 }}>
                ●
              </Box>{" "}
              <Box component="span" sx={{ color: "#29b6f6", fontWeight: 700 }}>
                Sky blue options
              </Box>{" "}
              indicate already assigned class/division.
            </Typography>
          ) : null}
          {canShowAssignmentHint && assignmentCheck?.is_assigned ? (
            <Typography
              variant="body2"
              sx={{ color: "success.main", fontWeight: 600, fontSize: "0.9rem" }}
            >
              {"● Already assigned class teacher"}
              {assignmentChecking ? "..." : assignmentCheck.teacher_name ? `: ${assignmentCheck.teacher_name}` : ""}
            </Typography>
          ) : null}
        </Box>
      }
    />
  );
}
