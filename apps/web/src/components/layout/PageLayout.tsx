/**
 * PageLayout — Layout Component (Phase 6)
 * Top-level structure for application pages. Composes primitives only.
 * No business logic; theme-driven styling.
 */

import { ReactNode } from "react";
import { PageContainer } from "../primitives";
import { Stack } from "../primitives";

export interface PageLayoutProps {
  children: ReactNode;
  /** Optional header slot (e.g. layout PageHeader). */
  header?: ReactNode;
  /** Apply theme page background and min height. Default false. */
  pageBackground?: boolean;
  /** Max width; uses theme breakpoints. Default "lg". */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /** Gap between header and content (theme.spacing multiplier). Default 3. */
  spacing?: number;
}

export default function PageLayout({
  children,
  header,
  pageBackground = false,
  maxWidth = "lg",
  spacing = 3,
}: PageLayoutProps) {
  return (
    <PageContainer maxWidth={maxWidth} pageBackground={pageBackground}>
      <Stack direction="column" spacing={spacing} sx={{ flex: 1 }}>
        {header}
        {children}
      </Stack>
    </PageContainer>
  );
}
