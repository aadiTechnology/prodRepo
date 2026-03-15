import { Chip, alpha } from "@mui/material";
import { colorTokens } from "../../tokens/colors";

interface StatusChipProps {
  status: "ACTIVE" | "INACTIVE";
}

export default function StatusChip({ status }: StatusChipProps) {
  const isActive = status === "ACTIVE";
  const color = isActive ? colorTokens.preschool.mint.main : colorTokens.preschool.coral.main;

  return (
    <Chip
      label={isActive ? "Active" : "Inactive"}
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
      aria-label={isActive ? "active status" : "inactive status"}
    />
  );
}