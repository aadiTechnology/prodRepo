import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  alpha,
  IconButton,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  EventNote as EventNoteIcon,
} from "@mui/icons-material";
import { PageHeader, PageLayout } from "../../components/layout";
import { EntityTableSection } from "../../components/reusable";
import { AppCard } from "../../components/primitives";
import { colorTokens } from "../../tokens/colors";
import schoolClassService, { SchoolClass, ClassDivision } from "../../api/services/schoolClassService";
import academicYearService, { AcademicYear } from "../../api/services/academicYearService";
import attendanceService, { AttendanceReportResponse } from "../../api/services/attendanceService";
import studentService from "../../api/services/studentService";
import teacherService, { TeacherResponse } from "../../api/services/teacherService";
import { TeacherAssignmentApiItem } from "../../api/teacherAssignmentApi";
import { useAuth } from "../../context/AuthContext";
import { useAttendanceReportRole } from "../../hooks/useAttendanceReportRole";
import {
  buildTeacherFallbackMappings,
  fetchAllTeacherAssignments,
  getFilteredClassesForTeacher,
  getFilteredDivisionsForTeacher,
  getTeacherClassDivisionPairs,
  getTeacherScopedMappings,
  resolveTeacherForUser,
} from "../../utils/teacherAttendanceScope";
import {
  AttendanceMonthCalendar,
  type AttendanceCalendarStatus,
} from "./components/AttendanceMonthCalendar";
import holidayApi, { parseHolidayDateRange } from "../../services/holidayApi";

const STUDENT_REPORT_LIMIT = 500;

// ── Shared select style ───────────────────────────────────────────────────────
const filterSelectSx = {
  minWidth: { xs: "100%", sm: 140 },
  "& .MuiOutlinedInput-root": {
    borderRadius: "15px",
    fontSize: "0.85rem",
    fontWeight: 600,
    bgcolor: "#ffffff",
    "& fieldset": { borderColor: colorTokens.border.subtle },
    "&:hover fieldset": { borderColor: alpha(colorTokens.preschool.turquoise.main, 0.4) },
    "&.Mui-focused fieldset": { borderColor: colorTokens.preschool.turquoise.main },
  },
};

const HeaderGradientIconButton = ({
  onClick,
  icon,
  label,
  disabled = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) => (
  <Tooltip title={label}>
    <span style={{ display: "inline-flex" }}>
      <IconButton
        onClick={onClick}
        aria-label={label}
        disabled={disabled}
        sx={{
          background: disabled
            ? alpha(colorTokens.text.secondary, 0.12)
            : `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          color: disabled ? colorTokens.text.secondary : colorTokens.primary.contrast,
          borderRadius: "15px",
          width: 44,
          height: 44,
          boxShadow: disabled ? "none" : `0 8px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.25)}`,
          transition: "all 0.3s ease",
          "&:hover": {
            transform: disabled ? "none" : "scale(1.08)",
            boxShadow: disabled ? "none" : `0 12px 20px ${alpha(colorTokens.preschool.turquoise.main, 0.35)}`,
          },
        }}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
);

const parseIsoDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const monthBounds = (month: Date) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${year}-${pad(monthIndex + 1)}-01`,
    end: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
  };
};

const summarizeStudentRecords = (
  records: { status: string }[]
) => {
  let total_present = 0;
  let total_absent = 0;
  let total_half_day = 0;
  let total_leave = 0;

  for (const record of records) {
    switch (record.status) {
      case "Present":
        total_present += 1;
        break;
      case "Absent":
        total_absent += 1;
        break;
      case "Half Day":
        total_half_day += 1;
        break;
      case "Leave":
        total_leave += 1;
        break;
      default:
        break;
    }
  }

  const workingDays = total_present + total_absent + total_half_day + total_leave;
  const pct = (count: number) =>
    workingDays > 0 ? Math.round((count / workingDays) * 100) : 0;

  return {
    total_present,
    total_absent,
    total_half_day,
    total_leave,
    workingDays,
    attendancePct: pct(total_present),
    presentPct: pct(total_present),
    absentPct: pct(total_absent),
    halfDayPct: pct(total_half_day),
    leavePct: pct(total_leave),
  };
};

