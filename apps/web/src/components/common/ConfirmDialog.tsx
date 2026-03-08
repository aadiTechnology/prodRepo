import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import { ReactNode } from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  /** Replace default message with custom content (e.g. interpolated text). */
  messageNode?: ReactNode;
  /** Optional warning block below message (e.g. Alert for soft-delete). */
  warningContent?: ReactNode;
  /** Confirm button color. Default "error". */
  confirmVariant?: "error" | "primary" | "warning";
}

export default function ConfirmDialog({
  open,
  title,
  message,
  messageNode,
  warningContent,
  confirmText,
  confirmVariant = "error",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {messageNode != null ? messageNode : <DialogContentText>{message}</DialogContentText>}
        {warningContent}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmVariant}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} /> : undefined}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}