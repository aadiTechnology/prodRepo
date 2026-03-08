/**
 * SectionLayout — Layout Component (Phase 6)
 * Consistent spacing between logical sections. Composes Section primitive.
 */

import { ReactNode } from "react";
import { Section } from "../primitives";
import type { SectionProps } from "../primitives";

export interface SectionLayoutProps extends Omit<SectionProps, "children"> {
  children: ReactNode;
}

export default function SectionLayout({
  children,
  title,
  titleVariant = "subtitle2",
  spacing = 4,
  titleSpacing = 1.5,
  sx,
  ...props
}: SectionLayoutProps) {
  return (
    <Section
      title={title}
      titleVariant={titleVariant}
      spacing={spacing}
      titleSpacing={titleSpacing}
      sx={sx}
      {...props}
    >
      {children}
    </Section>
  );
}
