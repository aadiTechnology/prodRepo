/**
 * DeleteActionButton — Reusable circular icon button for destructive actions
 * Matches PrimaryActionButton styling but with error color for delete operations
 */

import { IconButton, Tooltip, alpha } from "@mui/material";
import { ReactNode } from "react";
import { colorTokens } from "../../tokens/colors";

export interface DeleteActionButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  "aria-label"?: string;
}

export default function DeleteActionButton({
  onClick,
  icon,
  label,
  "aria-label": ariaLabel = label,
}: DeleteActionButtonProps) {
  return (
    <Tooltip title={label}>
      <IconButton
        onClick={onClick}
        aria-label={ariaLabel}
        sx={(theme) => ({
          background: `linear-gradient(135deg, ${colorTokens.error?.main || theme.palette.error.main} 0%, ${alpha(colorTokens.error?.main || theme.palette.error.main, 0.8)} 100%)`,
          color: colorTokens.error?.contrast || theme.palette.error.contrastText,
          borderRadius: "15px",
          width: 44,
          height: 44,
          boxShadow: `0 8px 16px ${alpha(colorTokens.error?.main || theme.palette.error.main, 0.25)}`,
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "scale(1.1) rotate(-5deg)",
            boxShadow: `0 12px 20px ${alpha(colorTokens.error?.main || theme.palette.error.main, 0.35)}`,
          },
        })}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
