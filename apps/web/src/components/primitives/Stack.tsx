/**
 * Stack — UI Primitive (Phase 5)
 * Layout utility for vertical or horizontal spacing between elements.
 * Uses MUI Stack; spacing is theme-driven (theme.spacing).
 */

import { Stack as MuiStack, StackProps } from "@mui/material";

export interface PrimitiveStackProps extends StackProps {
  /** Direction of the stack. Default "column". */
  direction?: StackProps["direction"];
  /** Gap between items (theme.spacing multiplier). Default 2. */
  spacing?: StackProps["spacing"];
}

export default function Stack({
  direction = "column",
  spacing = 2,
  useFlexGap = true,
  ...props
}: PrimitiveStackProps) {
  return (
    <MuiStack
      direction={direction}
      spacing={spacing}
      useFlexGap={useFlexGap}
      {...props}
    />
  );
}
