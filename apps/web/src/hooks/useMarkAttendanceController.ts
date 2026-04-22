import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import schoolClassService, { SchoolClass, ClassDivision } from "../api/services/schoolClassService";
import academicYearService, { AcademicYear } from "../api/services/academicYearService";
import attendanceService, { AttendanceResponse } from "../api/services/attendanceService";
import teacherService, { TeacherResponse } from "../api/services/teacherService";
import teacherAssignmentApi, { TeacherAssignmentApiItem } from "../api/teacherAssignmentApi";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";

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
  /** true when the current user is a teacher (lock teacher dropdown) */
  isTeacher: boolean;
  /** true when teacher has only one class assignment */
  lockClassFilter: boolean;
  /** true when teacher has only one division assignment for selected class */
  lockDivisionFilter: boolean;
}

export function useMarkAttendanceController(): UseMarkAttendanceControllerResult {
  const { user } = useAuth();
  const { hasRole } = useRBAC();
  const today = new Date().toISOString().split('T')[0];
  const isTeacher = hasRole('TEACHER');

  // Lists Data
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  const [assignmentMappings, setAssignmentMappings] = useState<TeacherAssignmentApiItem[]>([]);

  // Page State
  const [filters, setFilters] = useState<AttendanceFilters>({
    academic_year_id: 0,
    teacher_id: 0,
    class_id: 0,
    division_id: 0,
    attendance_date: today
  });

  const [students, setStudents] = useState<AttendanceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: "",
    severity: 'success'
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

  const fetchAllTeacherAssignments = useCallback(async (): Promise<TeacherAssignmentApiItem[]> => {
    const pageSize = 100;
    let page = 1;
    let total = 0;
    let collected: TeacherAssignmentApiItem[] = [];

    do {
      const response = await teacherAssignmentApi.getTeacherAssignments({
        page,
        limit: pageSize,
      });
      const rows = response.data || [];
      collected = collected.concat(rows);
      total = response.pagination?.total || collected.length;
      page += 1;
    } while (collected.length < total);

    return collected;
  }, []);

  const getAssignmentDivisionIds = useCallback((assignment: TeacherAssignmentApiItem): number[] => {
    const ids = [
      ...(assignment.class_division_ids || []),
      ...(assignment.class_division_id ? [assignment.class_division_id] : []),
    ];
    return Array.from(new Set(ids.filter((id): id is number => Boolean(id))));
  }, []);

  const buildTeacherFallbackMappings = useCallback(
    (teacher: TeacherResponse, classList: SchoolClass[]): TeacherAssignmentApiItem[] => {
      const rows = teacher.assignment_rows || [];
      const mappingsFromRows: TeacherAssignmentApiItem[] = rows.flatMap((row, index) => {
        if (!row.class_name || !row.division_names?.length) return [];
        const matchedClass = classList.find((c) => c.name === row.class_name);
        if (!matchedClass) return [];
        const matchedDivisionIds = matchedClass.divisions
          .filter((d) => row.division_names.includes(d.division_name))
          .map((d) => d.id);
        if (!matchedDivisionIds.length) return [];
        return [
          {
            id: -(index + 1),
            academic_year_id: matchedClass.academic_year_id ?? null,
            class_id: matchedClass.id,
            class_division_id: matchedDivisionIds[0],
            class_division_ids: matchedDivisionIds,
            class_name: matchedClass.name,
            division_name: row.division_names.join(", "),
            teacher_id: teacher.id,
            teacher_name: teacher.full_name,
            status: "ASSIGNED",
          },
        ];
      });

      const mappingsFromLegacyIds: TeacherAssignmentApiItem[] =
        teacher.class_id && teacher.class_division_id
          ? [
              {
                id: -9999,
                academic_year_id: null,
                class_id: teacher.class_id,
                class_division_id: teacher.class_division_id,
                class_division_ids: [teacher.class_division_id],
                class_name: teacher.class_name || null,
                division_name: teacher.division_name || null,
                teacher_id: teacher.id,
                teacher_name: teacher.full_name,
                status: "ASSIGNED",
              },
            ]
          : [];

      return [...mappingsFromRows, ...mappingsFromLegacyIds];
    },
    []
  );

  // Load initial metadata
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [yearsResult, teacherListResult, classListResult, assignmentResult] = await Promise.allSettled([
          academicYearService.getAll(),
          teacherService.list({ limit: 1000 }),
          schoolClassService.getAll(),
          isTeacher ? Promise.resolve([]) : fetchAllTeacherAssignments(),
        ]);

        const years = yearsResult.status === "fulfilled" ? yearsResult.value : [];
        const teacherList =
          teacherListResult.status === "fulfilled"
            ? teacherListResult.value
            : { items: [], total: 0 };
        const classList = classListResult.status === "fulfilled" ? classListResult.value : [];
        const assignmentList =
          assignmentResult.status === "fulfilled"
            ? assignmentResult.value
            : [];

        setAcademicYears(years);
        setClasses(classList);
        setAssignmentMappings(assignmentList || []);

        // Keep teacher dropdown unique by teacher id.
        const uniqueTeachersById = new Map<number, TeacherResponse>();
        teacherList.items.forEach((t) => {
          if (!uniqueTeachersById.has(t.id)) uniqueTeachersById.set(t.id, t);
        });
        const uniqueTeachers = Array.from(uniqueTeachersById.values());

        // Find active year
        const activeYear = years.find(y => y.is_active);

        if (isTeacher && user?.id) {
          // Primary match: teacher.user_id === logged-in user.id (most reliable)
          // Fallback : match by email for legacy records where user_id may be null
          let myTeacher = uniqueTeachers.find(t => String(t.user_id) === String(user.id));
          if (!myTeacher && user?.email) {
            myTeacher = uniqueTeachers.find(
              t => t.email?.toLowerCase() === user.email?.toLowerCase()
            );
          }
          if (myTeacher) {
            let teacherDetail = myTeacher;
            try {
              teacherDetail = await teacherService.getById(myTeacher.id);
            } catch (detailError) {
              console.warn("Failed to fetch teacher detail for assignment fallback", detailError);
            }

            setTeachers([teacherDetail]); // only their own name
            if (assignmentList.length === 0) {
              setAssignmentMappings(buildTeacherFallbackMappings(teacherDetail, classList));
            }
            setFilters(prev => ({
              ...prev,
              academic_year_id: activeYear?.id ?? prev.academic_year_id,
              teacher_id: teacherDetail.id,
              class_id: teacherDetail.class_id || prev.class_id,
            }));
          } else {
            setTeachers([]);
            if (activeYear) setFilters(prev => ({ ...prev, academic_year_id: activeYear.id }));
          }
        } else {
          // Admin / Tenant-Admin: show all teachers
          setTeachers(uniqueTeachers);
          if (activeYear) setFilters(prev => ({ ...prev, academic_year_id: activeYear.id }));
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    };
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, user?.id, user?.email, fetchAllTeacherAssignments, buildTeacherFallbackMappings]);

  const teacherScopedMappings = useMemo(() => {
    if (!filters.teacher_id) return [];
    return assignmentMappings.filter(
      (a) =>
        a.teacher_id === filters.teacher_id &&
        (!filters.academic_year_id ||
          a.academic_year_id === filters.academic_year_id ||
          a.academic_year_id === null)
    );
  }, [assignmentMappings, filters.teacher_id, filters.academic_year_id]);

  // Derived filtered classes
  const filteredClasses = useMemo(() => {
    if (!filters.teacher_id) return classes;

    const assignedClassIds = Array.from(
      new Set(teacherScopedMappings.map((a) => a.class_id).filter(Boolean))
    ) as number[];

    if (assignedClassIds.length > 0) {
      return classes.filter(c => assignedClassIds.includes(c.id));
    }

    // Fallback in case assignment API is unavailable.
    const selectedTeacherRows = teachers.filter((t) => t.id === filters.teacher_id);
    const legacyClassIds = Array.from(
      new Set(selectedTeacherRows.map((t) => t.class_id).filter(Boolean))
    ) as number[];
    if (legacyClassIds.length === 0) return [];
    return classes.filter(c => legacyClassIds.includes(c.id));
  }, [classes, teachers, teacherScopedMappings, filters.teacher_id]);

  // Derived filtered divisions
  const filteredDivisions = useMemo(() => {
    if (!filters.class_id) return [];
    const selectedClass = classes.find(c => c.id === filters.class_id);
    if (!selectedClass) return [];
    const allDivisions = selectedClass.divisions || [];
    if (!filters.teacher_id) return allDivisions;

    const assignedDivisionIds = Array.from(
      new Set(
        teacherScopedMappings
          .filter((a) => a.class_id === filters.class_id)
          .flatMap((a) => getAssignmentDivisionIds(a))
      )
    ) as number[];

    if (assignedDivisionIds.length > 0) {
      return allDivisions.filter(d => assignedDivisionIds.includes(d.id));
    }

    // Some assignment APIs return division name without IDs.
    const assignedDivisionNames = Array.from(
      new Set(
        teacherScopedMappings
          .filter((a) => a.class_id === filters.class_id)
          .map((a) => a.division_name?.trim().toLowerCase())
          .filter((name): name is string => Boolean(name))
      )
    );
    if (assignedDivisionNames.length > 0) {
      return allDivisions.filter((d) =>
        assignedDivisionNames.includes(d.division_name.trim().toLowerCase())
      );
    }

    // Fallback in case assignment API is unavailable.
    const selectedTeacherRows = teachers.filter(
      (t) => t.id === filters.teacher_id && t.class_id === filters.class_id
    );
    const legacyDivisionIds = Array.from(
      new Set(selectedTeacherRows.map((t) => t.class_division_id).filter(Boolean))
    ) as number[];
    if (legacyDivisionIds.length === 0) return [];
    return allDivisions.filter(d => legacyDivisionIds.includes(d.id));
  }, [classes, teachers, teacherScopedMappings, filters.teacher_id, filters.class_id, getAssignmentDivisionIds]);

  const lockClassFilter = isTeacher && filteredClasses.length === 1;
  const lockDivisionFilter = isTeacher && filteredDivisions.length === 1;

  // Sync divisions dropdown
  useEffect(() => {
    setDivisions(filteredDivisions);
    if (filteredDivisions.length > 0) {
      const isCurrentDivInFiltered = filteredDivisions.some(d => d.id === filters.division_id);
      if (!isCurrentDivInFiltered) {
        setFilters(prev => ({ ...prev, division_id: filteredDivisions[0].id }));
      }
    } else {
      setFilters(prev => ({ ...prev, division_id: 0 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDivisions]);

  // Sync class dropdown
  useEffect(() => {
    if (filters.class_id && filteredClasses.length > 0) {
      const isCurrentClassInFiltered = filteredClasses.some(c => c.id === filters.class_id);
      if (!isCurrentClassInFiltered) {
        setFilters(prev => ({ ...prev, class_id: filteredClasses[0].id }));
      }
    } else if (!filters.class_id && filteredClasses.length > 0) {
      setFilters(prev => ({ ...prev, class_id: filteredClasses[0].id }));
    } else if (filteredClasses.length === 0 && filters.class_id !== 0) {
      setFilters(prev => ({ ...prev, class_id: 0 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClasses]);

  // ── Auto-fetch: trigger when class + division + date are all set ──────────
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
      // Skip fetch for future dates silently
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

    const selectedYear = academicYears.find(y => y.id === filters.academic_year_id);
    if (selectedYear) {
      if (filters.attendance_date < selectedYear.start_date || filters.attendance_date > selectedYear.end_date) {
        showError("Selected date is outside the academic year");
        return;
      }
    }

    setLoading(true);
    try {
      const data = await attendanceService.getAttendance({
        attendance_date: filters.attendance_date,
        class_id: filters.class_id,
        division_id: filters.division_id
      });
      setStudents(data.attendance);
    } catch (err) {
      console.error("Failed to fetch students", err);
      showError(resolveNetworkErrorMessage("Unable to load student list", err));
    } finally {
      setLoading(false);
    }
  }, [filters, academicYears, isTeacher, today]);

  const updateStudentStatus = (studentId: number, status: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status } : s));
  };

  const updateStudentRemarks = (studentId: number, remarks: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, remarks } : s));
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: "Present" })));
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

    const selectedYear = academicYears.find(y => y.id === filters.academic_year_id);
    if (selectedYear) {
      if (filters.attendance_date < selectedYear.start_date || filters.attendance_date > selectedYear.end_date) {
        showError("Selected date is outside the academic year");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        tenant_id: user?.tenant_id || 0,
        academic_year_id: filters.academic_year_id,
        class_id: filters.class_id,
        class_division_id: filters.division_id,
        attendance_date: filters.attendance_date,
        records: students.map(s => ({
          student_id: s.student_id,
          status: s.status || 'Present',
          remarks: s.remarks || ""
        }))
      };

      await attendanceService.markAttendance(payload);
      setSnackbar({ open: true, message: "Attendance saved successfully", severity: 'success' });
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
      setFilters(prev => ({ ...prev, teacher_id: 0, class_id: 0, division_id: 0, attendance_date: today }));
    } else {
      setFilters(prev => ({ ...prev, class_id: 0, division_id: 0, attendance_date: today }));
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
  };
}
