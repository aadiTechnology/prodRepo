import BaseForm from "../../components/reusable/BaseForm";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useHolidayFormController } from "./useHolidayFormController";

export default function HolidayForm() {
  const c = useHolidayFormController();

  return (
    <>
      <BaseForm
        formConfig={c.formConfig}
        formData={c.formData}
        setFormData={c.setFormData}
        fieldErrors={c.fieldErrors}
        handleChange={c.handleChange}
        handleFieldValueChange={c.handleFieldValueChange}
        handleSubmit={c.handleSubmit}
        setFormError={c.setError}
        onConfirmSubmit={c.handleConfirmSubmit}
        isEditMode={c.isEditMode}
        loading={c.loading}
        fetchLoading={c.fetchLoading}
        error={c.error}
        onErrorDismiss={() => c.setError(null)}
        snackbar={null}
        onSnackbarClose={() => {}}
        headerConfig={{
          links: [
            { title: "Academic Management", path: "/academics/configuration/holidays" },
            { title: c.pageTitle, path: "#" },
          ],
          homePath: "/",
          cancelTooltip: "Cancel",
          saveTooltipCreate: "Save",
          saveTooltipEdit: "Save",
        }}
        onCancelNavigate={c.requestCancel}
        confirmMessage={(ctx) =>
          ctx.isEditMode ? "Save changes to this holiday?" : "Create this holiday?"
        }
        formTopSlot={c.formTopSlot}
        canSubmit={c.canSubmit}
      />

      <ConfirmDialog
        open={c.cancelConfirmOpen}
        title="Discard changes?"
        message="You have unsaved changes. Leave without saving?"
        confirmText="Discard"
        onCancel={() => c.setCancelConfirmOpen(false)}
        onConfirm={c.confirmDiscardAndLeave}
      />
    </>
  );
}
