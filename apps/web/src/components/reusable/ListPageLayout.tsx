/**
 * ListPageLayout — Reusable (Phase 7)
 * Page structure: page background + header + card content area. Composes layout + primitives.
 */

import { ReactNode } from "react";
import { PageLayout } from "../layout";
import { AppCard } from "../primitives";
import type { AppCardPaddingSize } from "../primitives";

export interface ListPageLayoutProps {
  children: ReactNode;
  /** Header slot (e.g. layout PageHeader + ListPageToolbar in actions). */
  header?: ReactNode;
  /** Apply theme page background. Default true. */
  pageBackground?: boolean;
  /** Content card padding. Default "none" for table/list; "normal" for forms. */
  contentPaddingSize?: AppCardPaddingSize;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}

export default function ListPageLayout({
  children,
  header,
  pageBackground = true,
  contentPaddingSize = "none",
  maxWidth = "lg",
}: ListPageLayoutProps) {
  return (
    <PageLayout header={header} pageBackground={pageBackground} maxWidth={maxWidth}>
      <AppCard paddingSize={contentPaddingSize} sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </AppCard>
    </PageLayout>
  );
}
