/**
 * FieldLabel — Reusable (Phase 7.5)
 * Label above a form field with optional required asterisk.
 * Theme-driven; no business logic.
 */

import { Box, Typography, TypographyProps, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

export interface FieldLabelProps {
  children: ReactNode;
  /** Show required asterisk. */
  required?: boolean;
  /** Typography variant. Default body2. */
  variant?: TypographyProps["variant"];
  /** Additional sx for the label container. */
  sx?: SxProps<Theme>;
}

export default function FieldLabel({
  children,
  required = false,
  variant = "body2",
  sx,
}: FieldLabelProps) {
  return (
    <Typography
      component="label"
      variant={variant}
      sx={[
        (theme: Theme) => ({
          fontWeight: theme.typography.fontWeightBold,
          color: theme.palette.text.secondary,
          mb: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 0.3,
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
      {required && (
        <Box component="span" sx={(theme) => ({ color: theme.palette.error.main, fontSize: "0.8rem", lineHeight: 1 })}>
          *
        </Box>
      )}
    </Typography>
  );
}
