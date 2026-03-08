/**
 * FormSection — Reusable (Phase 7)
 * Form grouping with optional title. Composes Section primitive; theme-driven.
 */

import { ReactNode } from "react";
import { Section } from "../primitives";

export interface FormSectionProps {
  children: ReactNode;
  title?: ReactNode;
  /** Spacing below section (theme.spacing multiplier). Default 4. */
  spacing?: number;
  /** Spacing below title (theme.spacing multiplier). Default 1.5. */
  titleSpacing?: number;
}

export default function FormSection({
  children,
  title,
  spacing = 4,
  titleSpacing = 1.5,
}: FormSectionProps) {
  return (
    <Section title={title} titleVariant="subtitle2" spacing={spacing} titleSpacing={titleSpacing}>
      {children}
    </Section>
  );
}
