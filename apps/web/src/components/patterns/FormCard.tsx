/**
 * FormCard — Form pattern
 * Card with optional dark header strip, body slot, and optional footer actions.
 * Encapsulates "form card (dark header + body + actions)" from MUI_UI_COMPOSITION_PATTERNS.
 */

import { ReactNode } from "react";
import { AppCard, Box, Typography } from "../primitives";
import type { SxProps, Theme } from "../primitives";

export interface FormCardProps {
  /** Optional header title (triggers dark header bar when set). */
  title?: ReactNode;
  /** Optional icon in header. */
  icon?: ReactNode;
  /** Card body content. */
  children: ReactNode;
  /** Optional footer (e.g. FormActionsSection). */
  actions?: ReactNode;
  /** Padding for body. Default "normal". */
  paddingSize?: "normal" | "dense" | "none";
  sx?: SxProps<Theme>;
}

export default function FormCard({
  title,
  icon,
  children,
  actions,
  paddingSize = "normal",
  sx,
}: FormCardProps) {
  const hasHeader = title != null;
  const padding = paddingSize === "none" ? 0 : paddingSize === "dense" ? 2 : 3;

  return (
    <AppCard
      paddingSize="none"
      sx={{
        overflow: "hidden",
        minWidth: { xs: "100%", sm: 420 },
        maxWidth: 520,
        ...sx,
      }}
    >
      <>
        {hasHeader && (
          <Box
            sx={(theme) => ({
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 2,
              bgcolor: theme.palette.grey[800],
              color: theme.palette.common.white,
            })}
          >
            {icon != null && <Box sx={{ display: "flex", alignItems: "center" }}>{icon}</Box>}
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          </Box>
        )}
        <Box sx={{ p: padding }}>{children}</Box>
        {actions != null && (
          <Box
            sx={(theme) => ({
              display: "flex",
              justifyContent: "flex-end",
              gap: 1.5,
              p: 2,
              borderTop: 1,
              borderColor: theme.palette.divider,
            })}
          >
            {actions}
          </Box>
        )}
      </>
    </AppCard>
  );
}
