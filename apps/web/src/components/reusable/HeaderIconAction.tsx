import { Tooltip, alpha } from "@mui/material";
import { IconButton } from "../primitives";
import type { IconButtonProps } from "../primitives";
import type { Theme } from "@mui/material/styles";
import { colorTokens } from "../../tokens/colors";
import type { ReactNode } from "react";

export interface HeaderIconActionProps extends Omit<IconButtonProps, "children"> {
  icon: ReactNode;
  tooltip: string;
  tone?: "neutral" | "primary";
}

export default function HeaderIconAction({
  icon,
  tooltip,
  tone = "neutral",
  sx,
  ...props
}: HeaderIconActionProps) {
  const mergedSx = (theme: Theme) => {
    const toneStyles =
      tone === "primary"
        ? {
            color: theme.palette.common.white,
            background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
            boxShadow: `0 4px 12px ${alpha(colorTokens.primary.main, 0.28)}`,
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: `0 6px 14px ${alpha(colorTokens.primary.main, 0.32)}`,
            },
          }
        : {
            color: colorTokens.text.primary,
            backgroundColor: colorTokens.surface.card,
            border: `1px solid ${colorTokens.border.default}`,
            boxShadow: theme.shadows[1],
            "&:hover": {
              transform: "translateY(-1px)",
              backgroundColor: alpha(colorTokens.primary.main, 0.06),
            },
          };

    return {
      height: { xs: 38, sm: 40 },
      width: { xs: 38, sm: 40 },
      borderRadius: 2.2,
      transition: "all 0.2s",
      ...toneStyles,
    };
  };

  return (
    <Tooltip title={tooltip}>
      <IconButton
        {...props}
        sx={sx ?? mergedSx}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
