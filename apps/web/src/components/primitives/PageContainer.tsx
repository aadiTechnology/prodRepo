/**
 * PageContainer — UI Primitive (Phase 5)
 * Consistent page padding and width constraints for dashboard pages.
 * Supports list/dashboard layout pattern (page background + content).
 * Styling from theme only (no hardcoded values).
 */

import { Container as MuiContainer, ContainerProps } from "@mui/material";

export interface PageContainerProps extends Omit<ContainerProps, "maxWidth"> {
  /** Max width constraint; uses theme breakpoints. */
  maxWidth?: ContainerProps["maxWidth"];
  /** When true, applies theme page background and min height. For list/dashboard pages. */
  pageBackground?: boolean;
}

export default function PageContainer({
  children,
  maxWidth = "lg",
  pageBackground = false,
  sx,
  ...props
}: PageContainerProps) {
  return (
    <MuiContainer
      maxWidth={maxWidth}
      disableGutters={false}
      sx={[
        {
          py: 3,
          px: { xs: 2, sm: 2, md: 3 },
          width: "100%",
        },
        pageBackground && {
          bgcolor: "background.default",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        },
        ...(sx != null ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
      {...props}
    >
      {children}
    </MuiContainer>
  );
}
