/**
 * UI Primitives — Single layer that imports @mui/material
 * Building blocks for pages and components. All styling from theme/tokens.
 *
 * Flow: Design Tokens → Theme → Primitive Components → Semantic → Patterns → Screens
 */

export { default as PageContainer } from "./PageContainer";
export type { PageContainerProps } from "./PageContainer";

export { default as AppCard } from "./AppCard";
export type { AppCardProps, AppCardPaddingSize } from "./AppCard";

export { default as Section } from "./Section";
export type { SectionProps } from "./Section";

export { default as Stack } from "./Stack";
export type { PrimitiveStackProps } from "./Stack";

export { Box } from "./Box";
export type { BoxProps } from "./Box";

export { default as Button } from "./Button";
export type { ButtonProps } from "./Button";

export { default as Typography } from "./Typography";
export type { TypographyProps } from "./Typography";

export { default as TextField } from "./TextField";
export type { TextFieldProps } from "./TextField";

export { default as Select } from "./Select";
export type { SelectProps } from "./Select";

export { default as Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "./Dialog";
export type {
  DialogProps,
  DialogTitleProps,
  DialogContentProps,
  DialogContentTextProps,
  DialogActionsProps,
} from "./Dialog";

export { Tabs, Tab } from "./Tabs";
export type { TabsProps, TabProps } from "./Tabs";

export { default as IconButton } from "./IconButton";
export type { IconButtonProps } from "./IconButton";

export { InputAdornment } from "./InputAdornment";
export type { InputAdornmentProps } from "./InputAdornment";

export { default as CircularProgress } from "./CircularProgress";
export type { CircularProgressProps } from "./CircularProgress";

export { FormControlLabel } from "./FormControlLabel";
export type { FormControlLabelProps } from "./FormControlLabel";

/** Re-exported for layers that must not import @mui/material (e.g. patterns, semantic). */
export type { SxProps, Theme } from "@mui/material";
