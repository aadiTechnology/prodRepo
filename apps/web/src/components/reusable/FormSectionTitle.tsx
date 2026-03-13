/**
 * FormSectionTitle — Reusable (Phase 7.5)
 * Standalone section title typography for use inside custom sections.
 * Theme-driven; matches FormSection title style.
 */

import { Typography, TypographyProps, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

export interface FormSectionTitleProps {
  children: ReactNode;
  /** Typography variant. Default subtitle2. */
  variant?: TypographyProps["variant"];
  /** Additional sx. */
  sx?: SxProps<Theme>;
}

export default function FormSectionTitle({
  children,
  variant = "subtitle2",
  sx,
}: FormSectionTitleProps) {
  return (
    <Typography
      variant={variant}
      sx={[
        (theme: Theme) => ({
          fontWeight: theme.typography.fontWeightBold,
          textTransform: "uppercase",
          letterSpacing: theme.typography.subtitle2?.letterSpacing ?? "0.05em",
          color: theme.palette.text.secondary,
          mb: 1.5,
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Typography>
  );
}
