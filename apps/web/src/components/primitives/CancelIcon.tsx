/**
 * CancelIcon — UI Primitive
 * Coral-styled discard action (header/toolbar pattern).
 */

import { Tooltip, alpha } from "@mui/material";
import { Cancel as MuiCancelIcon } from "@mui/icons-material";
import IconButton from "./IconButton";
import { colorTokens } from "../../tokens/colors";
import type { IconButtonProps } from "./IconButton";

export interface CancelIconProps extends Omit<IconButtonProps, "children"> {
  tooltipTitle?: string;
}

export default function CancelIcon({
  tooltipTitle = "Discard Changes",
  sx,
  ...props
}: CancelIconProps) {
  return (
    <Tooltip title={tooltipTitle}>
      <IconButton
        {...props}
        sx={[
          {
            color: colorTokens.preschool.coral.main,
            backgroundColor: alpha(colorTokens.preschool.coral.main, 0.08),
            borderRadius: "12px",
            width: 44,
            height: 44,
            border: `1.5px solid ${alpha(colorTokens.preschool.coral.main, 0.2)}`,
            "&:hover": { backgroundColor: alpha(colorTokens.preschool.coral.main, 0.15) },
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        <MuiCancelIcon sx={{ fontSize: 22 }} />
      </IconButton>
    </Tooltip>
  );
}
