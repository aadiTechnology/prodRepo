/**
 * SaveIconButton — Semantic component
 * Icon-only save action (green, 48x48). Uses IconButton primitive; supports loading state.
 */

import { IconButton } from "../primitives";
import { CircularProgress } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import type { IconButtonProps } from "@mui/material/IconButton";

export interface SaveIconButtonProps extends Omit<IconButtonProps, "children"> {
  loading?: boolean;
}

export default function SaveIconButton({
  loading = false,
  disabled,
  sx,
  ...props
}: SaveIconButtonProps) {
  return (
    <IconButton
      aria-label="Save"
      disabled={disabled ?? loading}
      sx={[
        (theme) => ({
          color: theme.palette.success.contrastText,
          backgroundColor: theme.palette.success.main,
          borderRadius: 1.5,
          width: 48,
          height: 48,
          boxShadow: theme.shadows[2],
          border: "none",
          p: 0,
          m: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s, color 0.2s",
          "&:hover": {
            backgroundColor: theme.palette.success.light,
            color: theme.palette.success.contrastText,
          },
          "&:disabled": {
            backgroundColor: theme.palette.grey[400],
            color: theme.palette.grey[500],
          },
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      {loading ? (
        <CircularProgress size={24} color="inherit" />
      ) : (
        <SaveIcon sx={(theme) => ({ fontSize: 24, color: theme.palette.success.contrastText })} />
      )}
    </IconButton>
  );
}