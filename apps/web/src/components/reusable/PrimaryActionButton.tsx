/**
 * PrimaryActionButton — Reusable (Phase 7)
 * Dark circular icon button for primary actions (e.g. Add). Theme-driven.
 */

import { IconButton, Tooltip } from "@mui/material";
import { ReactNode } from "react";

export interface PrimaryActionButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  "aria-label"?: string;
}

export default function PrimaryActionButton({
  onClick,
  icon,
  label,
  "aria-label": ariaLabel = label,
}: PrimaryActionButtonProps) {
  return (
    <Tooltip title={label}>
      <IconButton
        onClick={onClick}
        aria-label={ariaLabel}
        sx={(theme) => ({
          backgroundColor: theme.palette.grey[800],
          color: theme.palette.common.white,
          borderRadius: 1.2,
          width: 44,
          height: 44,
          boxShadow: theme.shadows[2],
          "&:hover": {
            backgroundColor: theme.palette.grey[700],
          },
        })}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
