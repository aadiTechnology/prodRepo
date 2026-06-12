import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import schoolClassService, { SchoolClass, ClassDivision } from "../api/services/schoolClassService";
import academicYearService, { AcademicYear } from "../api/services/academicYearService";
import attendanceService, { AttendanceResponse } from "../api/services/attendanceService";
import teacherService, { TeacherResponse } from "../api/services/teacherService";
import { TeacherAssignmentApiItem } from "../api/teacherAssignmentApi";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import {
  buildMappingsFromAttendanceScope,
  fetchAllTeacherAssignments,
  filterTeachersWithClassTeacherAssignments,
  getFilteredClassesForTeacher,
  getFilteredDivisionsForTeacher,
  getTeacherClassDivisionPairs,
  getTeacherAttendanceScopedMappings,
  resolveTeacherForUser,
  scopeToSchoolClasses,
} from "../utils/teacherAttendanceScope";

export interface AttendanceFilters {
  academic_year_id: number;
  teacher_id: number;
  class_id: number;
  division_id: number;
  attendance_date: string;
}

export interface UseMarkAttendanceControllerResult {
  academicYears: AcademicYear[];
  teachers: TeacherResponse[];
  classes: SchoolClass[];
  divisions: ClassDivision[];
  filters: AttendanceFilters;
  students: AttendanceResponse[];
  loading: boolean;
  saving: boolean;
  snackbar: { open: boolean; message: string; severity: 'success' | 'error' };
  setFilters: React.Dispatch<React.SetStateAction<AttendanceFilters>>;
  setSnackbar: React.Dispatch<React.SetStateAction<{ open: boolean; message: string; severity: 'success' | 'error' }>>;
  fetchStudents: () => Promise<void>;
  updateStudentStatus: (studentId: number, status: string) => void;
  updateStudentRemarks: (studentId: number, remarks: string) => void;
  markAllPresent: () => void;
  saveAttendance: () => Promise<void>;
  resetFilters: () => void;
  filteredClasses: SchoolClass[];
  filteredDivisions: ClassDivision[];
  isTeacher: boolean;
  lockClassFilter: boolean;
  lockDivisionFilter: boolean;
  disableClassUntilTeacherSelected: boolean;
  hasClassTeacherAttendanceScope: boolean;
  classTeacherAttendancePairCount: number;
}

