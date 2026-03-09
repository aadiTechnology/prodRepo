/**
 * Theme Template — stored token overrides for reuse across tenants.
 * config is Partial<Tokens> (token overrides) compatible with Theme Studio and tenant theme generator.
 */

export interface ThemeTemplate {
  id: number;
  name: string;
  description: string | null;
  /** Token overrides (partial design tokens) */
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}

export interface ThemeTemplateCreate {
  name: string;
  description?: string | null;
  config: Record<string, unknown>;
}

export interface ThemeTemplateUpdate {
  name?: string;
  description?: string | null;
  config?: Record<string, unknown>;
}

export interface ThemeTemplateListResponse {
  items: ThemeTemplate[];
  total: number;
}
