/**
 * ListPageLayout — Reusable (Phase 7)
 * Page structure: page background + header + card content area. Composes layout + primitives.
 *
 * Inner content Box: flex column + minHeight 0 for predictable scrolling. Use scrollableFormContent
 * for standard form padding + body scroll; lists stay flush with overflow hidden. Override with contentSx.
 */

import { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import { PageLayout } from "../layout";
import { AppCard, Box } from "../primitives";
import type { AppCardPaddingSize } from "../primitives";
import { colorTokens } from "../../tokens/colors";

export interface ListPageLayoutProps {
  children: ReactNode;
  /** Header slot (e.g. layout PageHeader + ListPageToolbar in actions). */
  header?: ReactNode;
  /** Apply theme page background. Default true. */
  pageBackground?: boolean;
  /** Content card padding. Default "none" for table/list; "normal" for forms. */
  contentPaddingSize?: AppCardPaddingSize;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /**
   * When true, inner wrapper uses responsive padding and vertical scrolling (typical full-page forms).
   * When false (default), inner wrapper is flush with overflow hidden (lists / split layouts).
   */
  scrollableFormContent?: boolean;
  /** Merged after inner preset (e.g. maxWidth, fixed height for split forms). */
  contentSx?: SxProps<Theme>;
}

export default function ListPageLayout({
  children,
  header,
  pageBackground = true,
  contentPaddingSize = "none",
  maxWidth = "lg",
  scrollableFormContent = false,
  contentSx,
}: ListPageLayoutProps) {
  const innerSx: SxProps<Theme> = scrollableFormContent
    ? {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        p: { xs: 2, sm: 3, md: 5 },
      }
    : {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        p: 0,
      };

  return (
    <PageLayout header={header} pageBackground={pageBackground} maxWidth={maxWidth}>
      <AppCard
        paddingSize={contentPaddingSize}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          border: `1px solid ${colorTokens.border.default}`,
        }}
      >
        <Box sx={[innerSx, ...(contentSx ? [contentSx] : [])] as SxProps<Theme>}>{children}</Box>
      </AppCard>
    </PageLayout>
  );
}
