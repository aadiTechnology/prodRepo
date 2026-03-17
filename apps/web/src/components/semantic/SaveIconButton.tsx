/**
 * SaveIconButton — Semantic component
 * Icon-only save action (AddTenant-style gradient, 44×44). Uses IconButton primitive; supports loading.
 */

import { IconButton } from "../primitives";
import { CircularProgress } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import type { IconButtonProps } from "@mui/material/IconButton";
import { alpha } from "@mui/material/styles";
import { colorTokens } from "../../tokens/colors";

export interface SaveIconButtonProps extends Omit<IconButtonProps, "children"> {
  loading?: boolean;
}

export default function SaveIconButton({
  loading = false,
  disabled,
  sx,
  ...props
}: SaveIconButtonProps) {
  const baseDisabled = disabled ?? loading;

  return (
    <IconButton
      aria-label="Save"
      disabled={baseDisabled}
      sx={[
        (theme) => ({
          background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          color: "white",
          borderRadius: "12px",
          width: 44,
          height: 44,
          boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
          border: "none",
          p: 0,
          m: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.4)}`,
          },
          "&.Mui-disabled": {
            background: "#e2e8f0",
            color: "#94a3b8",
            boxShadow: "none",
            transform: "none",
          },
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      {loading ? (
        <CircularProgress size={20} color="inherit" />
      ) : (
        <SaveIcon sx={{ fontSize: 20 }} />
      )}
    </IconButton>
  );
}