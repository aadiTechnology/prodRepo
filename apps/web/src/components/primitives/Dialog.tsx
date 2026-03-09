/**
 * Dialog — UI Primitive
 * Single point of access to MUI Dialog. Theme-driven (borderRadius, paper).
 * Encapsulates Dialog shell; use DialogTitle, DialogContent, DialogActions from MUI via this layer
 * or compose in pattern components.
 */

import {
  Dialog as MuiDialog,
  DialogProps as MuiDialogProps,
  DialogTitle as MuiDialogTitle,
  DialogContent as MuiDialogContent,
  DialogContentText as MuiDialogContentText,
  DialogActions as MuiDialogActions,
} from "@mui/material";

export type DialogProps = MuiDialogProps;
export type DialogTitleProps = React.ComponentProps<typeof MuiDialogTitle>;
export type DialogContentProps = React.ComponentProps<typeof MuiDialogContent>;
export type DialogContentTextProps = React.ComponentProps<typeof MuiDialogContentText>;
export type DialogActionsProps = React.ComponentProps<typeof MuiDialogActions>;

export function Dialog({ PaperProps, ...props }: DialogProps) {
  return (
    <MuiDialog
      PaperProps={PaperProps}
      {...props}
    />
  );
}

export const DialogTitle = MuiDialogTitle;
export const DialogContent = MuiDialogContent;
export const DialogContentText = MuiDialogContentText;
export const DialogActions = MuiDialogActions;
