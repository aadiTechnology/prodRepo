/**
 * Permission Checking Utilities
 * Helper functions for checking user permissions
 */

/**
 * Check if user has a specific permission
 * @param permission - Permission code to check (e.g., "USER_EDIT")
 * @param userPermissions - Array of user's permission codes
 * @returns true if user has the permission
 */
export function checkPermission(
  permission: string,
  userPermissions: string[]
): boolean {
  return userPermissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions (OR logic)
 * @param permissions - Array of permission codes to check
 * @param userPermissions - Array of user's permission codes
 * @returns true if user has at least one of the permissions
 */
export function hasAnyPermission(
  permissions: string[],
  userPermissions: string[]
): boolean {
  return permissions.some((perm) => userPermissions.includes(perm));
}

/**
 * Check if user has all of the specified permissions (AND logic)
 * @param permissions - Array of permission codes to check
 * @param userPermissions - Array of user's permission codes
 * @returns true if user has all of the permissions
 */
export function hasAllPermissions(
  permissions: string[],
  userPermissions: string[]
): boolean {
  return permissions.every((perm) => userPermissions.includes(perm));
}
