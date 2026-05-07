import { Chip, alpha } from "@mui/material";
import { colorTokens } from "../../tokens/colors";

interface StatusChipProps {
  status: "ACTIVE" | "INACTIVE" | "COMPLETED" | "DUE" | "OVERDUE";
  label?: string;
}

export default function StatusChip({ status, label }: StatusChipProps) {
  const color =
    status === "ACTIVE"
      ? colorTokens.preschool.mint.main
      : status === "COMPLETED"
        ? colorTokens.preschool.lavender.main
        : status === "DUE"
          ? colorTokens.preschool.peach.dark
          : colorTokens.preschool.coral.main;

  const resolvedLabel =
    label ??
    (status === "ACTIVE"
      ? "Active"
      : status === "COMPLETED"
        ? "Completed"
        : status === "DUE"
          ? "Due"
          : status === "OVERDUE"
            ? "Overdue"
            : "Inactive");

  return (
    <Chip
      label={resolvedLabel}
      size="small"
      sx={{ 
        fontWeight: 800,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        bgcolor: alpha(color, 0.1),
        color: color,
        border: `1px solid ${alpha(color, 0.2)}`,
        borderRadius: '8px',
        height: '24px',
        '& .MuiChip-label': { px: 1 }
      }}
      aria-label={`${status.toLowerCase()} status`}
    />
  );
}