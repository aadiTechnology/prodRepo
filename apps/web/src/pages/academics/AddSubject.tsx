import React from "react";
import { BaseForm } from "../../components/reusable";
import { useSubjectFormController } from "../../hooks/useSubjectFormController";
import { createAddSubjectFormConfig } from "./AddSubject.formConfig";

export default function AddSubject() {
  const controller = useSubjectFormController();

  const formConfig = createAddSubjectFormConfig({
    isEditMode: controller.isEditMode,
    classOptions: controller.classOptions,
  });

  return (
    <BaseForm
      formConfig={formConfig}
      formData={controller.formData}
      setFormData={controller.setFormData}
      fieldErrors={controller.fieldErrors}
      handleChange={controller.handleChange}
      handleFieldValueChange={controller.handleFieldValueChange}
      handleSubmit={controller.handleSubmit}
      setFormError={controller.setError}
      onConfirmSubmit={controller.onConfirmSubmit}
      isEditMode={controller.isEditMode}
      loading={controller.loading}
      fetchLoading={controller.fetchLoading}
      error={controller.error}
      onErrorDismiss={() => controller.setError(null)}
      snackbar={controller.snackbar}
      onSnackbarClose={() => controller.setSnackbar(null)}
      onCancelNavigate={() => controller.navigate("/subjects")}
      confirmMessage={
        controller.isEditMode
          ? "Are you sure you want to update this subject?"
          : "Are you sure you want to create this subject?"
      }
      submitLabelCreate="Create Subject"
      submitLabelEdit="Save Changes"
      headerConfig={{
        links: [
          { title: "Subjects", path: "/subjects" },
          {
            title: controller.isEditMode ? "Edit Subject" : "Add Subject",
            path: "#",
          },
        ],
        homePath: "/",
      }}
    />
  );
}
