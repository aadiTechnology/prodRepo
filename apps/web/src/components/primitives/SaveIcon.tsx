/**
 * SaveIcon — UI Primitive
 * Gradient submit action with optional loading spinner (header/toolbar pattern).
 */

import { Tooltip, alpha } from "@mui/material";
import { Save as MuiSaveIcon } from "@mui/icons-material";
import IconButton from "./IconButton";
import CircularProgress from "./CircularProgress";
import { colorTokens } from "../../tokens/colors";
import type { IconButtonProps } from "./IconButton";

export interface SaveIconProps extends Omit<IconButtonProps, "children"> {
  tooltipTitle?: string;
  loading?: boolean;
}

export default function SaveIcon({
  tooltipTitle = "Finish & Create",
  loading = false,
  disabled,
  sx,
  ...props
}: SaveIconProps) {
  const baseDisabled = disabled ?? loading;

  return (
    <Tooltip title={tooltipTitle}>
      <IconButton
        {...props}
        disabled={baseDisabled}
        sx={[
          {
            background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
            color: "white",
            borderRadius: "12px",
            width: 44,
            height: 44,
            boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.4)}`,
            },
            "&.Mui-disabled": { background: "#e2e8f0", color: "#94a3b8" },
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        {loading ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <MuiSaveIcon sx={{ fontSize: 20 }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