export function useMarkAttendanceController(): UseMarkAttendanceControllerResult {
  const { user } = useAuth();
  const { hasRole } = useRBAC();
  const today = new Date().toISOString().split('T')[0];
  const isTeacher = hasRole('TEACHER');

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  const [assignmentMappings, setAssignmentMappings] = useState<TeacherAssignmentApiItem[]>([]);

  const [filters, setFilters] = useState<AttendanceFilters>({
    academic_year_id: 0,
    teacher_id: 0,
    class_id: 0,
    division_id: 0,
    attendance_date: today,
  });

  const [students, setStudents] = useState<AttendanceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: "",
    severity: 'success',
  });

  const prevAcademicYearId = useRef<number>(0);
  const prevAutoFetchKey = useRef<string>("");
  const suppressAutoFillRef = useRef(false);
  const scopeReloadingRef = useRef(false);

  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: "error" });
  };

  const isFutureDate = (attendanceDate: string) => attendanceDate > today;

  const resolveNetworkErrorMessage = (fallback: string, err: unknown) => {
    const errorLike = err as { response?: unknown };
    if (!errorLike?.response) {
      return "Check your internet connection";
    }
    return fallback;
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const years = await academicYearService.listActive();
        setAcademicYears(years);
        const activeYear = years.find((y) => y.is_active);
        const activeYearId = activeYear?.id ?? 0;

        if (isTeacher && user?.id) {
          // Teacher-safe source: /attendance/my-scope (already class-teacher scoped in backend).
          const scope = await attendanceService.getMyScope(activeYearId || undefined);
          const teacherId = scope.teacher_id;
          const assignmentList = buildMappingsFromAttendanceScope(scope, activeYearId);
          const classList = scopeToSchoolClasses(scope, user.tenant_id ?? 0);

          let teacherDetail: TeacherResponse | null = null;
          try {
            teacherDetail = await teacherService.getById(teacherId);
          } catch {
            const teacherList = await teacherService.list({ limit: 1000 });
            const me = resolveTeacherForUser(teacherList.items, user.id, user.email);
            if (me) teacherDetail = me;
          }
          if (!teacherDetail) {
            teacherDetail = {
              id: teacherId,
              full_name: scope.teacher_name || user.full_name || "Teacher",
              tenant_id: user.tenant_id ?? 0,
              mobile_number: "",
              is_active: true,
              created_at: new Date().toISOString(),
            } as TeacherResponse;
          }

          setClasses(classList);
          setAssignmentMappings(assignmentList);
          setAllTeachers([teacherDetail]);

          const scoped = getTeacherAttendanceScopedMappings(
            assignmentList,
            teacherId,
            activeYearId
          );
          const firstPair = getTeacherClassDivisionPairs(scoped)[0];

          setFilters((prev) => {
            const resolvedYearId = activeYearId || prev.academic_year_id;
            if (resolvedYearId) {
              prevAcademicYearId.current = resolvedYearId;
            }
            return {
              ...prev,
              academic_year_id: resolvedYearId,
              teacher_id: teacherId,
              class_id: firstPair?.class_id ?? teacherDetail!.class_id ?? 0,
              division_id: firstPair?.division_id ?? teacherDetail!.class_division_id ?? 0,
            };
          });
          return;
        }

        const [teacherListResult, classListResult, assignmentResult] =
          await Promise.allSettled([
            teacherService.list({ limit: 1000 }),
            schoolClassService.getAll(
              activeYearId ? { academic_year_id: activeYearId } : undefined
            ),
            fetchAllTeacherAssignments(),
          ]);

        const teacherList =
          teacherListResult.status === "fulfilled"
            ? teacherListResult.value
            : { items: [], total: 0 };
        const classList = classListResult.status === "fulfilled" ? classListResult.value : [];
        const assignmentList =
          assignmentResult.status === "fulfilled" ? assignmentResult.value : [];

        setClasses(classList);
        setAssignmentMappings(assignmentList);

        const uniqueTeachersById = new Map<number, TeacherResponse>();
        teacherList.items.forEach((t) => {
          if (!uniqueTeachersById.has(t.id)) uniqueTeachersById.set(t.id, t);
        });
        setAllTeachers(Array.from(uniqueTeachersById.values()));

        if (activeYear) {
          prevAcademicYearId.current = activeYear.id;
          setFilters((prev) => ({ ...prev, academic_year_id: activeYear.id }));
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    };
    loadInitialData();
  }, [isTeacher, user?.id, user?.email, user?.tenant_id]);

  const teachers = useMemo(() => {
    if (isTeacher) {
      if (filters.teacher_id) {
        const me = allTeachers.find((t) => t.id === filters.teacher_id);
        return me ? [me] : [];
      }
      const me = resolveTeacherForUser(allTeachers, user?.id, user?.email);
      return me ? [me] : [];
    }
    return filterTeachersWithClassTeacherAssignments(
      allTeachers,
      assignmentMappings,
      filters.academic_year_id
    );
  }, [
    isTeacher,
    allTeachers,
    assignmentMappings,
    filters.academic_year_id,
    filters.teacher_id,
    user?.id,
    user?.email,
  ]);

  const teacherScopedMappings = useMemo(
    () =>
      getTeacherAttendanceScopedMappings(
        assignmentMappings,
        filters.teacher_id,
        filters.academic_year_id
      ),
    [assignmentMappings, filters.teacher_id, filters.academic_year_id]
  );

  const filteredClasses = useMemo(
    () =>
      getFilteredClassesForTeacher(
        classes,
        allTeachers,
        teacherScopedMappings,
        filters.teacher_id,
        filters.academic_year_id,
        user?.tenant_id ?? 0
      ),
    [
      classes,
      allTeachers,
      teacherScopedMappings,
      filters.teacher_id,
      filters.academic_year_id,
      user?.tenant_id,
    ]
  );

  const filteredDivisions = useMemo(
    () =>
      getFilteredDivisionsForTeacher(
        classes,
        allTeachers,
        teacherScopedMappings,
        filters.teacher_id,
        filters.class_id,
        filters.academic_year_id,
        user?.tenant_id ?? 0
      ),
    [
      classes,
      allTeachers,
      teacherScopedMappings,
      filters.teacher_id,
      filters.class_id,
      filters.academic_year_id,
      user?.tenant_id,
    ]
  );

  const lockClassFilter = isTeacher && filteredClasses.length === 1;
  const lockDivisionFilter = isTeacher && filteredDivisions.length === 1;
  const disableClassUntilTeacherSelected = !isTeacher && !filters.teacher_id;

  const classTeacherAttendancePairCount = useMemo(() => {
    if (!isTeacher) return 0;
    return getTeacherClassDivisionPairs(
      getTeacherAttendanceScopedMappings(
        assignmentMappings,
        filters.teacher_id,
        filters.academic_year_id
      )
    ).length;
  }, [isTeacher, assignmentMappings, filters.teacher_id, filters.academic_year_id]);

  const hasClassTeacherAttendanceScope =
    !isTeacher || classTeacherAttendancePairCount > 0;

  useEffect(() => {
    if (isTeacher) return;
    if (
      filters.teacher_id &&
      !teachers.some((t) => t.id === filters.teacher_id)
    ) {
      setFilters((prev) => ({
        ...prev,
        teacher_id: 0,
        class_id: 0,
        division_id: 0,
      }));
    }
  }, [filters.academic_year_id, teachers, filters.teacher_id, isTeacher]);

  const updateFilters = useCallback((action: React.SetStateAction<AttendanceFilters>) => {
    suppressAutoFillRef.current = false;
    setFilters(action);
  }, []);

  const prevClassIdRef = useRef<number>(0);
  useEffect(() => {
    if (prevClassIdRef.current === filters.class_id) return;
    prevClassIdRef.current = filters.class_id;
    setStudents([]);
    prevAutoFetchKey.current = "";
  }, [filters.class_id]);

  useEffect(() => {
    setDivisions(filteredDivisions);
    if (suppressAutoFillRef.current) return;
    if (!filters.class_id || filteredDivisions.length === 0) {
      if (filteredDivisions.length === 0 && filters.division_id !== 0) {
        setFilters((prev) => ({ ...prev, division_id: 0 }));
      }
      return;
    }
    const isCurrentDivInFiltered = filteredDivisions.some((d) => d.id === filters.division_id);
    if (!isCurrentDivInFiltered) {
      setFilters((prev) => ({ ...prev, division_id: filteredDivisions[0].id }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDivisions, filters.class_id]);

  useEffect(() => {
    if (suppressAutoFillRef.current) return;
    if (filteredClasses.length === 0) {
      if (filters.class_id !== 0) {
        setFilters((prev) => ({ ...prev, class_id: 0, division_id: 0 }));
      }
      return;
    }

    const isCurrentClassInFiltered = filteredClasses.some((c) => c.id === filters.class_id);
    if (!isCurrentClassInFiltered) {
      const nextClassId = filteredClasses[0].id;
      const nextDivisions = getFilteredDivisionsForTeacher(
        classes,
        allTeachers,
        teacherScopedMappings,
        filters.teacher_id,
        nextClassId,
        filters.academic_year_id,
        user?.tenant_id ?? 0
      );
      setFilters((prev) => ({
        ...prev,
        class_id: nextClassId,
        division_id: nextDivisions[0]?.id ?? 0,
      }));
      return;
    }

    if (!filters.class_id) {
      const nextClassId = filteredClasses[0].id;
      const nextDivisions = getFilteredDivisionsForTeacher(
        classes,
        allTeachers,
        teacherScopedMappings,
        filters.teacher_id,
        nextClassId,
        filters.academic_year_id,
        user?.tenant_id ?? 0
      );
      setFilters((prev) => ({
        ...prev,
        class_id: nextClassId,
        division_id: nextDivisions[0]?.id ?? 0,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClasses]);

  const buildAutoFetchKey = useCallback(
    (nextFilters: AttendanceFilters) =>
      `${nextFilters.academic_year_id}_${nextFilters.class_id}_${nextFilters.division_id}_${nextFilters.attendance_date}`,
    []
  );

  const fetchStudentsWithFilters = useCallback(
    async (nextFilters: AttendanceFilters, options?: { force?: boolean }) => {
      if (!nextFilters.class_id) {
        if (!options?.force) showError("Please select Class");
        return;
      }
      if (!nextFilters.division_id) {
        if (!options?.force) showError("Please select Division");
        return;
      }
      if (!nextFilters.attendance_date) {
        if (!options?.force) showError("Please select Date");
        return;
      }
      if (isFutureDate(nextFilters.attendance_date)) {
        showError("You cannot mark attendance for future dates");
        return;
      }

      const selectedYear = academicYears.find((y) => y.id === nextFilters.academic_year_id);
      if (selectedYear) {
        if (
          nextFilters.attendance_date < selectedYear.start_date ||
          nextFilters.attendance_date > selectedYear.end_date
        ) {
          showError("Selected date is outside the academic year");
          return;
        }
      }

      setLoading(true);
      try {
        const data = await attendanceService.getAttendance({
          attendance_date: nextFilters.attendance_date,
          class_id: nextFilters.class_id,
          division_id: nextFilters.division_id,
          academic_year_id: nextFilters.academic_year_id || undefined,
        });
        setStudents(data.attendance);
        prevAutoFetchKey.current = buildAutoFetchKey(nextFilters);
      } catch (err) {
        console.error("Failed to fetch students", err);
        showError(resolveNetworkErrorMessage("Unable to load student list", err));
      } finally {
        setLoading(false);
      }
    },
    [academicYears, today, buildAutoFetchKey]
  );

  const fetchStudents = useCallback(
    () => fetchStudentsWithFilters(filters),
    [filters, fetchStudentsWithFilters]
  );

  useEffect(() => {
    const key = buildAutoFetchKey(filters);
    if (
      !scopeReloadingRef.current &&
      filters.class_id &&
      filters.division_id &&
      filters.attendance_date &&
      filters.academic_year_id &&
      key !== prevAutoFetchKey.current
    ) {
      if (filters.attendance_date > today) return;
      void fetchStudentsWithFilters(filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.academic_year_id,
    filters.class_id,
    filters.division_id,
    filters.attendance_date,
    buildAutoFetchKey,
    fetchStudentsWithFilters,
  ]);

  const updateStudentStatus = (studentId: number, status: string) => {
    setStudents((prev) => prev.map((s) => (s.student_id === studentId ? { ...s, status } : s)));
  };

  const updateStudentRemarks = (studentId: number, remarks: string) => {
    setStudents((prev) => prev.map((s) => (s.student_id === studentId ? { ...s, remarks } : s)));
  };

  const markAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: "Present" })));
  };

  const saveAttendance = async () => {
    if (!students.length) return;
    if (!filters.class_id) {
      showError("Please select Class");
      return;
    }
    if (!filters.division_id) {
      showError("Please select Division");
      return;
    }
    if (isFutureDate(filters.attendance_date)) {
      showError("You cannot mark attendance for future dates");
      return;
    }
    if (students.some((student) => !student.status)) {
      showError("Please mark attendance for all students");
      return;
    }

    const selectedYear = academicYears.find((y) => y.id === filters.academic_year_id);
    if (selectedYear) {
      if (
        filters.attendance_date < selectedYear.start_date ||
        filters.attendance_date > selectedYear.end_date
      ) {
        showError("Selected date is outside the academic year");
        return;
      }
    }

    setSaving(true);
    try {
      await attendanceService.markAttendance({
        tenant_id: user?.tenant_id || 0,
        academic_year_id: filters.academic_year_id,
        class_id: filters.class_id,
        class_division_id: filters.division_id,
        attendance_date: filters.attendance_date,
        records: students.map((s) => ({
          student_id: s.student_id,
          status: s.status || "Present",
          remarks: s.remarks || "",
        })),
      });
      setSnackbar({ open: true, message: "Attendance saved successfully", severity: "success" });
    } catch (err) {
      console.error("Failed to save attendance", err);
      showError(resolveNetworkErrorMessage("Failed to save attendance", err));
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    const activeYear = academicYears.find((y) => y.is_active);
    const activeYearId = activeYear?.id ?? 0;
    prevAutoFetchKey.current = "";

    if (!isTeacher) {
      suppressAutoFillRef.current = true;
      if (activeYearId) {
        prevAcademicYearId.current = activeYearId;
      }
      setStudents([]);
      setLoading(false);
      setFilters({
        academic_year_id: activeYearId,
        teacher_id: 0,
        class_id: 0,
        division_id: 0,
        attendance_date: today,
      });
      return;
    }

    if (!user?.id) return;

    void (async () => {
      try {
        suppressAutoFillRef.current = false;
        const scope = await attendanceService.getMyScope(activeYearId || undefined);
        const assignmentList = buildMappingsFromAttendanceScope(scope, activeYearId);
        const classList = scopeToSchoolClasses(scope, user.tenant_id ?? 0);

        setClasses(classList);
        setAssignmentMappings(assignmentList);

        const scoped = getTeacherAttendanceScopedMappings(
          assignmentList,
          scope.teacher_id,
          activeYearId
        );
        const firstPair = getTeacherClassDivisionPairs(scoped)[0];

        const nextFilters: AttendanceFilters = {
          academic_year_id: activeYearId,
          teacher_id: scope.teacher_id,
          class_id: firstPair?.class_id ?? 0,
          division_id: firstPair?.division_id ?? 0,
          attendance_date: today,
        };

        if (activeYearId) {
          prevAcademicYearId.current = activeYearId;
        }

        setFilters(nextFilters);
        await fetchStudentsWithFilters(nextFilters, { force: true });
      } catch (err) {
        console.error("Failed to refresh attendance", err);
        showError("Unable to refresh attendance");
      }
    })();
  };

  return {
    academicYears,
    teachers,
    classes,
    divisions,
    filters,
    students,
    loading,
    saving,
    snackbar,
    setFilters: updateFilters,
    setSnackbar,
    fetchStudents,
    updateStudentStatus,
    updateStudentRemarks,
    markAllPresent,
    saveAttendance,
    resetFilters,
    filteredClasses,
    filteredDivisions,
    isTeacher,
    lockClassFilter,
    lockDivisionFilter,
    disableClassUntilTeacherSelected,
    hasClassTeacherAttendanceScope,
    classTeacherAttendancePairCount,
  };
}
