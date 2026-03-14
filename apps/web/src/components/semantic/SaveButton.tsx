import { Button, CircularProgress, type ButtonProps } from "../primitives";
import type { SxProps, Theme } from "@mui/material/styles";

export interface SaveButtonProps extends Omit<ButtonProps, "children"> {
  children?: React.ReactNode;
  loading?: boolean;
}

export default function SaveButton({
  children = "Save",
  loading = false,
  disabled,
  startIcon,
  sx,
  ...props
}: SaveButtonProps) {
  const baseSx: SxProps<Theme> = (theme) => ({
    minWidth: 165,
    fontWeight: 750,
    borderRadius: 0,
    color: theme.palette.success.main,
    backgroundColor: "transparent",
    boxShadow: "none",
    border: "none",
    fontSize: "1.21rem",
    px: 4.4,
    py: 1.1,
    "&:hover": {
      backgroundColor: "transparent",
      textDecoration: "underline",
    },
    "&:disabled": {
      color: theme.palette.grey[400],
    },
  });

  const mergedSx: SxProps<Theme> = Array.isArray(sx)
    ? [baseSx, ...sx]
    : sx
    ? [baseSx, sx]
    : [baseSx];

  return (
    <Button
      variant="text"
      disabled={disabled ?? loading}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : startIcon}
      sx={mergedSx}
      {...props}
    >
      {children}
    </Button>
  );
}