import { useEffect, useMemo, useState } from "react";
import { useRBAC } from "../context/RBACContext";
import { useAuth } from "../context/AuthContext";
import { isHomeworkReadOnlyAudience } from "../utils/homeworkAudience";
import activityGalleryService from "../api/services/activityGalleryService";
import type { GalleryAccessPermissions } from "../types/activityGallery";

export function useActivityGalleryPermissions() {
  const { hasPermission, roles, isInitialized } = useRBAC();
  const { user } = useAuth();
  const [backendPerms, setBackendPerms] = useState<GalleryAccessPermissions | null>(null);
  const [backendLoaded, setBackendLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activityGalleryService
      .getMyPermissions()
      .then((perms) => {
        if (!cancelled) setBackendPerms(perms);
      })
      .catch(() => {
        if (!cancelled) setBackendPerms(null);
      })
      .finally(() => {
        if (!cancelled) setBackendLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const readOnlyAudience = useMemo(
    () => isHomeworkReadOnlyAudience(user?.role, roles),
    [user?.role, roles],
  );

  const canView =
    hasPermission("ACTIVITY_GALLERY_MGMT:view") || backendPerms?.can_view === true;
  const canCreate =
    hasPermission("ACTIVITY_GALLERY_MGMT:create") || backendPerms?.can_create === true;
  const canEdit =
    hasPermission("ACTIVITY_GALLERY_MGMT:edit") || backendPerms?.can_edit === true;
  const canDelete =
    hasPermission("ACTIVITY_GALLERY_MGMT:delete") || backendPerms?.can_delete === true;

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    readOnlyAudience,
    isLoading: !isInitialized || !backendLoaded,
    /** @deprecated use canCreate — kept for callers that checked class-teacher bypass */
    classTeacherCanManage:
      backendPerms?.can_create === true ||
      backendPerms?.can_edit === true ||
      backendPerms?.can_delete === true,
  };
}
