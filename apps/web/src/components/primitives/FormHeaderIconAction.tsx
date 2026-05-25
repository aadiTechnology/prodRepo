/**
 * FormHeaderIconAction — UI Primitive
 * Paired discard / submit icon actions for page headers (coral cancel + gradient save, optional loading on save).
 */

import { Tooltip, alpha } from "@mui/material";
import {
  ArrowBack as ArrowBackGlyph,
  Cancel as CancelGlyph,
  Edit as EditGlyph,
  Publish as PublishGlyph,
  Save as SaveGlyph,
  VisibilityOff as UnpublishGlyph,
} from "@mui/icons-material";
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
    })
  | (Base & {
      variant: "publish";
      tooltipTitle?: string;
      loading?: boolean;
    })
  | (Base & {
      variant: "back";
      tooltipTitle?: string;
    })
  | (Base & {
      variant: "edit";
      tooltipTitle?: string;
    })
  | (Base & {
      variant: "unpublish";
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

const publishButtonSx = (theme: Theme) => ({
  color: theme.palette.primary.main,
  backgroundColor: alpha(theme.palette.primary.main, 0.08),
  borderRadius: "12px",
  width: 44,
  height: 44,
  border: `1.5px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  "&:hover": {
    transform: "translateY(-2px)",
    backgroundColor: alpha(theme.palette.primary.main, 0.15),
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
  "&.Mui-disabled": { background: "#e2e8f0", color: "#94a3b8" },
});

const backButtonSx = (theme: Theme) => ({
  color: theme.palette.text.secondary,
  backgroundColor: alpha(theme.palette.text.primary, 0.06),
  borderRadius: "12px",
  width: 44,
  height: 44,
  border: `1.5px solid ${alpha(theme.palette.divider, 0.9)}`,
  "&:hover": {
    backgroundColor: alpha(theme.palette.text.primary, 0.1),
    color: theme.palette.text.primary,
  },
});

const unpublishButtonSx = (theme: Theme) => ({
  color: theme.palette.warning.main,
  backgroundColor: alpha(theme.palette.warning.main, 0.1),
  borderRadius: "12px",
  width: 44,
  height: 44,
  border: `1.5px solid ${alpha(theme.palette.warning.main, 0.25)}`,
  "&:hover": {
    transform: "translateY(-2px)",
    backgroundColor: alpha(theme.palette.warning.main, 0.16),
    boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.2)}`,
  },
  "&.Mui-disabled": { background: "#e2e8f0", color: "#94a3b8" },
});

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
  if (props.variant === "back") {
    const {
      variant: _v,
      tooltipTitle = "Back",
      sx,
      "aria-label": ariaLabel,
      ...rest
    } = props;
    return (
      <Tooltip title={tooltipTitle}>
        <IconButton
          {...rest}
          aria-label={ariaLabel ?? "Back"}
          sx={[backButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
        >
          <ArrowBackGlyph sx={{ fontSize: 22 }} />
        </IconButton>
      </Tooltip>
    );
  }

  if (props.variant === "edit") {
    const {
      variant: _v,
      tooltipTitle = "Edit",
      sx,
      "aria-label": ariaLabel,
      ...rest
    } = props;
    return (
      <Tooltip title={tooltipTitle}>
        <IconButton
          {...rest}
          aria-label={ariaLabel ?? "Edit"}
          sx={[saveButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
        >
          <EditGlyph sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
    );
  }

  if (props.variant === "unpublish") {
    const {
      variant: _v,
      tooltipTitle = "Unpublish",
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
        aria-label={ariaLabel ?? "Unpublish"}
        disabled={baseDisabled}
        sx={[unpublishButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      >
        {loading ? <CircularProgress size={20} color="inherit" /> : <UnpublishGlyph sx={{ fontSize: 22 }} />}
      </IconButton>
    );
    return (
      <Tooltip title={tooltipTitle}>
        {baseDisabled ? <span style={{ display: "inline-flex" }}>{button}</span> : button}
      </Tooltip>
    );
  }

  if (props.variant === "publish") {
    const {
      variant: _v,
      tooltipTitle = "Publish",
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
        aria-label={ariaLabel ?? "Publish"}
        disabled={baseDisabled}
        sx={[publishButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      >
        {loading ? <CircularProgress size={20} color="inherit" /> : <PublishGlyph sx={{ fontSize: 22 }} />}
      </IconButton>
    );
    return (
      <Tooltip title={tooltipTitle}>
        {baseDisabled ? <span style={{ display: "inline-flex" }}>{button}</span> : button}
      </Tooltip>
    );
  }

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
