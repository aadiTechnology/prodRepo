import type { ReactNode } from "react";
import type { NavLink } from "../layout";
/**
 * Grid size for MUI Grid2 `size` prop (responsive breakpoints).
 */
export type FormGridSize = {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
};

export type FormLayoutContext = {
  isEditMode: boolean;
};

export type FormFieldType =
  | "text"
  | "email"
  | "password"
  | "select"
  | "switch"
  | "phone"
  | "custom"
  | "date";

export type FormRenderContext<T extends Record<string, unknown>> = {
  formData: T;
  fieldErrors: Partial<Record<keyof T & string, string>>;
  isEditMode: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleFieldValueChange: (name: keyof T & string, value: unknown) => void;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  setError: (msg: string | null) => void;
};

export type FormFieldConfig<T extends Record<string, unknown>> = {
  name: keyof T & string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  /** When false, field is omitted (defaults to true). */
  conditionalRender?: (ctx: FormLayoutContext) => boolean;
  /** Passed through to the underlying semantic component (e.g. htmlInput, disabled, options). */
  props?: Record<string, unknown>;
  /** Static helper or resolver; string errors from validation still apply when helper returns undefined. */
  helperText?: string | ((ctx: FormRenderContext<T>) => string | undefined);
  /** When type is `custom`, renders this instead of a mapped input. */
  render?: (ctx: FormRenderContext<T>) => ReactNode;
};

export type FormLayoutRow<T extends Record<string, unknown>> =
  | {
      kind: "fields";
      grid: FormGridSize;
      fieldNames: (keyof T & string)[];
      show?: (ctx: FormLayoutContext) => boolean;
    }
  | {
      kind: "custom";
      grid: FormGridSize;
      render: (ctx: FormRenderContext<T>) => ReactNode;
      show?: (ctx: FormLayoutContext) => boolean;
    };

export type FormConfig<T extends Record<string, unknown>> = {
  fields: Partial<Record<keyof T & string, FormFieldConfig<T>>>;
  layoutRows: FormLayoutRow<T>[];
};

export type BaseFormHeaderConfig = {
  links: NavLink[];
  homePath?: string;
  cancelTooltip?: string;
  saveTooltipCreate?: string;
  saveTooltipEdit?: string;
};

export type BaseFormProps<T extends Record<string, unknown>> = {
  formConfig: FormConfig<T>;
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  fieldErrors: Partial<Record<keyof T & string, string>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleFieldValueChange: (name: keyof T & string, value: unknown) => void;
  handleSubmit: (e: React.FormEvent, onValid?: () => void) => void;
  /** For custom slots (e.g. upload validation) to set the same banner error as the page. */
  setFormError: (msg: string | null) => void;
  onConfirmSubmit: () => Promise<void>;
  isEditMode: boolean;
  loading: boolean;
  fetchLoading?: boolean;
  error: string | null;
  onErrorDismiss: () => void;
  snackbar: string | null;
  onSnackbarClose: () => void;
  headerConfig: BaseFormHeaderConfig;
  onCancelNavigate: () => void;
  confirmMessage: string | ((ctx: FormLayoutContext) => string);
  /** Bottom actions + optional header save use the same labels. */
  submitLabelCreate?: string;
  submitLabelEdit?: string;
  /** Rendered inside the form above the main field grid (e.g. contextual selectors). */
  formTopSlot?: ReactNode;
  /** Custom flag to disable the save/submit actions (e.g. permission check). Defaults to true. */
  canSubmit?: boolean;
};
