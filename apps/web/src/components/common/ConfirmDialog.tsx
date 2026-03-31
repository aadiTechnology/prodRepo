import { ReactNode } from "react";
import SemanticConfirmDialog from "../semantic/ConfirmDialog";

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
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <SemanticConfirmDialog
      open={open}
      onClose={onCancel}
      onConfirm={onConfirm}
      title={title}
      message={message}
      messageNode={messageNode}
      warningContent={warningContent}
      confirmLabel={confirmText}
      loading={loading}
    />
  );
}
