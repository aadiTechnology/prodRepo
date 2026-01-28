/**
 * RoleGuard Component
 * Conditionally renders children based on user roles
 * Use this to show/hide UI elements based on roles
 */

import { ReactNode } from "react";
import { useRBAC } from "../../context/RBACContext";

interface RoleGuardProps {
  children: ReactNode;
  /**
   * Single role or array of roles to check
   * If array provided, checks if user has ANY role (OR logic)
   */
  role: string | string[];
  /**
   * If true, requires ALL roles (AND logic)
   * Only applies when role is an array
   * @default false
   */
  requireAll?: boolean;
  /**
   * Content to render if role check fails
   * If not provided, nothing is rendered
   */
  fallback?: ReactNode;
}

/**
 * RoleGuard - Conditionally render content based on roles
 *
 * @example
 * // Single role
 * <RoleGuard role="ADMIN">
 *   <AdminPanel />
 * </RoleGuard>
 *
 * @example
 * // Multiple roles (OR - user needs ANY)
 * <RoleGuard role={["ADMIN", "SUPER_ADMIN"]}>
 *   <AdminFeatures />
 * </RoleGuard>
 *
 * @example
 * // With fallback
 * <RoleGuard role="ADMIN" fallback={<Typography>Admin access required</Typography>}>
 *   <AdminPanel />
 * </RoleGuard>
 */
export default function RoleGuard({
  children,
  role,
  requireAll = false,
  fallback = null,
}: RoleGuardProps) {
  const { hasRole, hasAnyRole, hasAllRoles } = useRBAC();

  // Determine if user has required role(s)
  let hasAccess = false;

  if (typeof role === "string") {
    // Single role check
    hasAccess = hasRole(role);
  } else if (Array.isArray(role)) {
    // Multiple roles check
    if (requireAll) {
      hasAccess = hasAllRoles(role);
    } else {
      hasAccess = hasAnyRole(role);
    }
  }

  // Render children if user has access, otherwise render fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
