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
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";

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

const AttendanceReport = () => {
  const { user } = useAuth();
  const { hasRole } = useRBAC();
  const isTeacher = hasRole("TEACHER");

  // State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);

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

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: "",
    severity: 'success'
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [years, classList, teacherList] = await Promise.all([
          academicYearService.getAll(),
          schoolClassService.getAll(),
          teacherService.list({ limit: 1000 })
        ]);

        setAcademicYears(years);
        setClasses(classList);
        setTeachers(teacherList.items);

        const activeYear = years.find(y => y.is_active);
        if (isTeacher && user?.id) {
          let myTeacher = teacherList.items.find((t) => String(t.user_id) === String(user.id));
          if (!myTeacher && user?.email) {
            myTeacher = teacherList.items.find(
              (t) => t.email?.toLowerCase() === user.email?.toLowerCase()
            );
          }
          if (myTeacher) {
            setFilters((prev) => ({
              ...prev,
              academic_year_id: activeYear?.id ?? prev.academic_year_id,
              class_id: myTeacher.class_id || 0,
              division_id: myTeacher.class_division_id || 0,
              student_id: 0,
            }));
          } else if (activeYear) {
            setFilters((prev) => ({ ...prev, academic_year_id: activeYear.id }));
          }
        } else if (activeYear) {
          setFilters(prev => ({ ...prev, academic_year_id: activeYear.id }));
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    loadInitialData();
  }, [isTeacher, user?.id, user?.email]);

  const filteredClasses = useMemo(() => {
    if (!isTeacher) return classes;
    if (!teachers.length) return classes;
    const myTeacher = teachers.find(
      (t) =>
        String(t.user_id) === String(user?.id) ||
        (user?.email && t.email?.toLowerCase() === user.email.toLowerCase())
    );
    if (!myTeacher?.class_id) return [];
    return classes.filter((c) => c.id === myTeacher.class_id);
  }, [isTeacher, classes, teachers, user?.id, user?.email]);

  const filteredDivisions = useMemo(() => {
    if (!filters.class_id) return [];
    const selectedClass = filteredClasses.find((c) => c.id === filters.class_id);
    const classDivisions = selectedClass?.divisions || [];
    if (!isTeacher) return classDivisions;
    const myTeacher = teachers.find(
      (t) =>
        String(t.user_id) === String(user?.id) ||
        (user?.email && t.email?.toLowerCase() === user.email.toLowerCase())
    );
    if (!myTeacher?.class_division_id) return classDivisions;
    return classDivisions.filter((d) => d.id === myTeacher.class_division_id);
  }, [filters.class_id, filteredClasses, isTeacher, teachers, user?.id, user?.email]);

  // Update divisions when class changes
  useEffect(() => {
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
  }, [filters.class_id, filteredClasses, filters.division_id]);

  useEffect(() => {
    setDivisions(filteredDivisions);
    if (filteredDivisions.length === 0) {
      setFilters((prev) => ({ ...prev, division_id: 0, student_id: 0 }));
      return;
    }
    if (!filteredDivisions.some((d) => d.id === filters.division_id)) {
      setFilters((prev) => ({ ...prev, division_id: filteredDivisions[0].id, student_id: 0 }));
    }
  }, [filteredDivisions, filters.division_id]);

  // Update students list when division changes
  useEffect(() => {
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
  }, [filters.class_id, filters.division_id]);

  const fetchReport = useCallback(async () => {
    if (filters.from_date > filters.to_date) {
      setSnackbar({ open: true, message: "From Date cannot be greater than To Date", severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const data = await attendanceService.getReport({
        from_date: filters.from_date,
        to_date: filters.to_date,
        class_id: filters.class_id || undefined,
        division_id: filters.division_id || undefined,
        student_id: filters.student_id || undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage
      });
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch report", err);
      setSnackbar({ open: true, message: "Unable to load attendance data", severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters, page, rowsPerPage]);

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
    const myTeacher = teachers.find(
      (t) =>
        String(t.user_id) === String(user?.id) ||
        (user?.email && t.email?.toLowerCase() === user.email.toLowerCase())
    );
    setFilters({
      academic_year_id: academicYears.find((y) => y.is_active)?.id || 0,
      class_id: isTeacher ? (myTeacher?.class_id || 0) : 0,
      division_id: isTeacher ? (myTeacher?.class_division_id || 0) : 0,
      student_id: 0,
      from_date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0],
      to_date: new Date().toISOString().split("T")[0],
    });
    setReportData(null);
    setPage(0);
  };

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
          label="Reset Filters"
        />
        <HeaderGradientIconButton
          onClick={handleExport}
          icon={<ExportIcon sx={{ fontSize: 22 }} />}
          label="Export CSV"
          disabled={!reportData || reportData.records.length === 0}
        />
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
          disabled={isTeacher}
          onChange={(e) => {
            setPage(0);
            setFilters(prev => ({ ...prev, class_id: Number(e.target.value) }));
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
          disabled={!filters.class_id || isTeacher}
          onChange={(e) => {
            setPage(0);
            setFilters(prev => ({ ...prev, division_id: Number(e.target.value) }));
          }}
          sx={{ ...filterSelectSx, minWidth: { xs: "100%", sm: 180 } }}
        >
          <MenuItem value="">
            <Typography variant="body2" color="text.secondary">All Divisions</Typography>
          </MenuItem>
          {divisions.map(div => (
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
          links={[{ title: "Attendance", path: "/attendance/mark" }, { title: "Attendance Report", path: "/attendance/report" }]}
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
        {/* ── Filters (Row 1) ── */}
        {filterCard}

        {reportData && (
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
              Select your filters from the toolbar above to generate the Attendance Analytics Dashboard.
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
