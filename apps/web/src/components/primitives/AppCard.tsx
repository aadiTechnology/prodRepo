/**
 * AppCard — UI Primitive (Phase 5)
 * Reusable container for grouped content (widgets, statistics, forms, tables).
 * Relies on theme for radius and elevation; no hardcoded values.
 */

import { Card, CardProps, CardContent } from "@mui/material";
import { colorTokens } from "../../tokens/colors";

export type AppCardPaddingSize = "normal" | "dense" | "none";

export interface AppCardProps extends CardProps {
  /** Padding for content. "normal" (default), "dense" (tighter), or "none". */
  paddingSize?: AppCardPaddingSize;
}

const paddingMap = {
  normal: 3,
  dense: 2,
  none: 0,
} as const;

export default function AppCard({
  children,
  paddingSize = "normal",
  sx,
  ...props
}: AppCardProps) {
  const padding = paddingMap[paddingSize];
  const withContent = paddingSize !== "none";

  return (
    <Card
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderColor: colorTokens.border.subtle,
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
        ...sx,
      }}
      {...props}
    >
      {withContent ? (
        <CardContent sx={{ p: padding, "&:last-child": { pb: padding } }}>
          {children}
        </CardContent>
      ) : (
        children
      )}
    </Card>
  );
}
