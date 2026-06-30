import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];
const SCHOOL_ADMIN_ROLES = ["TENANT_ADMIN", "ADMIN", "SCHOOL_ADMIN"];
const SUPPORT_VIEW_ROLES = [...SUPER_ADMIN_ROLES, ...SCHOOL_ADMIN_ROLES, "TEACHER"];
const FAQ_MANAGE_ROLES = [...SUPER_ADMIN_ROLES, ...SCHOOL_ADMIN_ROLES];
const PRODUCT_UPDATE_MANAGE_ROLES = [...SUPER_ADMIN_ROLES];

export function useSupportPermissions() {
  const { user } = useAuth();
  const { hasAnyRole } = useRBAC();

  return useMemo(() => {
    const roleCodes = user?.roles ?? (user?.role ? [user.role] : []);
    const isSuperAdmin = hasAnyRole(SUPER_ADMIN_ROLES) || roleCodes.some((r) => SUPER_ADMIN_ROLES.includes(r));
    const isSchoolAdmin = hasAnyRole(SCHOOL_ADMIN_ROLES) || roleCodes.some((r) => SCHOOL_ADMIN_ROLES.includes(r));
    const isTeacher = hasAnyRole(["TEACHER"]) || roleCodes.includes("TEACHER");

    const canAccessSupport =
      hasAnyRole(SUPPORT_VIEW_ROLES) ||
      roleCodes.some((r) => SUPPORT_VIEW_ROLES.includes(r));

    const canManageFaqs =
      hasAnyRole(FAQ_MANAGE_ROLES) ||
      roleCodes.some((r) => FAQ_MANAGE_ROLES.includes(r));

    const tenantId = user?.tenant_id ?? user?.tenant?.id ?? 1;
    const tenantName = user?.tenant?.name ?? "Little Stars Academy";

    const canManageProductUpdates =
      hasAnyRole(PRODUCT_UPDATE_MANAGE_ROLES) ||
      roleCodes.some((r) => PRODUCT_UPDATE_MANAGE_ROLES.includes(r));

    const canViewProductUpdates = canAccessSupport;

    return {
      canAccessSupport,
      canManageFaqs,
      canManageProductUpdates,
      canViewProductUpdates,
      isSuperAdmin,
      isSchoolAdmin,
      isTeacher,
      tenantId,
      tenantName,
      viewAllTenants: isSuperAdmin,
    };
  }, [hasAnyRole, user]);
}
