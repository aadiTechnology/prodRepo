/**
 * FormActionsBar — Reusable (Phase 7.5)
 * Bottom action bar for forms: primary (e.g. Save) and secondary (e.g. Cancel).
 * Theme-driven; no business logic.
 */

import { Box, Stack, SxProps, Theme } from "@mui/material";
import { Button, CircularProgress } from "../primitives";
import { SaveButton, CancelButton } from "../semantic";
import { ReactNode } from "react";

export interface FormActionsBarProps {
  /** Primary button label (e.g. "Save", "Update"). */
  primaryLabel: ReactNode;
  onPrimary: () => void;
  /** Secondary button label (e.g. "Cancel"). */
  secondaryLabel?: ReactNode;
  onSecondary?: () => void;
  /** Primary button disabled (e.g. invalid form). */
  primaryDisabled?: boolean;
  /** Show loading state on primary (e.g. submitting). */
  loading?: boolean;
  /** Extra content (e.g. left-aligned link). */
  extra?: ReactNode;
  /** Spacing between buttons. Default 2. */
  spacing?: number;
  sx?: SxProps<Theme>;
}

export default function FormActionsBar({
  primaryLabel,
  onPrimary,
  secondaryLabel = "Cancel",
  onSecondary,
  primaryDisabled = false,
  loading = false,
  extra,
  spacing = 2,
  sx,
}: FormActionsBarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
        ...sx,
      }}
    >
      {extra != null ? <Box>{extra}</Box> : <Box />}
      <Stack direction="row" spacing={spacing} alignItems="center">
        {onSecondary != null && (
          <CancelButton variant="outlined" onClick={onSecondary} disabled={loading}>
            {secondaryLabel}
          </CancelButton>
        )}
        <SaveButton
          variant="contained"
          color="primary"
          onClick={onPrimary}
          disabled={primaryDisabled || loading}
          loading={loading}
        >
          {primaryLabel}
        </SaveButton>
      </Stack>
    </Box>
  );
}
