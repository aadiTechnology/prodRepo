import { Chip, alpha } from "@mui/material";

import type { FeeInstallmentStatusValue } from "../../types/feeInstallmentStatus";
import { colorTokens } from "../../tokens/colors";

// Status colors per user story: Green=Paid, Orange=Partial, Yellow=Pending, Red=Overdue
const statusConfig: Record<
  FeeInstallmentStatusValue,
  { label: string; color: string }
> = {
  Paid: { label: "Paid", color: colorTokens.preschool.mint.main },
  Partial: { label: "Partial", color: colorTokens.preschool.peach.main },
  Pending: { label: "Pending", color: colorTokens.preschool.sunshine.main },
  Overdue: { label: "Overdue", color: colorTokens.preschool.coral.dark },
};

export default function FeeInstallmentStatusChip({
  status,
}: {
  status: FeeInstallmentStatusValue;
}) {
  const cfg = statusConfig[status] ?? statusConfig.Pending;
  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        fontWeight: 800,
        fontSize: "0.7rem",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        bgcolor: alpha(cfg.color, 0.12),
        color: cfg.color,
        border: `1px solid ${alpha(cfg.color, 0.25)}`,
        borderRadius: "10px",
        height: 26,
        "& .MuiChip-label": { px: 1.25 },
      }}
    />
  );
}

