/**
 * ProtectedRoute Component - Route guard for authentication and authorization
 * Wraps routes that require authentication and optionally permissions/roles
 * Uses both legacy requireAdmin and modern RBAC permission/role checking
 */

import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";
import { hasGrantedMenuAccess } from "../../utils/menuNavigation";
import { ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════
const normalizeRole = (value: string | undefined | null): string => (value || "").trim().toLowerCase();

const normalizeRequiredPermissions = (requiredPermissions: string | string[]): string[] =>
  typeof requiredPermissions === "string" ? [requiredPermissions] : requiredPermissions;

const canUseMenuPathFallback = (requiredPermissions: string | string[]): boolean =>
  normalizeRequiredPermissions(requiredPermissions).every((permission) =>
    permission.trim().toLowerCase().endsWith(":view")
  );

// ═══════════════════════════════════════════════════════════════════════════
// Props Interface
// ═══════════════════════════════════════════════════════════════════════════
interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Legacy: Require admin role (backward compatibility)
   * @deprecated Use `requiredRoles={["ADMIN"]}` instead
   */
  requireAdmin?: boolean;
  /**
   * Required permissions (user must have at least one if array, or all if requireAllPermissions is true)
   */
  requiredPermissions?: string | string[];
  /**
   * Required roles (user must have at least one if array, or all if requireAllRoles is true)
   */
  requiredRoles?: string | string[];
  /**
   * If true, user must have ALL required permissions (AND logic)
   * @default false
   */
  requireAllPermissions?: boolean;
  /**
   * If true, user must have ALL required roles (AND logic)
   * @default false
   */
  requireAllRoles?: boolean;
  /**
   * Redirect path when access is denied
   * @default "/"
   */
  redirectTo?: string;
  /**
   * Show unauthorized message instead of redirecting
   * @default false
   */
  showUnauthorized?: boolean;
}

/**
 * ProtectedRoute - Protects routes with authentication and optional permission/role checks
 *
 * @example
 * // Basic authentication only
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * @example
 * // Require specific permission
 * <ProtectedRoute requiredPermissions="USER_EDIT">
 *   <EditUserPage />
 * </ProtectedRoute>
 *
 * @example
 * // Require any of multiple permissions
 * <ProtectedRoute requiredPermissions={["USER_EDIT", "USER_DELETE"]}>
 *   <UserActionsPage />
 * </ProtectedRoute>
 *
 * @example
 * // Require all permissions
 * <ProtectedRoute
 *   requiredPermissions={["USER_VIEW", "USER_EXPORT"]}
 *   requireAllPermissions
 * >
 *   <ExportPage />
 * </ProtectedRoute>
 *
 * @example
 * // Require specific role
 * <ProtectedRoute requiredRoles="ADMIN">
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * @example
 * // Show unauthorized message
 * <ProtectedRoute
 *   requiredPermissions="USER_DELETE"
 *   showUnauthorized
 * >
 *   <DeletePage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requiredPermissions,
  requiredRoles,
  requireAllPermissions = false,
  requireAllRoles = false,
  redirectTo = "/",
  showUnauthorized = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    grantedMenuPaths,
  } = useRBAC();
  const location = useLocation();
  const userRole = normalizeRole(user?.role);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Legacy: Check admin role (backward compatibility)
  if (requireAdmin && userRole !== "admin") {
    return <Navigate to={redirectTo} replace />;
  }

  // Check required roles
  if (requiredRoles) {
    let hasRequiredRole = false;
    const normalizedRequiredRoles = (typeof requiredRoles === "string" ? [requiredRoles] : requiredRoles).map(normalizeRole);

    if (typeof requiredRoles === "string") {
      hasRequiredRole = hasRole(requiredRoles) || normalizedRequiredRoles.includes(userRole);
    } else if (Array.isArray(requiredRoles)) {
      if (requireAllRoles) {
        hasRequiredRole = hasAllRoles(requiredRoles) || normalizedRequiredRoles.every((r) => r === userRole);
      } else {
        hasRequiredRole = hasAnyRole(requiredRoles) || normalizedRequiredRoles.includes(userRole);
      }
    }

    if (!hasRequiredRole) {
      if (showUnauthorized) {
        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "400px",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="h5" color="error">
              Access Denied
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You do not have the required role to access this page.
            </Typography>
          </Box>
        );
      }
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check required permissions
  if (requiredPermissions) {
    let hasRequiredPermission = false;

    if (typeof requiredPermissions === "string") {
      hasRequiredPermission = hasPermission(requiredPermissions);
    } else if (Array.isArray(requiredPermissions)) {
      if (requireAllPermissions) {
        hasRequiredPermission = hasAllPermissions(requiredPermissions);
      } else {
        hasRequiredPermission = hasAnyPermission(requiredPermissions);
      }
    }

    if (!hasRequiredPermission && canUseMenuPathFallback(requiredPermissions)) {
      hasRequiredPermission = hasGrantedMenuAccess(location.pathname, grantedMenuPaths);
    }

    if (!hasRequiredPermission) {
      if (showUnauthorized) {
        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "400px",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="h5" color="error">
              Access Denied
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You do not have the required permission to access this page.
            </Typography>
          </Box>
        );
      }
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
}
