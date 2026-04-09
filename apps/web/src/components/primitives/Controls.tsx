/**
 * Controls — UI Primitives
 * Single point of access to common MUI controls not yet wrapped.
 */

import { Chip as MuiChip, Switch as MuiSwitch } from "@mui/material";

export type ChipProps = React.ComponentProps<typeof MuiChip>;
export type SwitchProps = React.ComponentProps<typeof MuiSwitch>;

export const Chip = MuiChip;
export const Switch = MuiSwitch;

