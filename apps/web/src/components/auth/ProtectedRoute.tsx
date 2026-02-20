/**
 * ProtectedRoute Component
 * Wraps routes that require authentication and optionally permissions/roles
 */

import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";
import { ReactNode } from "react";

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
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

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
  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to={redirectTo} replace />;
  }

  // Check required roles
  if (requiredRoles) {
    let hasRequiredRole = false;

    if (typeof requiredRoles === "string") {
      hasRequiredRole = hasRole(requiredRoles);
    } else if (Array.isArray(requiredRoles)) {
      if (requireAllRoles) {
        hasRequiredRole = hasAllRoles(requiredRoles);
      } else {
        hasRequiredRole = hasAnyRole(requiredRoles);
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
