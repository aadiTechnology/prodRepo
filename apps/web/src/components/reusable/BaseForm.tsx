import { useId, useState, type FormEvent } from "react";
import { Alert, Snackbar } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { FormHeaderIconAction, Box, CircularProgress } from "../primitives";
import { SaveButton, CancelButton } from "../semantic";
import { PageHeader } from "../layout";
import ConfirmDialog from "../semantic/ConfirmDialog";
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
  onValid: () => void
) {
  e.preventDefault();
  handleSubmit(e as FormEvent, onValid);
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
  footerActionOrder = "cancel-first",
  useErrorSnackbar = false,
  gridSpacing = 2,
}: BaseFormProps<T>) {
  const formId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const onValid = () => setConfirmOpen(true);

  const handleFormSubmit = (e: FormEvent) => runSubmit(e, handleSubmit, onValid);

  const handleConfirm = async () => {
    setConfirmOpen(false);
    await onConfirmSubmit();
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
        header={
          <Box sx={{ mb: 2 }}>
            <PageHeader
              links={headerConfig.links}
              homePath={headerConfig.homePath ?? "/"}
              actions={
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  <FormHeaderIconAction
                    variant="cancel"
                    onClick={onCancelNavigate}
                    tooltipTitle={cancelTooltip}
                  />
                  <FormHeaderIconAction
                    variant="save"
                    onClick={(e) => runSubmit(e, handleSubmit, onValid)}
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
            {error && !useErrorSnackbar && (
              <Alert
                severity="error"
                variant="filled"
                sx={{ mt: 2, borderRadius: "12px" }}
                onClose={onErrorDismiss}
              >
                {error}
              </Alert>
            )}
          </Box>
        }
      >
        <form id={formId} onSubmit={handleFormSubmit} autoComplete="off">
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
                  <CancelButton onClick={onCancelNavigate} disabled={loading}>
                    Cancel
                  </CancelButton>
                  <SaveButton type="submit" disabled={!canSubmit} loading={loading}>
                    {isEditMode ? submitLabelEdit : submitLabelCreate}
                  </SaveButton>
                </>
              ) : (
                <>
                  <SaveButton type="submit" disabled={!canSubmit} loading={loading}>
                    {isEditMode ? submitLabelEdit : submitLabelCreate}
                  </SaveButton>
                  <CancelButton onClick={onCancelNavigate} disabled={loading}>
                    Cancel
                  </CancelButton>
                </>
              )}
            </Box>
          )}
        </form>
      </ListPageLayout>

      <Snackbar
        open={!!snackbar || (!!error && useErrorSnackbar)}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={snackbar ? onSnackbarClose : onErrorDismiss}
      >
        <Alert
          onClose={snackbar ? onSnackbarClose : onErrorDismiss}
          severity={snackbar ? "success" : "error"}
          variant="filled"
          sx={{ width: "100%", borderRadius: "12px" }}
        >
          {snackbar || error}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        message={confirmText}
        confirmLabel="Confirm"
        loading={loading}
      />
    </>
  );
}
