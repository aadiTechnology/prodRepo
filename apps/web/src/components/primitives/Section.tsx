/**
 * Section — UI Primitive (Phase 5)
 * Groups related content with consistent vertical spacing.
 * Supports form sections and list content grouping (FormSection, DirectoryInfoBar).
 * Styling from theme only.
 */

import { Box, Typography, TypographyProps } from "@mui/material";
import { ReactNode } from "react";

export interface SectionProps {
  children: ReactNode;
  /** Optional section title. */
  title?: ReactNode;
  /** Title typography variant. */
  titleVariant?: TypographyProps["variant"];
  /** Spacing below the section (theme.spacing multiplier). Default 4. */
  spacing?: number;
  /** Spacing below the title, before content (theme.spacing multiplier). Default 1.5. */
  titleSpacing?: number;
  /** Additional sx for the root Box. */
  sx?: Box["sx"];
}

export default function Section({
  children,
  title,
  titleVariant = "subtitle2",
  spacing = 4,
  titleSpacing = 1.5,
  sx,
}: SectionProps) {
  return (
    <Box sx={{ mb: spacing, ...sx }}>
      {title != null && (
        <Typography
          variant={titleVariant}
          sx={(theme) => ({
            fontWeight: theme.typography.fontWeightBold,
            textTransform: "uppercase",
            letterSpacing: theme.typography.subtitle2.letterSpacing,
            color: theme.palette.text.secondary,
            mb: titleSpacing,
          })}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
}
