/**
 * CloseIconButton — Semantic component
 * Discard/cancel icon action (coral tint, 44×44). Matches AddTenant discard style.
 */

import { IconButton } from "../primitives";
import CancelIcon from "@mui/icons-material/Cancel";
import { alpha } from "@mui/material";
import type { IconButtonProps } from "@mui/material/IconButton";
import { colorTokens } from "../../tokens/colors";

const coral = colorTokens.preschool.coral.main;

export interface CloseIconButtonProps extends Omit<IconButtonProps, "children"> {}

export default function CloseIconButton({ sx, ...props }: CloseIconButtonProps) {
  return (
    <IconButton
      aria-label="Close"
      sx={[
        {
          color: coral,
          backgroundColor: alpha(coral, 0.08),
          borderRadius: "12px",
          width: 44,
          height: 44,
          border: `1.5px solid ${alpha(coral, 0.2)}`,
          p: 0,
          m: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s, color 0.2s, border-color 0.2s",
          "&:hover": {
            backgroundColor: alpha(coral, 0.15),
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      <CancelIcon sx={{ fontSize: 22 }} />
    </IconButton>
  );
}