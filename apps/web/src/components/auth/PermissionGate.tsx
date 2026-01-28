/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 * Use this to show/hide UI elements based on permissions
 */

import { ReactNode } from "react";
import { useRBAC } from "../../context/RBACContext";

interface PermissionGateProps {
  children: ReactNode;
  /**
   * Single permission or array of permissions to check
   * If array provided, checks if user has ANY permission (OR logic)
   */
  permission: string | string[];
  /**
   * If true, requires ALL permissions (AND logic)
   * Only applies when permission is an array
   * @default false
   */
  requireAll?: boolean;
  /**
   * Content to render if permission check fails
   * If not provided, nothing is rendered
   */
  fallback?: ReactNode;
}

/**
 * PermissionGate - Conditionally render content based on permissions
 *
 * @example
 * // Single permission
 * <PermissionGate permission="USER_EDIT">
 *   <Button>Edit User</Button>
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (OR - user needs ANY)
 * <PermissionGate permission={["USER_EDIT", "USER_DELETE"]}>
 *   <Button>Actions</Button>
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (AND - user needs ALL)
 * <PermissionGate permission={["USER_VIEW", "USER_EXPORT"]} requireAll>
 *   <Button>Export</Button>
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission="USER_DELETE" fallback={<Typography>No access</Typography>}>
 *   <Button>Delete</Button>
 * </PermissionGate>
 */
export default function PermissionGate({
  children,
  permission,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useRBAC();

  // Determine if user has required permission(s)
  let hasAccess = false;

  if (typeof permission === "string") {
    // Single permission check
    hasAccess = hasPermission(permission);
  } else if (Array.isArray(permission)) {
    // Multiple permissions check
    if (requireAll) {
      hasAccess = hasAllPermissions(permission);
    } else {
      hasAccess = hasAnyPermission(permission);
    }
  }

  // Render children if user has access, otherwise render fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
