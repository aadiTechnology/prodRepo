import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import type { SupportQueryActorRole } from "../pages/support/support.types";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];
const SCHOOL_ADMIN_ROLES = ["TENANT_ADMIN", "ADMIN", "SCHOOL_ADMIN"];
const SUPPORT_VIEW_ROLES = [
  ...SUPER_ADMIN_ROLES,
  ...SCHOOL_ADMIN_ROLES,
  "TEACHER",
  "STUDENT",
];
const MY_QUERIES_ROLES = [
  ...SUPER_ADMIN_ROLES,
  ...SCHOOL_ADMIN_ROLES,
  "TEACHER",
];

function roleCodesInclude(roleCodes: string[], candidates: string[]): boolean {
  const normalized = roleCodes.map((r) => r.toUpperCase());
  return candidates.some((c) => normalized.includes(c.toUpperCase()));
}

export function resolveSupportActorRole(roleCodes: string[]): SupportQueryActorRole | null {
  const normalized = roleCodes.map((r) => r.toUpperCase());
  if (roleCodesInclude(normalized, SUPER_ADMIN_ROLES)) return "SUPER_ADMIN";
  if (roleCodesInclude(normalized, SCHOOL_ADMIN_ROLES)) return "ADMIN";
  if (normalized.includes("TEACHER")) return "TEACHER";
  if (normalized.includes("STUDENT")) return "STUDENT";
  return null;
}

export function useSupportPermissions() {
  const { user } = useAuth();
  const { hasAnyRole } = useRBAC();

  return useMemo(() => {
    const roleCodes = user?.roles ?? (user?.role ? [user.role] : []);
    const isSuperAdmin =
      hasAnyRole(SUPER_ADMIN_ROLES) || roleCodesInclude(roleCodes, SUPER_ADMIN_ROLES);
    const isSchoolAdmin =
      hasAnyRole(SCHOOL_ADMIN_ROLES) || roleCodesInclude(roleCodes, SCHOOL_ADMIN_ROLES);
    const isTeacher = hasAnyRole(["TEACHER"]) || roleCodesInclude(roleCodes, ["TEACHER"]);
    const isStudent = hasAnyRole(["STUDENT"]) || roleCodesInclude(roleCodes, ["STUDENT"]);

    const canAccessSupport =
      hasAnyRole(SUPPORT_VIEW_ROLES) || roleCodesInclude(roleCodes, SUPPORT_VIEW_ROLES);

    const canViewMyQueries =
      canAccessSupport &&
      (hasAnyRole(MY_QUERIES_ROLES) || roleCodesInclude(roleCodes, MY_QUERIES_ROLES));

    const canAccessReleaseNotesPage = canAccessSupport;

    const canCreateQuery = canViewMyQueries;
    const actorRole = resolveSupportActorRole(roleCodes);
    const actorDisplayName =
      user?.full_name ||
      (actorRole === "SUPER_ADMIN"
        ? "Super Admin"
        : actorRole === "ADMIN"
          ? "Admin"
          : actorRole === "TEACHER"
            ? "Teacher"
            : actorRole === "STUDENT"
              ? "Student"
              : "User");

    const tenantId = user?.tenant_id ?? user?.tenant?.id ?? 1;
    const tenantName = user?.tenant?.name ?? "Little Stars Academy";

    return {
      canAccessSupport,
      canViewMyQueries,
      canAccessReleaseNotesPage,
      /** @deprecated Use canAccessReleaseNotesPage */
      canViewReleaseNotes: canAccessReleaseNotesPage,
      canCreateQuery,
      canManageFaqs: isSuperAdmin || isSchoolAdmin,
      canManageProductUpdates: isSuperAdmin,
      canViewProductUpdates: canAccessReleaseNotesPage,
      isSuperAdmin,
      isSchoolAdmin,
      isTeacher,
      isStudent,
      actorRole,
      actorDisplayName,
      tenantId,
      tenantName,
      viewAllTenants: isSuperAdmin,
      roleCodes,
    };
  }, [hasAnyRole, user]);
}
