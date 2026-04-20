import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import schoolClassService, { SchoolClass, ClassDivision } from "../api/services/schoolClassService";
import academicYearService, { AcademicYear } from "../api/services/academicYearService";
import attendanceService, { AttendanceResponse } from "../api/services/attendanceService";
import teacherService, { TeacherResponse } from "../api/services/teacherService";
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

  // Load initial metadata
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [years, teacherList, classList] = await Promise.all([
          academicYearService.getAll(),
          teacherService.list({ limit: 1000 }),
          schoolClassService.getAll()
        ]);

        setAcademicYears(years);
        setClasses(classList);

        // Find active year
        const activeYear = years.find(y => y.is_active);

        if (isTeacher && user?.id) {
          // Primary match: teacher.user_id === logged-in user.id (most reliable)
          // Fallback : match by email for legacy records where user_id may be null
          let myTeacher = teacherList.items.find(t => t.user_id === user.id);
          if (!myTeacher && user?.email) {
            myTeacher = teacherList.items.find(
              t => t.email?.toLowerCase() === user.email?.toLowerCase()
            );
          }
          if (myTeacher) {
            setTeachers([myTeacher]); // only their own name
            setFilters(prev => ({
              ...prev,
              academic_year_id: activeYear?.id ?? prev.academic_year_id,
              teacher_id: myTeacher!.id,
              class_id: myTeacher!.class_id || prev.class_id,
            }));
          } else {
            setTeachers([]);
            if (activeYear) setFilters(prev => ({ ...prev, academic_year_id: activeYear.id }));
          }
        } else {
          // Admin / Tenant-Admin: show all teachers
          setTeachers(teacherList.items);
          if (activeYear) setFilters(prev => ({ ...prev, academic_year_id: activeYear.id }));
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    };
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, user?.email]);

  // Derived filtered classes
  const filteredClasses = useMemo(() => {
    if (!filters.teacher_id) return classes;
    const selectedTeacherAssignments = teachers.filter(t => t.id === filters.teacher_id);
    const assignedClassIds = selectedTeacherAssignments.map(t => t.class_id).filter(Boolean);
    if (assignedClassIds.length === 0) return [];
    return classes.filter(c => assignedClassIds.includes(c.id));
  }, [classes, teachers, filters.teacher_id]);

  // Derived filtered divisions
  const filteredDivisions = useMemo(() => {
    if (!filters.class_id) return [];
    const selectedClass = classes.find(c => c.id === filters.class_id);
    if (!selectedClass) return [];
    const allDivisions = selectedClass.divisions || [];
    if (!filters.teacher_id) return allDivisions;

    const selectedTeacherAssignments = teachers.filter(t =>
      t.id === filters.teacher_id && t.class_id === filters.class_id
    );
    const assignedDivisionIds = selectedTeacherAssignments.map(t => t.class_division_id).filter(Boolean);
    if (assignedDivisionIds.length === 0) return allDivisions;
    return allDivisions.filter(d => assignedDivisionIds.includes(d.id));
  }, [classes, teachers, filters.teacher_id, filters.class_id]);

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
    if (!filters.class_id || !filters.division_id || !filters.attendance_date) {
      setSnackbar({ open: true, message: "Please select Class and Division", severity: 'error' });
      return;
    }

    const selectedYear = academicYears.find(y => y.id === filters.academic_year_id);
    if (selectedYear) {
      if (filters.attendance_date < selectedYear.start_date || filters.attendance_date > selectedYear.end_date) {
        setSnackbar({ open: true, message: "Selected date is outside the academic year", severity: 'error' });
        return;
      }
    }

    if (filters.attendance_date > today) {
      setSnackbar({ open: true, message: "You cannot mark attendance for future dates", severity: 'error' });
      return;
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
      setSnackbar({ open: true, message: "Failed to load students", severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters, academicYears, today]);

  const updateStudentStatus = (studentId: number, status: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status } : s));
  };

  const updateStudentRemarks = (studentId: number, remarks: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, remarks } : s));
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: s.status || 'Present' })));
  };

  const saveAttendance = async () => {
    if (!students.length) return;

    const selectedYear = academicYears.find(y => y.id === filters.academic_year_id);
    if (selectedYear) {
      if (filters.attendance_date < selectedYear.start_date || filters.attendance_date > selectedYear.end_date) {
        setSnackbar({ open: true, message: "Selected date is outside the academic year", severity: 'error' });
        return;
      }
    }

    if (filters.attendance_date > today) {
      setSnackbar({ open: true, message: "You cannot mark attendance for future dates", severity: 'error' });
      return;
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
      setSnackbar({ open: true, message: "Attendance saved successfully!", severity: 'success' });
    } catch (err) {
      console.error("Failed to save attendance", err);
      setSnackbar({ open: true, message: "Failed to save attendance", severity: 'error' });
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
  };
}
