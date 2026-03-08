/**
 * DetailFieldRow — Reusable (Phase 7.5)
 * Label-value row for detail views (e.g. tenant detail, profile).
 * Optional divider between rows. Theme-driven.
 */

import { Box, Typography, Divider, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

export interface DetailFieldRowProps {
  label: string;
  children: ReactNode;
  /** Hide divider below this row. Default false. */
  last?: boolean;
  /** Min width for label column. Default 180. */
  labelMinWidth?: number;
  sx?: SxProps<Theme>;
}

export default function DetailFieldRow({
  label,
  children,
  last = false,
  labelMinWidth = 180,
  sx,
}: DetailFieldRowProps) {
  return (
    <Box sx={sx}>
      <Box
        sx={(theme) => ({
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
          py: 2.5,
          px: 3,
          flexWrap: { xs: "wrap", sm: "nowrap" },
        })}
      >
        <Typography
          variant="body2"
          sx={(theme) => ({
            minWidth: labelMinWidth,
            flexShrink: 0,
            color: theme.palette.text.secondary,
            pt: 0.3,
          })}
        >
          {label}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      </Box>
      {!last && <Divider sx={{ mx: 0 }} />}
    </Box>
  );
}
