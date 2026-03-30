/**
 * FormHeaderIconAction — UI Primitive
 * Paired discard / submit icon actions for page headers (coral cancel + gradient save, optional loading on save).
 */

import { Tooltip, alpha } from "@mui/material";
import { Cancel as CancelGlyph, Save as SaveGlyph } from "@mui/icons-material";
import IconButton from "./IconButton";
import CircularProgress from "./CircularProgress";
import { colorTokens } from "../../tokens/colors";
import type { IconButtonProps } from "./IconButton";
import type { Theme } from "@mui/material/styles";

type Base = Omit<IconButtonProps, "children">;

export type FormHeaderIconActionProps =
  | (Base & {
      variant: "cancel";
      tooltipTitle?: string;
    })
  | (Base & {
      variant: "save";
      tooltipTitle?: string;
      loading?: boolean;
    });

const cancelButtonSx = {
  color: colorTokens.preschool.coral.main,
  backgroundColor: alpha(colorTokens.preschool.coral.main, 0.08),
  borderRadius: "12px",
  width: 44,
  height: 44,
  border: `1.5px solid ${alpha(colorTokens.preschool.coral.main, 0.2)}`,
  "&:hover": { backgroundColor: alpha(colorTokens.preschool.coral.main, 0.15) },
} as const;

const saveButtonSx = (theme: Theme) => ({
  color: theme.palette.success.main,
  backgroundColor: alpha(theme.palette.success.main, 0.08),
  borderRadius: "12px",
  width: 44,
  height: 44,
  border: `1.5px solid ${alpha(theme.palette.success.main, 0.2)}`,
  "&:hover": { 
    transform: "translateY(-2px)",
    backgroundColor: alpha(theme.palette.success.main, 0.15),
    boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.2)}`,
  },
  "&.Mui-disabled": { background: "#e2e8f0", color: "#94a3b8" },
});

export default function FormHeaderIconAction(props: FormHeaderIconActionProps) {
  if (props.variant === "cancel") {
    const {
      variant: _v,
      tooltipTitle = "Discard Changes",
      sx,
      "aria-label": ariaLabel,
      ...rest
    } = props;
    return (
      <Tooltip title={tooltipTitle}>
        <IconButton
          {...rest}
          aria-label={ariaLabel ?? "Cancel"}
          sx={[cancelButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
        >
          <CancelGlyph sx={{ fontSize: 22 }} />
        </IconButton>
      </Tooltip>
    );
  }

  const {
    variant: _v,
    tooltipTitle = "Finish & Create",
    loading = false,
    disabled,
    sx,
    "aria-label": ariaLabel,
    ...rest
  } = props;
  const baseDisabled = disabled ?? loading;

  const button = (
    <IconButton
      {...rest}
      aria-label={ariaLabel ?? "Save"}
      disabled={baseDisabled}
      sx={[saveButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {loading ? <CircularProgress size={20} color="inherit" /> : <SaveGlyph sx={{ fontSize: 20 }} />}
    </IconButton>
  );

  return (
    <Tooltip title={tooltipTitle}>
      {baseDisabled ? <span style={{ display: "inline-flex" }}>{button}</span> : button}
    </Tooltip>
  );
}
