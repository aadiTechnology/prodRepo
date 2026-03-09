/**
 * Typography — UI Primitive
 * Single point of access to MUI Typography. Theme-driven; no hardcoded values.
 * Use for all text to ensure consistent type scale and colors from theme.
 */

import { Typography as MuiTypography, TypographyProps as MuiTypographyProps } from "@mui/material";

export type TypographyProps = MuiTypographyProps;

export default function Typography({ sx, ...props }: TypographyProps) {
  return <MuiTypography sx={sx} {...props} />;
}
