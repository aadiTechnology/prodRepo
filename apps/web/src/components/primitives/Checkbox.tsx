/**
 * Checkbox — UI Primitive
 * Single point of access to MUI Checkbox. Theme-driven.
 */

import { Checkbox as MuiCheckbox, CheckboxProps as MuiCheckboxProps } from "@mui/material";

export type CheckboxProps = MuiCheckboxProps;

export default function Checkbox({ sx, ...props }: CheckboxProps) {
  return <MuiCheckbox sx={sx} {...props} />;
}
