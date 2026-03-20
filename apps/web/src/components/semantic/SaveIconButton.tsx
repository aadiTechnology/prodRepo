/**
 * SaveIconButton — Semantic component
 * Icon-only save action for page headers (flat green, 40x40). Supports loading.
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
  const baseDisabled = disabled ?? loading;

  return (
    <IconButton
      aria-label="Save"
      disabled={baseDisabled}
      sx={[
        (theme) => ({
          backgroundColor: theme.palette.success.main,
          color: theme.palette.success.contrastText,
          borderRadius: 1.2,
          width: 40,
          height: 40,
          boxShadow: "none",
          border: "none",
          p: 0,
          m: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 0.2s ease",
          "&:hover": {
            backgroundColor: theme.palette.success.dark,
          },
          "&.Mui-disabled": {
            backgroundColor: theme.palette.grey[400],
            color: theme.palette.common.white,
            boxShadow: "none",
          },
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      {loading ? (
        <CircularProgress size={20} color="inherit" />
      ) : (
        <SaveIcon sx={{ fontSize: 19 }} />
      )}
    </IconButton>
  );
}