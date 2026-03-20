/**
 * CloseIconButton — Semantic component
 * Discard/cancel icon action for page headers (flat red, 40x40).
 */

import { IconButton } from "../primitives";
import CancelIcon from "@mui/icons-material/Cancel";
import type { IconButtonProps } from "@mui/material/IconButton";

export interface CloseIconButtonProps extends Omit<IconButtonProps, "children"> {}

export default function CloseIconButton({ sx, ...props }: CloseIconButtonProps) {
  return (
    <IconButton
      aria-label="Close"
      sx={[
        (theme) => ({
          color: theme.palette.error.main,
          backgroundColor: theme.palette.error.light,
          borderRadius: 1.2,
          width: 40,
          height: 40,
          p: 0,
          m: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "none",
          transition: "background-color 0.2s ease",
          "&:hover": {
            backgroundColor: theme.palette.error.light,
          },
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      <CancelIcon sx={{ fontSize: 21 }} />
    </IconButton>
  );
}