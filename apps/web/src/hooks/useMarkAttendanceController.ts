import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import schoolClassService, { SchoolClass, ClassDivision } from "../api/services/schoolClassService";
import academicYearService, { AcademicYear } from "../api/services/academicYearService";
import attendanceService, { AttendanceResponse } from "../api/services/attendanceService";
import teacherService, { TeacherResponse } from "../api/services/teacherService";
import { TeacherAssignmentApiItem } from "../api/teacherAssignmentApi";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import {
  buildTeacherFallbackMappings,
  fetchAllTeacherAssignments,
  filterTeachersWithAssignments,
  getFilteredClassesForTeacher,
  getFilteredDivisionsForTeacher,
  getTeacherClassDivisionPairs,
  getTeacherScopedMappings,
  resolveTeacherForUser,
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

  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: "error" });
  };

  const isTeacherDateRestricted = (attendanceDate: string) =>
    isTeacher && attendanceDate !== today;

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
        const [yearsResult, teacherListResult, classListResult, assignmentResult] =
          await Promise.allSettled([
            academicYearService.getAll(),
            teacherService.list({ limit: 1000 }),
            schoolClassService.getAll(),
            fetchAllTeacherAssignments(),
          ]);

        const years = yearsResult.status === "fulfilled" ? yearsResult.value : [];
        const teacherList =
          teacherListResult.status === "fulfilled"
            ? teacherListResult.value
            : { items: [], total: 0 };
        const classList = classListResult.status === "fulfilled" ? classListResult.value : [];
        let assignmentList =
          assignmentResult.status === "fulfilled" ? assignmentResult.value : [];

        setAcademicYears(years);
        setClasses(classList);

        const uniqueTeachersById = new Map<number, TeacherResponse>();
        teacherList.items.forEach((t) => {
          if (!uniqueTeachersById.has(t.id)) uniqueTeachersById.set(t.id, t);
        });
        const uniqueTeachers = Array.from(uniqueTeachersById.values());
        setAllTeachers(uniqueTeachers);

        const activeYear = years.find((y) => y.is_active);
        const activeYearId = activeYear?.id ?? 0;

        if (isTeacher && user?.id) {
          let myTeacher = resolveTeacherForUser(uniqueTeachers, user.id, user.email);
          if (myTeacher) {
            let teacherDetail = myTeacher;
            try {
              teacherDetail = await teacherService.getById(myTeacher.id);
            } catch (detailError) {
              console.warn("Failed to fetch teacher detail for assignments", detailError);
            }

            const ownMappings = assignmentList.filter((a) => a.teacher_id === teacherDetail.id);
            if (ownMappings.length === 0) {
              assignmentList = [
                ...assignmentList,
                ...buildTeacherFallbackMappings(teacherDetail, classList),
              ];
            }
            setAssignmentMappings(assignmentList);
            setAllTeachers(
              uniqueTeachers.map((t) => (t.id === teacherDetail.id ? teacherDetail : t))
            );

            const scoped = getTeacherScopedMappings(
              assignmentList,
              teacherDetail.id,
              activeYearId
            );
            const pairs = getTeacherClassDivisionPairs(scoped);
            const firstPair = pairs[0];

            setFilters((prev) => ({
              ...prev,
              academic_year_id: activeYearId || prev.academic_year_id,
              teacher_id: teacherDetail.id,
              class_id: firstPair?.class_id ?? teacherDetail.class_id ?? 0,
              division_id: firstPair?.division_id ?? teacherDetail.class_division_id ?? 0,
            }));
          } else {
            setAssignmentMappings(assignmentList);
            if (activeYear) {
              setFilters((prev) => ({ ...prev, academic_year_id: activeYear.id }));
            }
          }
        } else {
          setAssignmentMappings(assignmentList);
          if (activeYear) {
            setFilters((prev) => ({ ...prev, academic_year_id: activeYear.id }));
          }
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    };
    loadInitialData();
  }, [isTeacher, user?.id, user?.email]);

  const teachers = useMemo(() => {
    if (isTeacher) {
      if (filters.teacher_id) {
        const me = allTeachers.find((t) => t.id === filters.teacher_id);
        return me ? [me] : [];
      }
      const me = resolveTeacherForUser(allTeachers, user?.id, user?.email);
      return me ? [me] : [];
    }
    return filterTeachersWithAssignments(
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
      getTeacherScopedMappings(
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
        filters.teacher_id
      ),
    [classes, allTeachers, teacherScopedMappings, filters.teacher_id]
  );

  const filteredDivisions = useMemo(
    () =>
      getFilteredDivisionsForTeacher(
        classes,
        allTeachers,
        teacherScopedMappings,
        filters.teacher_id,
        filters.class_id
      ),
    [classes, allTeachers, teacherScopedMappings, filters.teacher_id, filters.class_id]
  );

  const lockClassFilter = isTeacher && filteredClasses.length === 1;
  const lockDivisionFilter = isTeacher && filteredDivisions.length === 1;
  const disableClassUntilTeacherSelected = !isTeacher && !filters.teacher_id;

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

  useEffect(() => {
    setDivisions(filteredDivisions);
    if (filteredDivisions.length > 0) {
      const isCurrentDivInFiltered = filteredDivisions.some((d) => d.id === filters.division_id);
      if (!isCurrentDivInFiltered) {
        setFilters((prev) => ({ ...prev, division_id: filteredDivisions[0].id }));
      }
    } else {
      setFilters((prev) => ({ ...prev, division_id: 0 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDivisions]);

  useEffect(() => {
    if (filters.class_id && filteredClasses.length > 0) {
      const isCurrentClassInFiltered = filteredClasses.some((c) => c.id === filters.class_id);
      if (!isCurrentClassInFiltered) {
        setFilters((prev) => ({ ...prev, class_id: filteredClasses[0].id }));
      }
    } else if (!filters.class_id && filteredClasses.length > 0) {
      setFilters((prev) => ({ ...prev, class_id: filteredClasses[0].id }));
    } else if (filteredClasses.length === 0 && filters.class_id !== 0) {
      setFilters((prev) => ({ ...prev, class_id: 0 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClasses]);

  const prevAutoFetchKey = useRef<string>("");
  useEffect(() => {
    const key = `${filters.class_id}_${filters.division_id}_${filters.attendance_date}`;
    if (
      filters.class_id &&
      filters.division_id &&
      filters.attendance_date &&
      key !== prevAutoFetchKey.current
    ) {
      prevAutoFetchKey.current = key;
      if (filters.attendance_date > today) return;
      void fetchStudents();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.class_id, filters.division_id, filters.attendance_date]);

  const fetchStudents = useCallback(async () => {
    if (!filters.class_id) {
      showError("Please select Class");
      return;
    }
    if (!filters.division_id) {
      showError("Please select Division");
      return;
    }
    if (!filters.attendance_date) {
      showError("Please select Date");
      return;
    }
    if (isTeacherDateRestricted(filters.attendance_date)) {
      showError("You cannot edit past attendance");
      return;
    }
    if (isFutureDate(filters.attendance_date)) {
      showError("You cannot mark attendance for future dates");
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

    setLoading(true);
    try {
      const data = await attendanceService.getAttendance({
        attendance_date: filters.attendance_date,
        class_id: filters.class_id,
        division_id: filters.division_id,
        academic_year_id: filters.academic_year_id || undefined,
      });
      setStudents(data.attendance);
    } catch (err) {
      console.error("Failed to fetch students", err);
      showError(resolveNetworkErrorMessage("Unable to load student list", err));
    } finally {
      setLoading(false);
    }
  }, [filters, academicYears, today]);

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
    if (isTeacherDateRestricted(filters.attendance_date)) {
      showError("You cannot edit past attendance");
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
    setStudents([]);
    prevAutoFetchKey.current = "";
    if (!isTeacher) {
      setFilters((prev) => ({
        ...prev,
        teacher_id: 0,
        class_id: 0,
        division_id: 0,
        attendance_date: today,
      }));
    } else {
      const scoped = getTeacherScopedMappings(
        assignmentMappings,
        filters.teacher_id,
        filters.academic_year_id
      );
      const pairs = getTeacherClassDivisionPairs(scoped);
      const firstPair = pairs[0];
      setFilters((prev) => ({
        ...prev,
        class_id: firstPair?.class_id ?? 0,
        division_id: firstPair?.division_id ?? 0,
        attendance_date: today,
      }));
    }
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
    setFilters,
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
  };
}
