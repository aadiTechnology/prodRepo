import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import type { SupportQueryActorRole } from "../pages/support/support.types";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];
const SCHOOL_ADMIN_ROLES = ["TENANT_ADMIN", "ADMIN", "SCHOOL_ADMIN"];
const TEACHER_ROLE_TOKENS = ["TEACHER", "TEACHERS"];
const STUDENT_ROLE_TOKENS = ["STUDENT", "STUDENTS"];
const SUPPORT_VIEW_ROLES = [
  ...SUPER_ADMIN_ROLES,
  ...SCHOOL_ADMIN_ROLES,
  ...TEACHER_ROLE_TOKENS,
  ...STUDENT_ROLE_TOKENS,
];
const MY_QUERIES_ROLES = [
  ...SUPER_ADMIN_ROLES,
  ...SCHOOL_ADMIN_ROLES,
  ...TEACHER_ROLE_TOKENS,
];

function normalizeRoleToken(value: string): string {
  return value.trim().toLowerCase();
}

function roleCodesInclude(roleCodes: string[], candidates: string[]): boolean {
  const normalized = roleCodes.map(normalizeRoleToken);
  return candidates.some((candidate) => normalized.includes(normalizeRoleToken(candidate)));
}

export function resolveSupportActorRole(roleCodes: string[]): SupportQueryActorRole | null {
  if (roleCodesInclude(roleCodes, SUPER_ADMIN_ROLES)) return "SUPER_ADMIN";
  if (roleCodesInclude(roleCodes, SCHOOL_ADMIN_ROLES)) return "ADMIN";
  if (roleCodesInclude(roleCodes, TEACHER_ROLE_TOKENS)) return "TEACHER";
  if (roleCodesInclude(roleCodes, STUDENT_ROLE_TOKENS)) return "STUDENT";
  return null;
}

export function useSupportPermissions() {
  const { user } = useAuth();
  const { hasAnyRole, roles: rbacRoles } = useRBAC();

  return useMemo(() => {
    const roleCodes =
      rbacRoles.length > 0
        ? rbacRoles
        : user?.roles?.length
          ? user.roles
          : user?.role
            ? [user.role]
            : [];
    const isSuperAdmin =
      hasAnyRole(SUPER_ADMIN_ROLES) || roleCodesInclude(roleCodes, SUPER_ADMIN_ROLES);
    const isSchoolAdmin =
      hasAnyRole(SCHOOL_ADMIN_ROLES) || roleCodesInclude(roleCodes, SCHOOL_ADMIN_ROLES);
    const isTeacher =
      hasAnyRole(TEACHER_ROLE_TOKENS) || roleCodesInclude(roleCodes, TEACHER_ROLE_TOKENS);
    const isStudent =
      hasAnyRole(STUDENT_ROLE_TOKENS) || roleCodesInclude(roleCodes, STUDENT_ROLE_TOKENS);

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
  }, [hasAnyRole, rbacRoles, user]);
}
