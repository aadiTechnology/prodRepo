/**
 * FormSectionLabel — Reusable (Phase 7.5)
 * Section header with optional icon and title (e.g. "Company Information", "Address").
 * Theme-driven; composes FormSectionTitle with optional leading icon.
 */

import { Box, Typography, TypographyProps, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

export interface FormSectionLabelProps {
  title: string;
  /** Optional icon shown before the title. */
  icon?: ReactNode;
  /** Typography variant for title. Default subtitle2. */
  titleVariant?: TypographyProps["variant"];
  /** Spacing below the label (theme.spacing multiplier). Default 1.5. */
  spacing?: number;
  sx?: SxProps<Theme>;
}

export default function FormSectionLabel({
  title,
  icon,
  titleVariant = "subtitle2",
  spacing = 1.5,
  sx,
}: FormSectionLabelProps) {
  return (
    <Box
      sx={[
        (theme: Theme) => ({
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: spacing,
        }),
        ...(sx != null ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
    >
      {icon != null && (
        <Box sx={(theme) => ({ color: theme.palette.text.primary, display: "flex", alignItems: "center" })}>
          {icon}
        </Box>
      )}
      <Typography
        variant={titleVariant}
        sx={(theme) => ({
          fontWeight: theme.typography.fontWeightBold,
          fontSize: theme.typography.subtitle2?.fontSize ?? "0.875rem",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color: theme.palette.text.secondary,
        })}
      >
        {title}
      </Typography>
    </Box>
  );
}
