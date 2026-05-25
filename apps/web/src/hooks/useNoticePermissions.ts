import { useMemo } from "react";
import { useRBAC } from "../context/RBACContext";
import { isNoticeReadOnlyAudience } from "../utils/noticeAudience";
import { useAuth } from "../context/AuthContext";

export function useNoticePermissions() {
  const { hasPermission, roles } = useRBAC();
  const { user } = useAuth();

  const canView = hasPermission("COMMUNICATION_MGMT:view");
  const canCreate = hasPermission("COMMUNICATION_MGMT:create");
  const canEdit = hasPermission("COMMUNICATION_MGMT:edit");
  const canDelete = hasPermission("COMMUNICATION_MGMT:delete");
  const readOnlyAudience = useMemo(
    () => isNoticeReadOnlyAudience(user?.role, roles),
    [user?.role, roles],
  );

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    readOnlyAudience,
    isViewOnly: canView && !canCreate && !canEdit && !canDelete,
  };
}
