import { useMemo } from "react";
import { Box, Typography, alpha } from "@mui/material";

import BaseForm from "../../components/reusable/BaseForm";
import ApplicableToClassSelector from "../../components/reusable/ApplicableToClassSelector";
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
    useSubjectMultiClassSelector,
    subjectClassDivisionMap,
    selectedSubjectClassIds,
    isSubjectScopeClassSelectAll,
    handleSubjectScopeClassToggle,
    handleSubjectScopeDivisionToggle,
    handleSubjectScopeClassSelectAll,
    handleConfirmSubmit,
    assignTeacherPending,
    isEditMode,
    error,
    setError,
    snackbar,
    setSnackbar,
    clearForm,
  } = useAssignTeacherController();

  const formConfigWithSubjectScope = useMemo(() => {
    if (!useSubjectMultiClassSelector) {
      return formConfig;
    }

    return {
      ...formConfig,
      layoutRows: [
        ...formConfig.layoutRows,
        {
          kind: "custom" as const,
          grid: { xs: 12 },
          render: () => (
            <Box
              sx={{
                border: `1px solid ${colorTokens.border.default}`,
                borderRadius: "12px",
                p: 2,
                bgcolor: alpha(colorTokens.primary.main, 0.02),
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Classes & divisions for this subject
              </Typography>
              {subjectClassDivisionMap.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No class/division mappings found for the selected subject in this academic year.
                </Typography>
              ) : (
                <ApplicableToClassSelector
                  applicableTo={{ student: true, teacher: false, admin: false }}
                  isApplicableSelectAll={isSubjectScopeClassSelectAll}
                  isClassSelectAll={isSubjectScopeClassSelectAll}
                  classDivisionMap={subjectClassDivisionMap}
                  selectedClassIds={selectedSubjectClassIds}
                  selectedDivisionIds={formData.class_division_ids}
                  onApplicableSelectAll={handleSubjectScopeClassSelectAll}
                  onApplicableRoleToggle={() => undefined}
                  onClassSelectAll={handleSubjectScopeClassSelectAll}
                  onClassToggle={handleSubjectScopeClassToggle}
                  onDivisionToggle={handleSubjectScopeDivisionToggle}
                  hideApplicableRoleControls
                />
              )}
            </Box>
          ),
        },
      ],
    };
  }, [
    formConfig,
    useSubjectMultiClassSelector,
    subjectClassDivisionMap,
    isSubjectScopeClassSelectAll,
    selectedSubjectClassIds,
    formData.class_division_ids,
    handleSubjectScopeClassSelectAll,
    handleSubjectScopeClassToggle,
    handleSubjectScopeDivisionToggle,
  ]);

  return (
    <BaseForm<AssignTeacherFormData>
      formConfig={formConfigWithSubjectScope}
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
            For subject teachers, select the subject and then choose multiple classes/divisions in one save.
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
