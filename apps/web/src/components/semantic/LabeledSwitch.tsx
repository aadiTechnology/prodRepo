import { Box, Typography, Switch } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export interface LabeledSwitchProps {
  /** Label shown next to the switch (e.g. "Account Active"). */
  label: string;
  /** Controlled switch value. */
  checked: boolean;
  /** Called when the switch is toggled. */
  onChange: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  /** Name for the underlying input (e.g. "is_active"). */
  name?: string;
  /** Disable toggling (field still visible). */
  disabled?: boolean;
  /** Switch size. */
  size?: "small" | "medium";
  /** Switch color. */
  color?: "primary" | "secondary" | "error" | "info" | "success" | "warning" | "default";
  /** Optional sx for the outer container. */
  sx?: SxProps<Theme>;
}

export default function LabeledSwitch({
  label,
  checked,
  onChange,
  name,
  disabled = false,
  size = "small",
  color = "primary",
  sx,
}: LabeledSwitchProps) {
  const rootSx: SxProps<Theme> = (theme) => ({
    p: 2,
    bgcolor: theme.palette.grey[100],
    borderRadius: 2,
    border: `1px solid ${theme.palette.divider}`,
    display: "flex",
    flexDirection: { xs: "column", sm: "row" },
    alignItems: { xs: "flex-start", sm: "center" },
    justifyContent: "space-between",
    gap: 1,
  });

  const labelSx: SxProps<Theme> = (theme) => ({
    fontSize: "0.9rem",
    fontWeight: 700,
    color: theme.palette.text.primary,
  });

  const mergedSx = (sx ? [rootSx, sx] : rootSx) as SxProps<Theme>;

  return (
    <Box sx={mergedSx}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={labelSx}>{label}</Typography>
      </Box>
      <Switch
        checked={checked}
        onChange={onChange}
        name={name}
        disabled={disabled}
        size={size}
        color={color}
      />
    </Box>
  );
}
