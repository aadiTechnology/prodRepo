import { useEffect, useMemo, useState } from "react";
import academicYearService from "../api/services/academicYearService";
import attendanceService from "../api/services/attendanceService";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import { isTeacherNoticeUser } from "../utils/noticeAudience";

type TeacherClassOption = { value: string; label: string };

type UseTeacherStudentListScopeResult = {
  isTeacherScoped: boolean;
  scopeReady: boolean;
  defaultClassId: string;
  teacherClassOptions: TeacherClassOption[];
};

/**
 * When a teacher has Student Management access, default the list to their assigned class.
 */
export function useTeacherStudentListScope(): UseTeacherStudentListScopeResult {
  const { user } = useAuth();
  const { roles, hasAnyRole } = useRBAC();

  const isTeacherScoped = useMemo(() => {
    const isAdminLike = hasAnyRole(["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"]);
    return !isAdminLike && isTeacherNoticeUser(user?.role, roles);
  }, [hasAnyRole, roles, user?.role]);

  const [scopeReady, setScopeReady] = useState(!isTeacherScoped);
  const [defaultClassId, setDefaultClassId] = useState("");
  const [teacherClassOptions, setTeacherClassOptions] = useState<TeacherClassOption[]>([]);

  useEffect(() => {
    if (!isTeacherScoped) {
      setScopeReady(true);
      setDefaultClassId("");
      setTeacherClassOptions([]);
      return;
    }

    let cancelled = false;

    const loadTeacherScope = async () => {
      setScopeReady(false);
      try {
        const years = await academicYearService.listActive();
        const activeYearId = years.find((y) => y.is_active)?.id;
        const scope = await attendanceService.getMyScope(activeYearId);
        if (cancelled) return;

        const options: TeacherClassOption[] = scope.classes.map((cls) => ({
          value: String(cls.id),
          label: cls.name,
        }));
        const firstClassId = options[0]?.value ?? "";

        setTeacherClassOptions(options);
        setDefaultClassId(firstClassId);
      } catch {
        if (!cancelled) {
          setTeacherClassOptions([]);
          setDefaultClassId("");
        }
      } finally {
        if (!cancelled) {
          setScopeReady(true);
        }
      }
    };

    void loadTeacherScope();

    return () => {
      cancelled = true;
    };
  }, [isTeacherScoped, user?.id]);

  return {
    isTeacherScoped,
    scopeReady,
    defaultClassId,
    teacherClassOptions,
  };
}
