/**
 * DashboardGrid — Layout Component (Phase 6)
 * Responsive grid for dashboard widgets. Theme-driven spacing.
 * Use Grid item (or Grid2 item) children for responsive columns.
 */

import { Grid, GridProps } from "@mui/material";
import { ReactNode } from "react";

export interface DashboardGridProps extends Omit<GridProps, "children"> {
  children: ReactNode;
  /** Gap between items (theme.spacing multiplier). Default 3. */
  spacing?: GridProps["spacing"];
}

export default function DashboardGrid({
  children,
  spacing = 3,
  sx,
  ...props
}: DashboardGridProps) {
  return (
    <Grid
      container
      spacing={spacing}
      sx={[{ width: "100%" }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      {...props}
    >
      {children}
    </Grid>
  );
}
