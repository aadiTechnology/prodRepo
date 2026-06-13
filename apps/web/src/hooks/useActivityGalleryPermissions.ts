import { useEffect, useMemo, useState } from "react";
import { useRBAC } from "../context/RBACContext";
import { useAuth } from "../context/AuthContext";
import { isHomeworkReadOnlyAudience } from "../utils/homeworkAudience";
import activityGalleryService from "../api/services/activityGalleryService";

export function useActivityGalleryPermissions() {
  const { hasPermission, roles } = useRBAC();
  const { user } = useAuth();
  const [classTeacherCanManage, setClassTeacherCanManage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activityGalleryService
      .getTeacherScope()
      .then((scope) => {
        if (cancelled) return;
        setClassTeacherCanManage(
          scope.is_teacher && scope.default_targets.length > 0,
        );
      })
      .catch(() => {
        if (!cancelled) setClassTeacherCanManage(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const readOnlyAudience = useMemo(
    () => isHomeworkReadOnlyAudience(user?.role, roles),
    [user?.role, roles],
  );

  const canView = hasPermission("ACTIVITY_GALLERY_MGMT:view");
  const canCreate =
    hasPermission("ACTIVITY_GALLERY_MGMT:create") || classTeacherCanManage;
  const canEdit =
    hasPermission("ACTIVITY_GALLERY_MGMT:edit") || classTeacherCanManage;
  const canDelete = hasPermission("ACTIVITY_GALLERY_MGMT:delete");

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    readOnlyAudience,
    classTeacherCanManage,
  };
}
