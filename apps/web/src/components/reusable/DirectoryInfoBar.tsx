/**
 * DirectoryInfoBar — Reusable (Phase 7)
 * Label + "Showing X–Y of Z" bar above tables. Theme-driven.
 */

import { Box, Typography } from "@mui/material";

export interface DirectoryInfoBarProps {
  label: string;
  rangeStart: number;
  rangeEnd: number;
  total: number;
}

export default function DirectoryInfoBar({ label, rangeStart, rangeEnd, total }: DirectoryInfoBarProps) {
  return (
    <Box
      sx={(theme) => ({
        py: 1.2,
        px: 3,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: 1,
        borderColor: theme.palette.divider,
        bgcolor: theme.palette.background.default,
      })}
    >
      <Typography
        variant="body2"
        sx={(theme) => ({
          fontSize: theme.typography.caption.fontSize,
          color: theme.palette.text.secondary,
          fontWeight: theme.typography.fontWeightMedium,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        })}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={(theme) => ({
          fontSize: theme.typography.body2.fontSize,
          color: theme.palette.text.secondary,
          fontWeight: theme.typography.fontWeightMedium,
        })}
      >
        Showing{" "}
        <Box component="span" sx={(t) => ({ color: t.palette.text.primary, fontWeight: t.typography.fontWeightBold })}>
          {rangeStart}-{rangeEnd}
        </Box>{" "}
        of{" "}
        <Box component="span" sx={(t) => ({ color: t.palette.text.primary, fontWeight: t.typography.fontWeightBold })}>
          {total}
        </Box>
      </Typography>
    </Box>
  );
}
