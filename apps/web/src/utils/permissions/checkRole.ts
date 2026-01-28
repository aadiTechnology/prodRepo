/**
 * Role Checking Utilities
 * Helper functions for checking user roles
 */

/**
 * Check if user has a specific role
 * @param role - Role code to check (e.g., "ADMIN")
 * @param userRoles - Array of user's role codes
 * @returns true if user has the role
 */
export function checkRole(role: string, userRoles: string[]): boolean {
  return userRoles.includes(role);
}

/**
 * Check if user has any of the specified roles (OR logic)
 * @param roles - Array of role codes to check
 * @param userRoles - Array of user's role codes
 * @returns true if user has at least one of the roles
 */
export function hasAnyRole(roles: string[], userRoles: string[]): boolean {
  return roles.some((role) => userRoles.includes(role));
}

/**
 * Check if user has all of the specified roles (AND logic)
 * @param roles - Array of role codes to check
 * @param userRoles - Array of user's role codes
 * @returns true if user has all of the roles
 */
export function hasAllRoles(roles: string[], userRoles: string[]): boolean {
  return roles.every((role) => userRoles.includes(role));
}
