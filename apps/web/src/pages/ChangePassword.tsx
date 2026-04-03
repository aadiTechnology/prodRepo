
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormManager } from "../hooks";
import BaseForm from "../components/reusable/BaseForm";
import { mapApiErrorsToFields } from "../utils/formValidation";
import { newPasswordRules, confirmPasswordMatchRules } from "../utils/formValidationPresets";
import { createChangePasswordFormConfig, type ChangePasswordFormData } from "./ChangePassword.formConfig";

// Service for password change
const changePasswordService = {
  changePassword: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch("/api/account/change-password", {
      method: "POST",
      headers,
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { response: { data: error } };
    }
    return response.json();
  },
};

export default function ChangePassword() {
  const navigate = useNavigate();
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
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const formConfig = useMemo(() => createChangePasswordFormConfig({ isEditMode }), [isEditMode]);

  const handleConfirmSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await changePasswordService.changePassword({
        currentPassword: formData.current_password,
        newPassword: formData.new_password,
      });
      setSnackbar("Password changed successfully.");
      setTimeout(() => navigate("/profile"), 1000);
    } catch (err) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      setError(message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }, [formData, navigate, setFieldErrors]);

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
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
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