import { useEffect, useMemo, useState } from "react";
import academicYearService from "../api/services/academicYearService";
import attendanceService from "../api/services/attendanceService";
import type { SchoolClass } from "../api/services/schoolClassService";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import { isTeacherNoticeUser } from "../utils/noticeAudience";
import {
  buildMappingsFromAttendanceScope,
  getTeacherAttendanceScopedMappings,
  getTeacherClassDivisionPairs,
  scopeToSchoolClasses,
} from "../utils/teacherAttendanceScope";

type TeacherClassOption = { value: string; label: string };

type UseTeacherStudentListScopeResult = {
  isTeacherScoped: boolean;
  scopeReady: boolean;
  defaultClassId: string;
  defaultDivisionId: string;
  teacherClassOptions: TeacherClassOption[];
  teacherClasses: SchoolClass[];
};

/**
 * When a teacher has Student Management access, default the list to their assigned class and division.
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
  const [defaultDivisionId, setDefaultDivisionId] = useState("");
  const [teacherClassOptions, setTeacherClassOptions] = useState<TeacherClassOption[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<SchoolClass[]>([]);

  useEffect(() => {
    if (!isTeacherScoped) {
      setScopeReady(true);
      setDefaultClassId("");
      setDefaultDivisionId("");
      setTeacherClassOptions([]);
      setTeacherClasses([]);
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

        const classList = scopeToSchoolClasses(scope, user?.tenant_id ?? 0);
        const mappings = buildMappingsFromAttendanceScope(scope, activeYearId ?? 0);
        const scoped = getTeacherAttendanceScopedMappings(
          mappings,
          scope.teacher_id,
          activeYearId ?? 0
        );
        const firstPair = getTeacherClassDivisionPairs(scoped)[0];

        const options: TeacherClassOption[] = classList.map((cls) => ({
          value: String(cls.id),
          label: cls.name,
        }));

        setTeacherClasses(classList);
        setTeacherClassOptions(options);
        setDefaultClassId(firstPair ? String(firstPair.class_id) : "");
        setDefaultDivisionId(firstPair ? String(firstPair.division_id) : "");
      } catch {
        if (!cancelled) {
          setTeacherClassOptions([]);
          setTeacherClasses([]);
          setDefaultClassId("");
          setDefaultDivisionId("");
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
  }, [isTeacherScoped, user?.id, user?.tenant_id]);

  return {
    isTeacherScoped,
    scopeReady,
    defaultClassId,
    defaultDivisionId,
    teacherClassOptions,
    teacherClasses,
  };
}
