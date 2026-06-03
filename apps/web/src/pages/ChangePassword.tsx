import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { useFormManager } from "../hooks";
import BaseForm from "../components/reusable/BaseForm";
import userService from "../api/services/userService";
import { mapApiErrorsToFields } from "../utils/formValidation";
import { newPasswordRules, confirmPasswordMatchRules } from "../utils/formValidationPresets";
import { createChangePasswordFormConfig, type ChangePasswordFormData } from "./ChangePassword.formConfig";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const isEditMode = false; // Change password is always create mode for self

  const initialValues = useMemo<ChangePasswordFormData>(
    () => ({
      current_password: "",
      new_password: "",
      confirm_password: "",
      is_active: true,
    }),
    []
  );

  const validationConfig = useMemo(() => ({
    current_password: [
      { type: "required" as const, message: "Required." },
      { type: "minLength" as const, value: 6, message: "Min 6 characters." },
    ],
    new_password: newPasswordRules<ChangePasswordFormData>(),
    confirm_password: confirmPasswordMatchRules<ChangePasswordFormData>("new_password"),
  }), []);

  const dependentFieldPairs = useMemo(() => [["new_password", "confirm_password"]] as const, []);

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<ChangePasswordFormData>({
    initialValues,
    validationConfig,
    dependentFieldPairs,
    onClearError: () => setError(null),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formConfig = useMemo(() => createChangePasswordFormConfig({ isEditMode }), [isEditMode]);

  const handleConfirmSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await userService.changeOwnPassword({
        currentPassword: formData.current_password,
        newPassword: formData.new_password,
      });
      if (!result.success) {
        setError(result.message || "Failed to change password.");
        return;
      }
      enqueueSnackbar(result.message || "Password changed successfully.", {
        variant: "success",
        autoHideDuration: 3000,
        anchorOrigin: { vertical: "top", horizontal: "center" },
      });
      setTimeout(() => navigate("/profile"), 1000);
    } catch (err) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      setError(message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }, [formData, navigate, setFieldErrors, enqueueSnackbar]);

  return (
    <BaseForm<ChangePasswordFormData>
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
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      useErrorSnackbar
      snackbar={null}
      onSnackbarClose={() => {}}
      headerConfig={{
        links: [
          { title: "Profile", path: "/profile" },
          { title: "Change Password", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Save",
      }}
      onCancelNavigate={() => navigate("/profile")}
      confirmMessage={() => "Are you sure you want to change your password?"}
    />
  );
}