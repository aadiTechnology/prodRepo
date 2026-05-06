/**
 * Controls — UI Primitives
 * Single point of access to common MUI controls not yet wrapped.
 */

import {
  Chip as MuiChip,
  Switch as MuiSwitch,
  Divider as MuiDivider,
  Tooltip as MuiTooltip,
} from "@mui/material";

export type ChipProps = React.ComponentProps<typeof MuiChip>;
export type SwitchProps = React.ComponentProps<typeof MuiSwitch>;
export type DividerProps = React.ComponentProps<typeof MuiDivider>;
export type TooltipProps = React.ComponentProps<typeof MuiTooltip>;

export const Chip = MuiChip;
export const Switch = MuiSwitch;
export const Divider = MuiDivider;
export const Tooltip = MuiTooltip;
