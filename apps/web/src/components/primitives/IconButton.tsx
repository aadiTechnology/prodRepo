/**
 * IconButton — UI Primitive
 * Single point of access to MUI IconButton. Uses theme.palette.action.hover (no duplicate tokens).
 */

import { IconButton as MuiIconButton, IconButtonProps as MuiIconButtonProps } from "@mui/material";

export type IconButtonProps = MuiIconButtonProps;

export default function IconButton(props: IconButtonProps) {
  return <MuiIconButton {...props} />;
}
