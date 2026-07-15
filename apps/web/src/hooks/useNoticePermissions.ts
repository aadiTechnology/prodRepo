import { useMemo } from "react";
import { useRBAC } from "../context/RBACContext";
import {
  isNoticeReadOnlyAudience,
  isStudentNoticeUser,
  isTeacherNoticeUser,
} from "../utils/noticeAudience";
import { useAuth } from "../context/AuthContext";

const NOTICE_MENU_PATH = "/communication/notices";

export function useNoticePermissions() {
  const { hasPermission, roles, grantedMenuPaths } = useRBAC();
  const { user } = useAuth();

  const hasNoticesMenuAccess = grantedMenuPaths.has(NOTICE_MENU_PATH);

  const canView =
    hasPermission("COMMUNICATION_MGMT:view") || hasNoticesMenuAccess;
  const canCreate = hasPermission("COMMUNICATION_MGMT:create");
  const canEdit = hasPermission("COMMUNICATION_MGMT:edit");
  const canDelete = hasPermission("COMMUNICATION_MGMT:delete");
  const canManage = canCreate || canEdit || canDelete;

  const readOnlyAudience = useMemo(
    () => isNoticeReadOnlyAudience(user?.role, roles),
    [user?.role, roles],
  );

  const isTeacherUser = useMemo(
    () => isTeacherNoticeUser(user?.role, roles),
    [user?.role, roles],
  );

  const isNoticeConsumerView = useMemo(() => {
    if (canManage) return false;
    if (!canView) return false;
    return (
      readOnlyAudience ||
      isTeacherUser ||
      isStudentNoticeUser(user?.role, roles)
    );
  }, [canManage, canView, isTeacherUser, readOnlyAudience, user?.role, roles]);

  const isViewOnly = canView && !canManage;

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canManage,
    readOnlyAudience,
    isTeacherUser,
    isViewOnly,
    isNoticeConsumerView,
  };
}
