/**
 * CloseIconButton — Semantic component
 * Icon-only close/cancel action (red tint, 48x48). Uses IconButton primitive.
 */

import { IconButton } from "../primitives";
import CloseIcon from "@mui/icons-material/Close";
import type { IconButtonProps } from "@mui/material/IconButton";

export interface CloseIconButtonProps extends Omit<IconButtonProps, "children"> {}

export default function CloseIconButton({ sx, ...props }: CloseIconButtonProps) {
  return (
    <IconButton
      aria-label="Close"
      sx={[
        {
          color: "#fff",
          backgroundColor: "#fee2e2",
          borderRadius: "12px",
          width: 48,
          height: 48,
          boxShadow: "0 2px 8px 0 rgba(239,68,68,0.10)",
          border: "none",
          p: 0,
          m: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s, color 0.2s",
          "&:hover": {
            backgroundColor: "#fecaca",
            color: "#fff",
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      <CloseIcon sx={{ fontSize: 24, color: "#ef4444", bgcolor: "#fff", borderRadius: "50%", p: 0.375 }} />
    </IconButton>
  );
}