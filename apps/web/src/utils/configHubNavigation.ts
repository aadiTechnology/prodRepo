/**
 * Utility for smart navigation back to Configuration Hub
 * Automatically detects which section a page belongs to
 */

// Map of page paths to their config hub section
const PATH_TO_CONFIG_SECTION: Record<string, string> = {
  // Academic Related
  "/academics/academic-years": "academic-related",
  "/academic-years": "academic-related",
  "/academics/classes": "academic-related",
  "/classes": "academic-related",
  "/academics/subjects": "academic-related",
  "/subjects": "academic-related",
  
  // User Related
  "/roles": "user-related",
  "/teachers": "user-related",
  "/students": "user-related",
  "/admin/permission-management": "user-related",
  
  // Fees Related
  "/fees/categories": "fees-related",
  "/fees/setup": "fees-related",
  "/fees/discounts": "fees-related",
};

/**
 * Get configuration hub navigation with smart section selection
 * @param currentPath - Current page path (e.g., "/teachers")
 * @returns Navigation object for PageHeader links
 */
export function getConfigHubNavigation(currentPath: string) {
  return {
    title: "Basic Configuration",
    path: "/configuration",
    state: { returnPath: currentPath },
  };
}

/**
 * Check if current path is a config hub feature
 */
export function isConfigHubFeature(path: string): boolean {
  return path in PATH_TO_CONFIG_SECTION;
}

/**
 * Get the section ID for a given path
 */
export function getConfigSectionForPath(path: string): string | null {
  return PATH_TO_CONFIG_SECTION[path] || null;
}
