/**
 * Add / Edit Menu Page
 *
 * Allows System Admins to create or edit a Menu entry:
 *   - Module  (level = 1) — top-level navigation group
 *   - Page    (level = 2) — child screen inside a module
 *
 * Routes:
 *   /admin/menus/add          → create mode
 *   /admin/menus/:id/edit     → edit mode
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import menuService, {
  type MenuRecord,
  type MenuUpdatePayload,
} from "../../api/services/menuService";
import {
  createAddMenuFormConfig,
  type AddMenuFormData,
} from "./AddMenuPage.formConfig";
import { normalizeMenuPath } from "../../utils/menuNavigation";

// ── Default / empty form ──────────────────────────────────────────────────────

const emptyForm = (): AddMenuFormData => ({
  name: "",
  menu_type: "module",
  parent_id: "",
  path: "",
  icon: "",
  sort_order: "0",
  is_active: true,
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddMenuPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  // ── State ──────────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [modules, setModules] = useState<MenuRecord[]>([]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validationConfig = useMemo<FormValidationConfig<AddMenuFormData>>(
    () => ({
      name: [
        { type: "required", message: "Name is required." },
        { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
      ],
      menu_type: [{ type: "required", message: "Please select a type." }],
    }),
    []
  );

  // ── Form manager ───────────────────────────────────────────────────────────

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<AddMenuFormData>({
    initialValues: useMemo(() => emptyForm(), []),
    validationConfig,
    onClearError: () => setError(null),
  });

  // ── Fetch modules list (for parent selector) ───────────────────────────────

  const fetchModules = useCallback(async () => {
    try {
      const data = await menuService.getModules();
      setModules(data);
    } catch {
      // Non-fatal — parent selector will show "no modules" message
    }
  }, []);

  useEffect(() => {
    void fetchModules();
  }, [fetchModules]);

  // ── Fetch existing menu in edit mode ───────────────────────────────────────

  const fetchMenu = useCallback(async () => {
    if (!id) return;
    setFetchLoading(true);
    try {
      const menu = await menuService.getMenuById(Number(id));
      setFormData({
        name: menu.name ?? "",
        menu_type: menu.level === 2 ? "page" : "module",
        parent_id: menu.parent_id != null ? String(menu.parent_id) : "",
        path: menu.path ?? "",
        icon: menu.icon ?? "",
        sort_order: String(menu.sort_order ?? 0),
        is_active: menu.is_active ?? true,
      });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to load menu.";
      setError(msg);
    } finally {
      setFetchLoading(false);
    }
  }, [id, setFormData]);

  useEffect(() => {
    if (isEditMode) void fetchMenu();
  }, [fetchMenu, isEditMode]);

  // ── Form config ────────────────────────────────────────────────────────────

  const formConfig = useMemo(
    () =>
      createAddMenuFormConfig({
        isEditMode,
        modules,
        parentIdError: fieldErrors.parent_id,
      }),
    [isEditMode, modules, fieldErrors.parent_id]
  );

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleConfirmSubmit = async () => {
    if (formData.menu_type === "page" && !formData.parent_id) {
      setFieldErrors((prev) => ({
        ...prev,
        parent_id: "Please select a parent module.",
      }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const level = formData.menu_type === "page" ? 2 : 1;
      const sortOrder = parseInt(formData.sort_order, 10);
      const normalizedPath = normalizeMenuPath(formData.path);

      if (isEditMode && id) {
        const updatePayload: MenuUpdatePayload = {
          name: formData.name.trim(),
          path: normalizedPath,
          icon: formData.icon.trim() || null,
          sort_order: isNaN(sortOrder) ? 0 : sortOrder,
          is_active: formData.is_active,
          parent_id:
            formData.menu_type === "page" && formData.parent_id
              ? parseInt(formData.parent_id, 10)
              : undefined,
        };
        await menuService.updateMenu(Number(id), updatePayload);
        setSnackbar(`${level === 1 ? "Module" : "Page"} updated successfully.`);
      } else {
        await menuService.createMenu({
          name: formData.name.trim(),
          path: normalizedPath,
          icon: formData.icon.trim() || null,
          sort_order: isNaN(sortOrder) ? 0 : sortOrder,
          level,
          parent_id:
            formData.menu_type === "page" && formData.parent_id
              ? parseInt(formData.parent_id, 10)
              : null,
          is_active: true,
        });
        setSnackbar(`${level === 1 ? "Module" : "Page"} created successfully.`);
      }

      setTimeout(
        () => navigate("/admin/permission-management", { state: { fromEdit: true } }),
        600
      );
    } catch (err: unknown) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      if (apiFieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      }
      setError(
        message ||
          (isEditMode ? "Failed to update menu." : "Failed to create menu.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Derived label ──────────────────────────────────────────────────────────

  const typeLabel = isEditMode
    ? "Edit"
    : formData.menu_type === "page"
    ? "Add Page"
    : "Add Module";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <BaseForm<AddMenuFormData>
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
      fetchLoading={fetchLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Permission Management", path: "/admin/permission-management" },
          { title: typeLabel, path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Create",
        saveTooltipEdit: "Update",
      }}
      onCancelNavigate={() => navigate("/admin/permission-management")}
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this menu entry?"
          : `Are you sure you want to create this ${
              formData.menu_type === "page" ? "page" : "module"
            }?`
      }
    />
  );
}