const AttendanceReport = () => {
  const { user } = useAuth();
  const { isTeacher, isStudent } = useAttendanceReportRole();

  // State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [assignmentMappings, setAssignmentMappings] = useState<TeacherAssignmentApiItem[]>([]);
  const [myTeacherId, setMyTeacherId] = useState(0);

  const [filters, setFilters] = useState({
    academic_year_id: 0,
    class_id: 0,
    division_id: 0,
    student_id: 0,
    from_date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0]
  });

  const [reportData, setReportData] = useState<AttendanceReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: "",
    severity: 'success'
  });

  // Load initial data (admin / teacher only)
  useEffect(() => {
    if (isStudent) return;

    const loadInitialData = async () => {
      try {
        const [years, classList, teacherList, assignmentList] = await Promise.all([
          academicYearService.getAll(),
          schoolClassService.getAll(),
          teacherService.list({ limit: 1000 }),
          fetchAllTeacherAssignments(),
        ]);

        setAcademicYears(years);
        setClasses(classList);
        setTeachers(teacherList.items);
        setAssignmentMappings(assignmentList);

        const activeYear = years.find((y) => y.is_active);
        const activeYearId = activeYear?.id ?? 0;

        if (isTeacher && user?.id) {
          let myTeacher = resolveTeacherForUser(teacherList.items, user.id, user.email);
          if (myTeacher) {
            let teacherRecord = myTeacher;
            try {
              teacherRecord = await teacherService.getById(myTeacher.id);
            } catch {
              /* use list row */
            }
            setMyTeacherId(teacherRecord.id);

            let mappings = assignmentList.filter((a) => a.teacher_id === teacherRecord.id);
            if (mappings.length === 0) {
              mappings = buildTeacherFallbackMappings(teacherRecord, classList);
              setAssignmentMappings([...assignmentList, ...mappings]);
            }

            const scoped = getTeacherScopedMappings(mappings, teacherRecord.id, activeYearId);
            const pairs = getTeacherClassDivisionPairs(scoped);
            const firstPair = pairs[0];

            setFilters((prev) => ({
              ...prev,
              academic_year_id: activeYearId || prev.academic_year_id,
              class_id: firstPair?.class_id ?? teacherRecord.class_id ?? 0,
              division_id: firstPair?.division_id ?? teacherRecord.class_division_id ?? 0,
              student_id: 0,
            }));
          } else if (activeYear) {
            setFilters((prev) => ({ ...prev, academic_year_id: activeYear.id }));
          }
        } else if (activeYear) {
          setFilters((prev) => ({ ...prev, academic_year_id: activeYear.id }));
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    loadInitialData();
  }, [isStudent, isTeacher, user?.id, user?.email]);

  // Active academic year + holidays for student calendar
  useEffect(() => {
    if (!isStudent) return;

    const loadStudentContext = async () => {
      try {
        const years = await academicYearService.getAll();
        setAcademicYears(years);
        const activeYear = years.find((y) => y.is_active);
        if (!activeYear) {
          setHolidayDates(new Set());
          return;
        }

        const { data } = await holidayApi.list({
          academic_year_id: activeYear.id,
          page: 1,
          page_size: 200,
        });

        const dates = new Set<string>();
        for (const row of data) {
          const { start, end } = parseHolidayDateRange(row.holiday_date);
          if (!start) continue;
          const startMs = Date.parse(`${start}T00:00:00`);
          const endMs = Date.parse(`${(end || start)}T00:00:00`);
          if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
          for (let t = startMs; t <= endMs; t += 86400000) {
            const d = new Date(t);
            dates.add(
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            );
          }
        }
        setHolidayDates(dates);
      } catch (err) {
        console.error("Failed to load student holiday context", err);
        setHolidayDates(new Set());
      }
    };

    void loadStudentContext();
  }, [isStudent]);

  const teacherScopedMappings = useMemo(() => {
    if (!isTeacher || !myTeacherId) return [];
    return getTeacherScopedMappings(
      assignmentMappings,
      myTeacherId,
      filters.academic_year_id
    );
  }, [isTeacher, myTeacherId, assignmentMappings, filters.academic_year_id]);

  const filteredClasses = useMemo(() => {
    if (!isTeacher) return classes;
    return getFilteredClassesForTeacher(
      classes,
      teachers,
      teacherScopedMappings,
      myTeacherId
    );
  }, [isTeacher, classes, teachers, teacherScopedMappings, myTeacherId]);

  const filteredDivisions = useMemo(() => {
    if (!isTeacher) {
      if (!filters.class_id) return [];
      const selectedClass = classes.find((c) => c.id === filters.class_id);
      return selectedClass?.divisions || [];
    }
    return getFilteredDivisionsForTeacher(
      classes,
      teachers,
      teacherScopedMappings,
      myTeacherId,
      filters.class_id
    );
  }, [
    isTeacher,
    classes,
    teachers,
    teacherScopedMappings,
    myTeacherId,
    filters.class_id,
  ]);

  const lockClassFilter = isTeacher && filteredClasses.length === 1;
  const lockDivisionFilter = isTeacher && filteredDivisions.length === 1;

  // Update divisions when class changes (admin / teacher)
  useEffect(() => {
    if (isStudent) return;
    if (filters.class_id) {
      const selectedClass = filteredClasses.find(c => c.id === filters.class_id);
      const nextDivisions = selectedClass?.divisions || [];
      setDivisions(nextDivisions);
      if (!nextDivisions.some((d) => d.id === filters.division_id)) {
        setFilters(prev => ({ ...prev, division_id: 0, student_id: 0 }));
      }
    } else {
      setDivisions([]);
      setFilters(prev => ({ ...prev, division_id: 0, student_id: 0 }));
    }
  }, [filters.class_id, filteredClasses, filters.division_id, isStudent]);

  useEffect(() => {
    if (isStudent) return;
    setDivisions(filteredDivisions);
    if (filteredDivisions.length === 0) {
      setFilters((prev) => ({ ...prev, division_id: 0, student_id: 0 }));
      return;
    }
    if (!filteredDivisions.some((d) => d.id === filters.division_id)) {
      setFilters((prev) => ({ ...prev, division_id: filteredDivisions[0].id, student_id: 0 }));
    }
  }, [filteredDivisions, filters.division_id, isStudent]);

  // Update students list when division changes (admin / teacher)
  useEffect(() => {
    if (isStudent) return;
    const loadStudents = async () => {
      if (filters.class_id && filters.division_id) {
        try {
          const pageSize = 100;
          let currentPage = 1;
          let total = 0;
          let allItems: any[] = [];

          do {
            const { items, total: totalCount } = await studentService.list({
              class_id: filters.class_id,
              division_id: filters.division_id,
              limit: pageSize,
              page: currentPage,
            });
            total = totalCount || 0;
            allItems = [...allItems, ...items];
            currentPage += 1;
          } while (allItems.length < total);

          setStudents(allItems);
        } catch (err) {
          console.error("Failed to load students", err);
          setStudents([]);
        }
      } else {
        setStudents([]);
      }
    };
    loadStudents();
  }, [filters.class_id, filters.division_id, isStudent]);

  const fetchReport = useCallback(async () => {
    if (filters.from_date > filters.to_date) {
      setSnackbar({ open: true, message: "From Date cannot be greater than To Date", severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const data = await attendanceService.getReport(
        isStudent
          ? {
              from_date: filters.from_date,
              to_date: filters.to_date,
              limit: STUDENT_REPORT_LIMIT,
              offset: 0,
            }
          : {
              from_date: filters.from_date,
              to_date: filters.to_date,
              class_id: filters.class_id || undefined,
              division_id: filters.division_id || undefined,
              student_id: filters.student_id || undefined,
              academic_year_id: filters.academic_year_id || undefined,
              limit: rowsPerPage,
              offset: page * rowsPerPage,
            }
      );
      setReportData(data);
      if (isStudent) {
        setCalendarMonth(parseIsoDate(filters.to_date));
      }
    } catch (err) {
      console.error("Failed to fetch report", err);
      setSnackbar({ open: true, message: "Unable to load attendance data", severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters, page, rowsPerPage, isStudent]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = () => {
    if (!reportData || reportData.records.length === 0) return;

    // Simple CSV Export
    const headers = ["Date", "Roll #", "Student Name", "Status", "Type", "Remarks"];
    const rows = reportData.records.map(r => [
      r.date,
      r.roll_no || "-",
      r.student_name,
      r.status,
      r.type || "-",
      r.remarks || "-"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${filters.from_date}_to_${filters.to_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusChip = (status: string) => {
    let color: string = colorTokens.text.secondary;
    switch (status) {
      case 'Present': color = colorTokens.preschool.mint.main; break;
      case 'Absent': color = colorTokens.preschool.coral.main; break;
      case 'Half Day': color = colorTokens.preschool.peach.main; break;
      case 'Leave': color = colorTokens.preschool.lavender.main; break;
    }

    return (
      <Chip 
        label={status} 
        size="small" 
        sx={{ 
          fontWeight: 800,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          bgcolor: alpha(color, 0.1),
          color: color,
          border: `1px solid ${alpha(color, 0.2)}`,
          borderRadius: '8px',
          height: '24px',
          '& .MuiChip-label': { px: 1 }
        }} 
      />
    );
  };

  const columns = useMemo(() => [
    {
      id: "date",
      label: "DATE",
      width: "15%",
      render: (row: any) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.primary }}>
          {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Typography>
      )
    },
    {
      id: "roll_no",
      label: "ROLL #",
      width: "10%",
      render: (row: any) => <Typography variant="body2">{row.roll_no || '-'}</Typography>
    },
    {
      id: "student_name",
      label: "NAME",
      width: "25%",
      render: (row: any) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.primary }}>
          {row.student_name}
        </Typography>
      )
    },
    {
      id: "status",
      label: "STATUS",
      width: "15%",
      align: "center" as const,
      render: (row: any) => getStatusChip(row.status)
    },
    {
      id: "type",
      label: "TYPE",
      width: "15%",
      align: "center" as const,
      render: (row: any) => row.type ? <Typography variant="caption" sx={{ fontWeight: 700, px: 2, py: 0.5, border: `1px solid ${colorTokens.border.subtle}`, borderRadius: '15px' }}>{row.type}</Typography> : '-'
    },
    {
      id: "remarks",
      label: "REMARKS",
      width: "20%",
      render: (row: any) => <Typography variant="body2" color="text.secondary">{row.remarks || '-'}</Typography>
    }
  ], []);

  const handleResetFilters = () => {
    const defaultFrom = new Date(new Date().setDate(new Date().getDate() - 7))
      .toISOString()
      .split("T")[0];
    const defaultTo = new Date().toISOString().split("T")[0];

    if (isStudent) {
      setFilters((prev) => ({
        ...prev,
        from_date: defaultFrom,
        to_date: defaultTo,
      }));
      setReportData(null);
      return;
    }

    let classId = 0;
    let divisionId = 0;
    if (isTeacher && myTeacherId) {
      const scoped = getTeacherScopedMappings(
        assignmentMappings,
        myTeacherId,
        academicYears.find((y) => y.is_active)?.id || 0
      );
      const firstPair = getTeacherClassDivisionPairs(scoped)[0];
      classId = firstPair?.class_id ?? 0;
      divisionId = firstPair?.division_id ?? 0;
    }
    setFilters({
      academic_year_id: academicYears.find((y) => y.is_active)?.id || 0,
      class_id: classId,
      division_id: divisionId,
      student_id: 0,
      from_date: defaultFrom,
      to_date: defaultTo,
    });
    setReportData(null);
    setPage(0);
  };

  const studentMonthRecords = useMemo(() => {
    if (!reportData || !isStudent) return [];
    const { start: monthStart, end: monthEnd } = monthBounds(calendarMonth);
    const rangeStart =
      monthStart > filters.from_date ? monthStart : filters.from_date;
    const rangeEnd = monthEnd < filters.to_date ? monthEnd : filters.to_date;
    if (rangeStart > rangeEnd) return [];

    return reportData.records.filter((record) => {
      const iso = record.date.slice(0, 10);
      return iso >= rangeStart && iso <= rangeEnd;
    });
  }, [
    reportData,
    isStudent,
    calendarMonth,
    filters.from_date,
    filters.to_date,
  ]);

  const studentStats = useMemo(() => {
    if (!reportData || !isStudent) return null;
    return summarizeStudentRecords(studentMonthRecords);
  }, [reportData, isStudent, studentMonthRecords]);

  const calendarStatusByDate = useMemo(() => {
    if (!reportData) return {} as Record<string, AttendanceCalendarStatus>;
    const map: Record<string, AttendanceCalendarStatus> = {};
    for (const record of reportData.records) {
      const iso = record.date.slice(0, 10);
      if (holidayDates.has(iso)) {
        map[iso] = "Holiday";
      } else {
        map[iso] = record.status as AttendanceCalendarStatus;
      }
    }
    for (const iso of holidayDates) {
      if (!map[iso]) map[iso] = "Holiday";
    }
    return map;
  }, [reportData, holidayDates]);

  const headerActions = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      gap={1}
      sx={{ width: { xs: "100%", sm: "auto" } }}
    >
      <TextField
        label="From Date"
        type="date"
        size="small"
        value={filters.from_date}
        InputLabelProps={{ shrink: true }}
        onChange={(e) => {
          setPage(0);
          setFilters(prev => ({ ...prev, from_date: e.target.value }));
        }}
        sx={{
          minWidth: { xs: "100%", sm: 140 },
          "& .MuiOutlinedInput-root": {
            borderRadius: "15px",
            fontSize: "0.85rem",
            fontWeight: 600,
            bgcolor: "#ffffff",
          },
        }}
      />
      <TextField
        label="To Date"
        type="date"
        size="small"
        value={filters.to_date}
        InputLabelProps={{ shrink: true }}
        onChange={(e) => {
          setPage(0);
          setFilters(prev => ({ ...prev, to_date: e.target.value }));
        }}
        sx={{
          minWidth: { xs: "100%", sm: 140 },
          "& .MuiOutlinedInput-root": {
            borderRadius: "15px",
            fontSize: "0.85rem",
            fontWeight: 600,
            bgcolor: "#ffffff",
          },
        }}
      />
      <Stack direction="row" spacing={1} alignItems="center">
        <HeaderGradientIconButton
          onClick={handleResetFilters}
          icon={<RefreshIcon sx={{ fontSize: 22 }} />}
          label={isStudent ? "Reset date range" : "Reset Filters"}
        />
        {!isStudent && (
          <HeaderGradientIconButton
            onClick={handleExport}
            icon={<ExportIcon sx={{ fontSize: 22 }} />}
            label="Export CSV"
            disabled={!reportData || reportData.records.length === 0}
          />
        )}
      </Stack>
    </Stack>
  );

  const filterCard = (
    <AppCard
      sx={{
        borderRadius: "14px",
        border: `1px solid ${colorTokens.border.default}`,
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={1.5}
        flexWrap="wrap"
        sx={{
          width: "100%",
          "& > .MuiInputBase-root": {
            flex: { sm: 1 },
          },
        }}
      >
        <Select
          value={filters.class_id || ""}
          displayEmpty
          size="small"
          disabled={lockClassFilter}
          onChange={(e) => {
            setPage(0);
            setFilters((prev) => ({
              ...prev,
              class_id: Number(e.target.value),
              division_id: 0,
              student_id: 0,
            }));
          }}
          sx={{ ...filterSelectSx, minWidth: { xs: "100%", sm: 180 } }}
        >
          <MenuItem value="">
            <Typography variant="body2" color="text.secondary">All Classes</Typography>
          </MenuItem>
          {filteredClasses.map(cls => (
            <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
          ))}
        </Select>

        <Select
          value={filters.division_id || ""}
          displayEmpty
          size="small"
          disabled={!filters.class_id || lockDivisionFilter}
          onChange={(e) => {
            setPage(0);
            setFilters((prev) => ({
              ...prev,
              division_id: Number(e.target.value),
              student_id: 0,
            }));
          }}
          sx={{ ...filterSelectSx, minWidth: { xs: "100%", sm: 180 } }}
        >
          <MenuItem value="">
            <Typography variant="body2" color="text.secondary">All Divisions</Typography>
          </MenuItem>
          {(isTeacher ? filteredDivisions : divisions).map((div) => (
            <MenuItem key={div.id} value={div.id}>{div.division_name}</MenuItem>
          ))}
        </Select>

        <Select
          value={filters.student_id || ""}
          displayEmpty
          size="small"
          disabled={!filters.division_id}
          onChange={(e) => {
            setPage(0);
            setFilters(prev => ({ ...prev, student_id: Number(e.target.value) }));
          }}
          sx={{ ...filterSelectSx, minWidth: { xs: "100%", sm: 180 } }}
        >
          <MenuItem value="">
            <Typography variant="body2" color="text.secondary">All Students</Typography>
          </MenuItem>
          {students.map(s => (
            <MenuItem key={s.id} value={s.id}>{s.student_name || s.name}</MenuItem>
          ))}
        </Select>
      </Stack>
    </AppCard>
  );

  return (
    <PageLayout
      pageBackground={true}
      header={
        <PageHeader
          links={
            isStudent
              ? [
                  { title: "Attendance", path: "/attendance/report" },
                  { title: "My Attendance", path: "/attendance/report" },
                ]
              : [
                  { title: "Attendance", path: "/attendance/mark" },
                  { title: "Attendance Report", path: "/attendance/report" },
                ]
          }
          homePath="/"
          actions={headerActions}
        />
      }
    >
      <Box
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: { xs: 0.6, sm: 0.9 },
          mt: { xs: -0.2, sm: -1.15 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 1.8, sm: 1.8 },
        }}
      >
        {/* ── Filters (Row 1) — admin / teacher only ── */}
        {!isStudent && filterCard}

        {reportData && isStudent && studentStats && (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(200px, 1fr))" },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              <AppCard
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(colorTokens.preschool.mint.main, 0.14)} 0%, ${alpha(colorTokens.preschool.mint.main, 0.06)} 100%)`,
                  border: `1.5px solid ${alpha(colorTokens.preschool.mint.main, 0.35)}`,
                }}
                paddingSize="dense"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "16px",
                      bgcolor: alpha(colorTokens.preschool.mint.main, 0.22),
                      color: colorTokens.preschool.mint.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: "uppercase", fontSize: "0.65rem" }}>
                      Present Days
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, fontSize: "1.65rem", lineHeight: 1.1 }}>
                      {studentStats.total_present}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.mint.main, mt: 0.75, display: "block", fontSize: "0.7rem" }}>
                      {studentStats.presentPct}%
                    </Typography>
                  </Box>
                </Stack>
              </AppCard>

              <AppCard
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(colorTokens.preschool.coral.main, 0.14)} 0%, ${alpha(colorTokens.preschool.coral.main, 0.06)} 100%)`,
                  border: `1.5px solid ${alpha(colorTokens.preschool.coral.main, 0.35)}`,
                }}
                paddingSize="dense"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "16px",
                      bgcolor: alpha(colorTokens.preschool.coral.main, 0.22),
                      color: colorTokens.preschool.coral.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CancelIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: "uppercase", fontSize: "0.65rem" }}>
                      Absent Days
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, fontSize: "1.65rem", lineHeight: 1.1 }}>
                      {studentStats.total_absent}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.coral.main, mt: 0.75, display: "block", fontSize: "0.7rem" }}>
                      {studentStats.absentPct}%
                    </Typography>
                  </Box>
                </Stack>
              </AppCard>

              <AppCard
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(colorTokens.preschool.peach.main, 0.14)} 0%, ${alpha(colorTokens.preschool.peach.main, 0.06)} 100%)`,
                  border: `1.5px solid ${alpha(colorTokens.preschool.peach.main, 0.35)}`,
                }}
                paddingSize="dense"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "16px",
                      bgcolor: alpha(colorTokens.preschool.peach.main, 0.22),
                      color: colorTokens.preschool.peach.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <WarningIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: "uppercase", fontSize: "0.65rem" }}>
                      Half Days
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, fontSize: "1.65rem", lineHeight: 1.1 }}>
                      {studentStats.total_half_day}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.peach.main, mt: 0.75, display: "block", fontSize: "0.7rem" }}>
                      {studentStats.halfDayPct}%
                    </Typography>
                  </Box>
                </Stack>
              </AppCard>

              <AppCard
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(colorTokens.preschool.lavender.main, 0.14)} 0%, ${alpha(colorTokens.preschool.lavender.main, 0.06)} 100%)`,
                  border: `1.5px solid ${alpha(colorTokens.preschool.lavender.main, 0.35)}`,
                }}
                paddingSize="dense"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "16px",
                      bgcolor: alpha(colorTokens.preschool.lavender.main, 0.22),
                      color: colorTokens.preschool.lavender.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <EventNoteIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: "uppercase", fontSize: "0.65rem" }}>
                      On Leave
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, fontSize: "1.65rem", lineHeight: 1.1 }}>
                      {studentStats.total_leave}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.lavender.main, mt: 0.75, display: "block", fontSize: "0.7rem" }}>
                      {studentStats.leavePct}%
                    </Typography>
                  </Box>
                </Stack>
              </AppCard>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1.15fr" },
                gap: { xs: 1.5, sm: 2 },
                alignItems: "stretch",
              }}
            >
              <AppCard
                sx={{
                  borderRadius: "14px",
                  border: `1px solid ${colorTokens.border.default}`,
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                  Attendance Overview
                </Typography>
                <Stack
                  direction="column"
                  spacing={3}
                  alignItems="center"
                >
                  <Box sx={{ position: "relative", display: "inline-flex" }}>
                    <CircularProgress
                      variant="determinate"
                      value={studentStats.attendancePct}
                      size={132}
                      thickness={4}
                      sx={{
                        color: colorTokens.preschool.mint.main,
                        "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
                      }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                        {studentStats.attendancePct}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Attendance
                      </Typography>
                    </Box>
                  </Box>

                  <Stack spacing={1.25} sx={{ flex: 1, width: "100%" }}>
                    {[
                      { label: "Total Working Days", value: studentStats.workingDays, color: colorTokens.text.primary },
                      { label: "Days Present", value: studentStats.total_present, color: colorTokens.preschool.mint.main },
                      { label: "Days Absent", value: studentStats.total_absent, color: colorTokens.preschool.coral.main },
                      { label: "Days Half Day", value: studentStats.total_half_day, color: colorTokens.preschool.peach.main },
                      { label: "Days On Leave", value: studentStats.total_leave, color: colorTokens.preschool.lavender.main },
                    ].map((row) => (
                      <Stack
                        key={row.label}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          py: 0.75,
                          borderBottom: `1px solid ${colorTokens.border.subtle}`,
                          "&:last-child": { borderBottom: "none" },
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {row.label}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: row.color }}>
                          {row.value}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </AppCard>

              <AttendanceMonthCalendar
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                statusByDate={calendarStatusByDate}
              />
            </Box>
          </>
        )}

        {reportData && !isStudent && (
          <>
            {/* ── Summary Analytics (Row 2) ── */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(200px, 1fr))" },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              {/* Present Card */}
              <AppCard
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(colorTokens.preschool.mint.main, 0.14)} 0%, ${alpha(colorTokens.preschool.mint.main, 0.06)} 100%)`,
                  border: `1.5px solid ${alpha(colorTokens.preschool.mint.main, 0.35)}`,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 12px 24px ${alpha(colorTokens.preschool.mint.main, 0.2)}`,
                    borderColor: alpha(colorTokens.preschool.mint.main, 0.45),
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "100px",
                    height: "100px",
                    background: `radial-gradient(circle at top right, ${alpha(colorTokens.preschool.mint.main, 0.15)}, transparent 70%)`,
                    pointerEvents: "none",
                  }
                }}
                paddingSize="dense"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "16px",
                      bgcolor: alpha(colorTokens.preschool.mint.main, 0.22),
                      color: colorTokens.preschool.mint.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `inset 0 0 0 1.5px ${alpha(colorTokens.preschool.mint.main, 0.3)}`,
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 32, fontWeight: "bold" }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', fontSize: '0.65rem' }}>
                      Total Present
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 0.5, fontSize: '1.65rem', lineHeight: 1.1 }}>
                      {reportData.summary.total_present}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.mint.main, display: 'block', mt: 0.75, fontSize: '0.7rem' }}>
                      Logged attendances
                    </Typography>
                  </Box>
                </Stack>
              </AppCard>

              {/* Absent Card */}
              <AppCard
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(colorTokens.preschool.coral.main, 0.14)} 0%, ${alpha(colorTokens.preschool.coral.main, 0.06)} 100%)`,
                  border: `1.5px solid ${alpha(colorTokens.preschool.coral.main, 0.35)}`,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 12px 24px ${alpha(colorTokens.preschool.coral.main, 0.2)}`,
                    borderColor: alpha(colorTokens.preschool.coral.main, 0.45),
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "100px",
                    height: "100px",
                    background: `radial-gradient(circle at top right, ${alpha(colorTokens.preschool.coral.main, 0.15)}, transparent 70%)`,
                    pointerEvents: "none",
                  }
                }}
                paddingSize="dense"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "16px",
                      bgcolor: alpha(colorTokens.preschool.coral.main, 0.22),
                      color: colorTokens.preschool.coral.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `inset 0 0 0 1.5px ${alpha(colorTokens.preschool.coral.main, 0.3)}`,
                      flexShrink: 0,
                    }}
                  >
                    <CancelIcon sx={{ fontSize: 32, fontWeight: "bold" }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', fontSize: '0.65rem' }}>
                      Total Absent
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 0.5, fontSize: '1.65rem', lineHeight: 1.1 }}>
                      {reportData.summary.total_absent}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.coral.main, display: 'block', mt: 0.75, fontSize: '0.7rem' }}>
                      Missed sessions
                    </Typography>
                  </Box>
                </Stack>
              </AppCard>

              {/* Half Day Card */}
              <AppCard
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(colorTokens.preschool.peach.main, 0.14)} 0%, ${alpha(colorTokens.preschool.peach.main, 0.06)} 100%)`,
                  border: `1.5px solid ${alpha(colorTokens.preschool.peach.main, 0.35)}`,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 12px 24px ${alpha(colorTokens.preschool.peach.main, 0.2)}`,
                    borderColor: alpha(colorTokens.preschool.peach.main, 0.45),
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "100px",
                    height: "100px",
                    background: `radial-gradient(circle at top right, ${alpha(colorTokens.preschool.peach.main, 0.15)}, transparent 70%)`,
                    pointerEvents: "none",
                  }
                }}
                paddingSize="dense"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "16px",
                      bgcolor: alpha(colorTokens.preschool.peach.main, 0.22),
                      color: colorTokens.preschool.peach.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `inset 0 0 0 1.5px ${alpha(colorTokens.preschool.peach.main, 0.3)}`,
                      flexShrink: 0,
                    }}
                  >
                    <WarningIcon sx={{ fontSize: 32, fontWeight: "bold" }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', fontSize: '0.65rem' }}>
                      Half Days
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 0.5, fontSize: '1.65rem', lineHeight: 1.1 }}>
                      {reportData.summary.total_half_day}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.peach.main, display: 'block', mt: 0.75, fontSize: '0.7rem' }}>
                      Partial attendance
                    </Typography>
                  </Box>
                </Stack>
              </AppCard>

              {/* Leave Card */}
              <AppCard
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(colorTokens.preschool.lavender.main, 0.14)} 0%, ${alpha(colorTokens.preschool.lavender.main, 0.06)} 100%)`,
                  border: `1.5px solid ${alpha(colorTokens.preschool.lavender.main, 0.35)}`,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 12px 24px ${alpha(colorTokens.preschool.lavender.main, 0.2)}`,
                    borderColor: alpha(colorTokens.preschool.lavender.main, 0.45),
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "100px",
                    height: "100px",
                    background: `radial-gradient(circle at top right, ${alpha(colorTokens.preschool.lavender.main, 0.15)}, transparent 70%)`,
                    pointerEvents: "none",
                  }
                }}
                paddingSize="dense"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "16px",
                      bgcolor: alpha(colorTokens.preschool.lavender.main, 0.22),
                      color: colorTokens.preschool.lavender.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `inset 0 0 0 1.5px ${alpha(colorTokens.preschool.lavender.main, 0.3)}`,
                      flexShrink: 0,
                    }}
                  >
                    <EventNoteIcon sx={{ fontSize: 32, fontWeight: "bold" }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', fontSize: '0.65rem' }}>
                      On Leave
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 0.5, fontSize: '1.65rem', lineHeight: 1.1 }}>
                      {reportData.summary.total_leave}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.lavender.main, display: 'block', mt: 0.75, fontSize: '0.7rem' }}>
                      Approved time off
                    </Typography>
                  </Box>
                </Stack>
              </AppCard>
            </Box>

            {/* ── Table Ledger (Row 3) ── */}
            <AppCard
              paddingSize="none"
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderRadius: "14px",
                border: `1px solid ${colorTokens.border.default}`,
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
              }}
            >
              <EntityTableSection<any>
                label="Attendance Analytics Ledger"
                loading={loading}
                totalRows={reportData.total_count}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={(v) => {
                  setRowsPerPage(v);
                  setPage(0);
                }}
                columns={columns}
                data={reportData.records}
                emptyMessage="No attendance records found for selected filters."
                stickyHeader
                getRowKey={(row, index) => String(index)}
              />
            </AppCard>
          </>
        )}

        {!reportData && !loading && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 10,
              gap: 2,
              textAlign: "center",
              opacity: 0.55,
            }}
          >
            <Box
              component="img"
              src="/icons/3d-folder.png"
              onError={(e) => (e.currentTarget.src = "/icons/3d-calendar.png")}
              alt="Report"
              sx={{ width: 84, height: 84, objectFit: "contain", opacity: 0.8 }}
            />
            <Typography variant="h6" fontWeight={700} color={colorTokens.text.primary} sx={{ fontSize: "1.1rem", mt: 1 }}>
              No Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 350, lineHeight: 1.6 }}>
              {isStudent
                ? "Choose a date range above to view your attendance summary."
                : "Select your filters from the toolbar above to generate the Attendance Analytics Dashboard."}
            </Typography>
          </Box>
        )}

        {loading && !reportData && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 10,
              gap: 2,
            }}
          >
            <CircularProgress size={44} sx={{ color: colorTokens.preschool.turquoise.main }} />
            <Typography variant="body2" color="text.secondary">
              Generating report...
            </Typography>
          </Box>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: "12px", fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
};

export default AttendanceReport;
