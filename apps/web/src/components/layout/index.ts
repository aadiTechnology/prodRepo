/**
 * Layout Components (Phase 6)
 * Reusable page structure. Compose primitives; theme-driven only.
 *
 * Flow: Design Tokens → Theme → Primitives → Layout Components → Pages
 */

export { default as PageLayout } from "./PageLayout";
export type { PageLayoutProps } from "./PageLayout";

export { default as PageHeader } from "./PageHeader";
export type { LayoutPageHeaderProps } from "./PageHeader";

export { default as ContentContainer } from "./ContentContainer";
export type { ContentContainerProps } from "./ContentContainer";

export { default as SectionLayout } from "./SectionLayout";
export type { SectionLayoutProps } from "./SectionLayout";

export { default as DashboardGrid } from "./DashboardGrid";
export type { DashboardGridProps } from "./DashboardGrid";
