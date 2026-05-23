import { Box, Typography, alpha } from "@mui/material";

import BaseForm from "../../components/reusable/BaseForm";
import type { AssignTeacherFormData } from "../../formConfig/assignTeacherFormConfig";
import { colorTokens } from "../../tokens/colors";
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
    assignmentHintLabel,
    isClassTeacherMode,
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
      headerRightBelowSlot={
        <Box
          sx={{
            display: "flex",
            width: "100%",
            justifyContent: "flex-end",
            px: { xs: 2, sm: 2.5 },
            py: 1.25,
            bgcolor: "#ffffff",
            border: `1px solid ${colorTokens.border.default}`,
            borderRadius: "14px",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              backgroundColor: "transparent",
            }}
          >
            <Typography variant="body2" sx={{ fontSize: "0.83rem", fontWeight: 700, color: "text.primary" }}>
              Legend:
            </Typography>
            <Box
              component="span"
              sx={{
                display: "inline-block",
                width: 20,
                height: 20,
                bgcolor: "#d6f0ff",
                border: "1px solid #d6f0ff",
              }}
            />
            <Typography variant="body2" sx={{ fontSize: "0.83rem", color: "text.primary", fontWeight: 400 }}>
              Already assigned class teacher for class/division
            </Typography>
          </Box>
        </Box>
      }
      formTopSlot={
        <Box sx={{ px: 1, py: 0.5, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.85rem", lineHeight: 1.5 }}>
            One teacher can be class teacher and subject teacher at the same time. Save each role separately.
            Subject teachers need one division per save; you can assign the same teacher to different class/division/subject
            combinations (e.g. Nursery EVS, then Std 2 Div B Math).
          </Typography>
          {canShowAssignmentHint && assignmentCheck?.is_assigned ? (
            <Typography
              variant="body2"
              sx={{ color: "success.main", fontWeight: 600, fontSize: "0.9rem" }}
            >
              {`● ${assignmentHintLabel}`}
              {assignmentChecking ? "..." : assignmentCheck.teacher_name ? `: ${assignmentCheck.teacher_name}` : ""}
            </Typography>
          ) : null}
          {canShowAssignmentHint && !assignmentCheck?.is_assigned ? (
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
              {isClassTeacherMode
                ? "No class teacher assigned yet for this division."
                : "No subject teacher assigned yet for this division and subject."}
            </Typography>
          ) : null}
        </Box>
      }
    />
  );
}
