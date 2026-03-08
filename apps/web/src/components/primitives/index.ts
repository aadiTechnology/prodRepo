/**
 * UI Primitives (Phase 5)
 * Building blocks for pages and components. All styling from theme/tokens.
 *
 * Flow: Design Tokens → Theme → Primitive Components → Pages
 */

export { default as PageContainer } from "./PageContainer";
export type { PageContainerProps } from "./PageContainer";

export { default as AppCard } from "./AppCard";
export type { AppCardProps, AppCardPaddingSize } from "./AppCard";

export { default as Section } from "./Section";
export type { SectionProps } from "./Section";

export { default as Stack } from "./Stack";
export type { PrimitiveStackProps } from "./Stack";
