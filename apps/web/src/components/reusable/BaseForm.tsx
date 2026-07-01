import { useId, useMemo, useState, type FormEvent } from "react";
import { Alert, Snackbar } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { FormHeaderIconAction, Box, CircularProgress } from "../primitives";
import { SaveButton, CancelButton } from "../semantic";
import { PageHeader } from "../layout";
import ConfirmDialog from "../semantic/ConfirmDialog";
import ValidationErrorDialog from "../semantic/ValidationErrorDialog";
import ListPageLayout from "./ListPageLayout";
import FormSectionLabel from "./FormSectionLabel";
import FormFieldRenderer from "./FormFieldRenderer";

import type {
  BaseFormProps,
  FormLayoutContext,
  FormRenderContext,
} from "./formFramework.types";

function runSubmit<T extends Record<string, unknown>>(
  e: FormEvent | React.MouseEvent,
  handleSubmit: BaseFormProps<T>["handleSubmit"],
  onValid: () => void,
  onInvalid: () => void
) {
  e.preventDefault();
  handleSubmit(e as FormEvent, onValid, onInvalid);
}

export default function BaseForm<T extends Record<string, unknown>>({
  formConfig,
  formData,
  setFormData,
  fieldErrors,
  handleChange,
  handleFieldValueChange,
  handleSubmit,
  setFormError,
  onConfirmSubmit,
  isEditMode,
  loading,
  fetchLoading = false,
  error,
  onErrorDismiss,
  snackbar,
  onSnackbarClose,
  headerConfig,
  onCancelNavigate,
  confirmMessage,
  submitLabelCreate = "Save",
  submitLabelEdit = "Save",
  headerRightBelowSlot,
  extraHeaderActions,
  formTopSlot,
  canSubmit = true,
  hideFooterActions = false,
  hideHeaderCancel = false,
  footerActionOrder = "cancel-first",
  gridSpacing = 2,
  pageTestId,
  formTestId,
  confirmDialogTestId,
}: BaseFormProps<T>) {
  const formId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fieldValidationOpen, setFieldValidationOpen] = useState(false);

  const fieldErrorItems = useMemo(() => {
    return Object.entries(fieldErrors)
      .filter(([, message]) => Boolean(message))
      .map(([name, message]) => {
        const label = formConfig.fields[name as keyof T & string]?.label ?? name;
        return `${label}: ${message}`;
      });
  }, [fieldErrors, formConfig.fields]);

  const showValidationDialog = Boolean(error) || fieldValidationOpen;
  const validationDialogMessage =
    error ??
    (fieldValidationOpen ? "Please fix the highlighted errors." : null);

  const closeValidationDialog = () => {
    onErrorDismiss();
    setFieldValidationOpen(false);
  };

  const openFieldValidationDialog = () => {
    setFieldValidationOpen(true);
  };

  const layoutCtx: FormLayoutContext = { isEditMode };

  const renderCtx: FormRenderContext<T> = {
    formData,
    fieldErrors,
    isEditMode,
    handleChange,
    handleFieldValueChange,
    setFormData,
    setError: setFormError,
  };

  const saveTooltip = isEditMode
    ? headerConfig.saveTooltipEdit ?? "Update Changes"
    : headerConfig.saveTooltipCreate ?? "Finish & Create";

  const cancelTooltip = headerConfig.cancelTooltip ?? "Cancel";

  const confirmText =
    typeof confirmMessage === "function" ? confirmMessage(layoutCtx) : confirmMessage;

  const openConfirmDialog = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    setConfirmOpen(true);
  };

  const handleFormSubmit = (e: FormEvent) =>
    runSubmit(e, handleSubmit, openConfirmDialog, openFieldValidationDialog);

  const handleConfirm = async () => {
    await onConfirmSubmit();
    window.setTimeout(() => setConfirmOpen(false), 0);
  };

  if (fetchLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <ListPageLayout
        pageBackground={true}
        contentPaddingSize="none"
        scrollableFormContent
        data-testid={pageTestId}
        header={
          <Box sx={{ mb: 2 }}>
            <PageHeader
              links={headerConfig.links}
              homePath={headerConfig.homePath ?? "/"}
              actions={
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  {!hideHeaderCancel ? (
                    <FormHeaderIconAction
                      variant="cancel"
                      onClick={onCancelNavigate}
                      tooltipTitle={cancelTooltip}
                    />
                  ) : null}
                  <FormHeaderIconAction
                    variant="save"
                    onClick={(e) =>
                      runSubmit(e, handleSubmit, openConfirmDialog, openFieldValidationDialog)
                    }
                    loading={loading}
                    disabled={!canSubmit}
                    tooltipTitle={saveTooltip}
                  />
                  {extraHeaderActions}
                </Box>
              }
            />
            {headerRightBelowSlot ? (
              <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
                {headerRightBelowSlot}
              </Box>
            ) : null}
          </Box>
        }
      >
        <form id={formId} onSubmit={handleFormSubmit} autoComplete="off" data-testid={formTestId}>
          {formTopSlot ? (
            <Box sx={{ mb: 2, px: { xs: 0, sm: 1 } }}>{formTopSlot}</Box>
          ) : null}
          <Grid container spacing={gridSpacing}>
            {formConfig.layoutRows.map((row, idx) => {
              const show = row.show?.(layoutCtx) ?? true;
              if (!show) return null;
              if (row.kind === "section") {
                return (
                  <Grid key={`section-${idx}`} size={row.grid ?? { xs: 12 }}>
                    <FormSectionLabel title={row.title} icon={row.icon} sx={{ mt: idx === 0 ? 0 : 2, mb: 0.5 }} />
                  </Grid>
                );
              }
              if (row.kind === "custom") {

                return (
                  <Grid key={`custom-${idx}`} size={row.grid}>
                    {row.render(renderCtx)}
                  </Grid>
                );
              }
              return (
                <Grid key={`fields-${idx}`} size={row.grid} sx={{ py: 0.75 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {row.fieldNames.map((fieldName) => {
                      const field = formConfig.fields[fieldName];
                      if (!field) return null;
                      return (
                        <FormFieldRenderer<T> key={String(fieldName)} field={field} ctx={renderCtx} />
                      );
                    })}
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {!hideFooterActions && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                justifyContent: "center",
                mt: 4,
              }}
            >
              {footerActionOrder === "cancel-first" ? (
                <>
                  <CancelButton type="button" onClick={onCancelNavigate} disabled={loading} data-testid="btn-cancel">
                    Cancel
                  </CancelButton>
                  <SaveButton type="submit" disabled={!canSubmit} loading={loading} data-testid="btn-save">
                    {isEditMode ? submitLabelEdit : submitLabelCreate}
                  </SaveButton>
                </>
              ) : (
                <>
                  <SaveButton type="submit" disabled={!canSubmit} loading={loading} data-testid="btn-save">
                    {isEditMode ? submitLabelEdit : submitLabelCreate}
                  </SaveButton>
                  <CancelButton type="button" onClick={onCancelNavigate} disabled={loading} data-testid="btn-cancel">
                    Cancel
                  </CancelButton>
                </>
              )}
            </Box>
          )}
        </form>
      </ListPageLayout>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={onSnackbarClose}
      >
        <Alert
          onClose={onSnackbarClose}
          severity="success"
          variant="filled"
          sx={{ width: "100%", borderRadius: "12px" }}
        >
          {snackbar}
        </Alert>
      </Snackbar>

      <ValidationErrorDialog
        open={showValidationDialog}
        onClose={closeValidationDialog}
        message={validationDialogMessage}
        items={fieldErrorItems}
        data-testid="validation-error-dialog"
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        message={confirmText}
        confirmLabel="Confirm"
        loading={loading}
        data-testid={confirmDialogTestId}
      />
    </>
  );
}
