import { Chip } from "@mui/material";

interface ScopeChipProps {
  scope: "PLATFORM" | "TENANT";
}

export default function ScopeChip({ scope }: ScopeChipProps) {
  return (
    <Chip
      label={scope === "PLATFORM" ? "Platform" : "Tenant"}
      color={scope === "PLATFORM" ? "info" : "default"}
      size="small"
      sx={{
        fontWeight: 700,
        bgcolor: scope === "PLATFORM" ? "primary.light" : "grey.700",
        color: scope === "PLATFORM" ? "primary.contrastText" : "text.primary",
      }}
      aria-label={scope === "PLATFORM" ? "platform scope" : "tenant scope"}
    />
  );
}