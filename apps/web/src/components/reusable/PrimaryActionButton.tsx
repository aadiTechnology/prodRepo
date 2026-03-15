/**
 * PrimaryActionButton — Reusable (Phase 7)
 * Dark circular icon button for primary actions (e.g. Add). Theme-driven.
 */

import { IconButton, Tooltip, alpha } from "@mui/material";
import { ReactNode } from "react";
import { colorTokens } from "../../tokens/colors";

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
          background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          color: colorTokens.primary.contrast,
          borderRadius: '15px',
          width: 44,
          height: 44,
          boxShadow: `0 8px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.25)}`,
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "scale(1.1) rotate(5deg)",
            boxShadow: `0 12px 20px ${alpha(colorTokens.preschool.turquoise.main, 0.35)}`,
          },
        })}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
