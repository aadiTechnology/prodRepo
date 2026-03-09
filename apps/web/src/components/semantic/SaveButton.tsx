/**
 * SaveButton — Semantic component
 * Represents "save" intent. Uses Button primitive; encapsulates label, variant, and optional loading.
 */

import { Button, CircularProgress, type ButtonProps } from "../primitives";

export interface SaveButtonProps extends Omit<ButtonProps, "children"> {
  children?: React.ReactNode;
  loading?: boolean;
}

export default function SaveButton({
  children = "Save",
  loading = false,
  disabled,
  startIcon,
  ...props
}: SaveButtonProps) {
  return (
    <Button
      variant="contained"
      color="primary"
      disabled={disabled ?? loading}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : startIcon}
      {...props}
    >
      {children}
    </Button>
  );
}
