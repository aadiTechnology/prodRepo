/**
 * Form configuration for the Add / Edit Menu (Module or Page) form.
 *
 * Terminology:
 *   Module = level-1 menu  (top-level navigation group)
 *   Page   = level-2 menu  (child screen inside a module)
 *
 * Layout (2-column grid on sm+):
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  Menu Identity                                        │ ← section
 *   │  [Type            (sm:6)] [Name          (sm:6)]     │
 *   │  [Parent Module   (xs:12, only type=page)]            │
 *   ├──────────────────────────────────────────────────────┤
 *   │  Navigation Details                                   │ ← section
 *   │  [URL Path        (sm:6)] [Icon          (sm:6)]     │
 *   │  [Sort Order      (sm:6)] [Active toggle (sm:6 edit)]│
 *   └──────────────────────────────────────────────────────┘
 */

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
} from "@mui/material";
import type { FormConfig } from "../../components/reusable/formFramework.types";
import type { MenuRecord } from "../../api/services/menuService";

// ── Form data shape ───────────────────────────────────────────────────────────

export type AddMenuFormData = {
  name: string;
  menu_type: "module" | "page";
  parent_id: string;   // string for <select>; coerced to int on submit
  path: string;
  icon: string;
  sort_order: string;  // string for numeric input; coerced to int on submit
  is_active: boolean;
};

// ── Factory args ──────────────────────────────────────────────────────────────

type AddMenuFormConfigArgs = {
  isEditMode: boolean;
  /** Active level-1 menus; used as parent options when type = Page. */
  modules: MenuRecord[];
  /** Field-level error for parent_id (passed through from validation). */
  parentIdError?: string;
};

// ── Config factory ────────────────────────────────────────────────────────────

export function createAddMenuFormConfig({
  isEditMode,
  modules,
  parentIdError,
}: AddMenuFormConfigArgs): FormConfig<AddMenuFormData> {
  return {
    fields: {
      menu_type: {
        name: "menu_type",
        label: "Type",
        type: "select",
        required: true,
        props: {
          disableWhenEmpty: false,
          disabled: isEditMode,
          options: [
            { id: "module", value: "module", label: "Module — top-level group" },
            { id: "page",   value: "page",   label: "Page — inside a module"   },
          ],
        },
        helperText: isEditMode
          ? "Type cannot be changed after creation."
          : "Module creates a top-level group; Page adds a screen inside a module.",
      },

      name: {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "e.g. User Management",
        required: true,
        props: { htmlInput: { minLength: 2, maxLength: 150 } },
      },

      path: {
        name: "path",
        label: "URL Path",
        type: "text",
        placeholder: "e.g. /users",
        props: { htmlInput: { maxLength: 300 } },
        helperText: "Frontend route shown in the browser address bar.",
      },

      icon: {
        name: "icon",
        label: "Icon",
        type: "text",
        placeholder: "e.g. PeopleOutline",
        props: { htmlInput: { maxLength: 100 } },
        helperText: "Material UI icon name (PascalCase).",
      },

      sort_order: {
        name: "sort_order",
        label: "Sort Order",
        type: "text",
        placeholder: "0",
        props: { htmlInput: { type: "number", min: 0, max: 9999 } },
        helperText: "Lower numbers appear first in navigation.",
      },

      is_active: {
        name: "is_active",
        label: "Active",
        type: "switch",
        conditionalRender: () => isEditMode,
      },
    },

    layoutRows: [
      // ── Section: Menu Identity ─────────────────────────────────────────────
      {
        kind: "section",
        title: "Menu Identity",
      },

      // Type (left) + Name (right) — always visible, always paired
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["menu_type"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["name"],
      },

      // Parent Module — full-width row, only rendered when type = "page"
      {
        kind: "custom",
        grid: { xs: 12, sm: 6 },
        show: () => true,
        render: (ctx) => {
          if (ctx.formData.menu_type !== "page") return null;
          return (
            <FormControl fullWidth error={Boolean(parentIdError)} required>
              <InputLabel id="parent-module-label">Parent Module</InputLabel>
              <Select
                labelId="parent-module-label"
                label="Parent Module"
                value={ctx.formData.parent_id}
                onChange={(e) =>
                  ctx.handleFieldValueChange("parent_id", e.target.value)
                }
                disabled={isEditMode}
              >
                {modules.length === 0 && (
                  <MenuItem disabled value="">
                    <Typography variant="body2" color="text.secondary">
                      No modules found — create a Module first.
                    </Typography>
                  </MenuItem>
                )}
                {modules.map((m) => (
                  <MenuItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
              {parentIdError && (
                <FormHelperText>{parentIdError}</FormHelperText>
              )}
              {!parentIdError && isEditMode && (
                <FormHelperText>
                  Parent module cannot be changed after creation.
                </FormHelperText>
              )}
            </FormControl>
          );
        },
      },

      // ── Section: Navigation Details ────────────────────────────────────────
      {
        kind: "section",
        title: "Navigation Details",
      },

      // Path (left) + Icon (right)
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["path"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["icon"],
      },

      // Sort Order (left) + Active toggle (right, edit mode only)
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["sort_order"],
      },
      {
        kind: "fields",
        grid: { xs: 12, sm: 6 },
        fieldNames: ["is_active"],
        show: (c) => c.isEditMode,
      },
    ],
  };
}
