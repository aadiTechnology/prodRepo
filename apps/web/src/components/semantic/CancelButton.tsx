import { Button, type ButtonProps } from "../primitives";
import type { SxProps, Theme } from "@mui/material/styles";

export interface CancelButtonProps extends Omit<ButtonProps, "children"> {
  children?: React.ReactNode;
}

export default function CancelButton({
  children = "Cancel",
  variant = "text",
  sx,
  ...props
}: CancelButtonProps) {
  const baseSx: SxProps<Theme> = (theme) => ({
    minWidth: 132,
    fontWeight: 700,
    borderRadius: 0,
    color: theme.palette.error.main,
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
    <Button variant={variant} sx={mergedSx} {...props}>
      {children}
    </Button>
  );
}