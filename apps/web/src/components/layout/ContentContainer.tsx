/**
 * ContentContainer — Layout Component (Phase 6)
 * Consistent content width and padding for main page content.
 * Composes Box; theme-driven spacing only.
 */

import { Box, BoxProps } from "@mui/material";
import { ReactNode } from "react";

export interface ContentContainerProps extends Omit<BoxProps, "children"> {
  children: ReactNode;
  /** Max width in px or theme breakpoint key. Optional. */
  maxWidth?: number | string | false;
}

export default function ContentContainer({
  children,
  maxWidth,
  sx,
  ...props
}: ContentContainerProps) {
  return (
    <Box
      sx={[
        {
          width: "100%",
          flexGrow: 1,
          py: 2,
          px: { xs: 0, sm: 0, md: 0 },
        },
        maxWidth != null &&
          maxWidth !== false && {
            maxWidth: typeof maxWidth === "number" ? maxWidth : maxWidth,
            mx: "auto",
          },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      {children}
    </Box>
  );
}
