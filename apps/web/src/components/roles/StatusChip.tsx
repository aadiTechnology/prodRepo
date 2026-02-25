import { Chip } from "@mui/material";

interface StatusChipProps {
  status: "ACTIVE" | "INACTIVE";
}

export default function StatusChip({ status }: StatusChipProps) {
  return (
    <Chip
      label={status === "ACTIVE" ? "Active" : "Inactive"}
      color={status === "ACTIVE" ? "success" : "error"}
      size="small"
      sx={{ fontWeight: 700 }}
      aria-label={status === "ACTIVE" ? "active status" : "inactive status"}
    />
  );
}