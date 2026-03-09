/**
 * FormActionsSection — Form pattern
 * Standard form action bar: optional extra (left), Cancel + Save (or custom primary).
 * Composes semantic SaveButton, CancelButton and Stack primitive.
 */

import { ReactNode } from "react";
import { Box, Stack } from "../primitives";
import { SaveButton, CancelButton } from "../semantic";
import type { SxProps, Theme } from "../primitives";

export interface FormActionsSectionProps {
  onSave: () => void;
  onCancel?: () => void;
  saveLabel?: ReactNode;
  cancelLabel?: ReactNode;
  saveDisabled?: boolean;
  loading?: boolean;
  /** Left-aligned content (e.g. back link). */
  extra?: ReactNode;
  /** Spacing between buttons. Default 2. */
  spacing?: number;
  sx?: SxProps<Theme>;
}

export default function FormActionsSection({
  onSave,
  onCancel,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  saveDisabled = false,
  loading = false,
  extra,
  spacing = 2,
  sx,
}: FormActionsSectionProps) {
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
        {onCancel != null && (
          <CancelButton onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </CancelButton>
        )}
        <SaveButton onClick={onSave} disabled={saveDisabled} loading={loading}>
          {saveLabel}
        </SaveButton>
      </Stack>
    </Box>
  );
}
