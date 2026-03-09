/**
 * FormFieldRow — Form pattern
 * Label + input row. Reuses token-based FieldLabel from reusable; no duplicate label styling.
 */

import { ReactNode } from "react";
import { Box, Typography } from "../primitives";
import { FieldLabel } from "../reusable";
import type { SxProps, Theme } from "../primitives";

export interface FormFieldRowProps {
  label: ReactNode;
  required?: boolean;
  children: ReactNode;
  /** Additional sx for the row container. */
  sx?: SxProps<Theme>;
  /** Error message shown below input. */
  error?: ReactNode;
}

export default function FormFieldRow({
  label,
  required = false,
  children,
  sx,
  error,
}: FormFieldRowProps) {
  return (
    <Box sx={{ mb: 2, ...sx } as SxProps<Theme>}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
      {error != null && (
        <Typography variant="caption" sx={(theme) => ({ color: theme.palette.error.main, mt: 0.5, display: "block" })}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
