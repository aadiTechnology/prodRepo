/**
 * IconButton — UI Primitive
 * Single point of access to MUI IconButton. Uses theme.palette.action.hover (no duplicate tokens).
 * Forwards ref so parent wrappers (e.g. MUI Tooltip) can attach to the button element.
 */

import * as React from "react";
import { IconButton as MuiIconButton, IconButtonProps as MuiIconButtonProps } from "@mui/material";

export type IconButtonProps = MuiIconButtonProps;

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  props,
  ref
) {
  return <MuiIconButton ref={ref} {...props} />;
});

export default IconButton;
