/**
 * ListPageLayout — Reusable (Phase 7)
 * Page structure: page background + header + card content area. Composes layout + primitives.
 *
 * Inner content Box: flex column + minHeight 0 for predictable scrolling. Use scrollableFormContent
 * for standard form padding + body scroll; lists stay flush with overflow hidden. Override with contentSx.
 *
 * Optional pull-to-refresh (Capacitor mobile only): wraps the whole page, Flipkart-style.
 */

import { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import { PageLayout } from "../layout";
import { AppCard, Box, PullToRefresh } from "../primitives";
import type { AppCardPaddingSize } from "../primitives";
import { colorTokens } from "../../tokens/colors";
import { isNativePlatform } from "../../utils/capacitor";

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
  /** Stable test hook for the page root container. */
  "data-testid"?: string;
  /** When set, enables full-page pull-to-refresh on Capacitor mobile (Android/iOS). Ignored on web. */
  onRefresh?: () => void | Promise<void>;
  /** Controlled pull-to-refresh spinner. Prefer silent refetch (do not blank the list). */
  refreshing?: boolean;
  /** Disable pull-to-refresh while keeping onRefresh for future use. */
  pullToRefreshDisabled?: boolean;
}

export default function ListPageLayout({
  children,
  header,
  pageBackground = true,
  contentPaddingSize = "none",
  maxWidth = "lg",
  scrollableFormContent = false,
  contentSx,
  "data-testid": dataTestId,
  onRefresh,
  refreshing,
  pullToRefreshDisabled = false,
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

  const page = (
    <PageLayout header={header} pageBackground={pageBackground} maxWidth={maxWidth} data-testid={dataTestId}>
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

  const enablePullToRefresh = Boolean(onRefresh) && isNativePlatform() && !pullToRefreshDisabled;

  if (!enablePullToRefresh || !onRefresh) {
    return page;
  }

  return (
    <PullToRefresh onRefresh={onRefresh} refreshing={refreshing}>
      {page}
    </PullToRefresh>
  );
}
