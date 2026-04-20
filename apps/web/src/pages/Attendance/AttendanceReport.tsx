import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  alpha,
  useTheme,
  TablePagination
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  Assessment as AssessmentIcon,
  EventNote as EventNoteIcon,
  People as PeopleIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from "@mui/icons-material";
import { PageHeader } from "../../components/layout";
import schoolClassService, { SchoolClass, ClassDivision } from "../../api/services/schoolClassService";
import academicYearService, { AcademicYear } from "../../api/services/academicYearService";
import attendanceService, { AttendanceReportResponse, AttendanceReportItem } from "../../api/services/attendanceService";
import studentService from "../../api/services/studentService";

const AttendanceReport = () => {
  const theme = useTheme();

  // State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  const [students, setStudents] = useState<any[]>([]);

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
        const [years, classList] = await Promise.all([
          academicYearService.getAll(),
          schoolClassService.getAll()
        ]);

        setAcademicYears(years);
        setClasses(classList);

        const activeYear = years.find(y => y.is_active);
        if (activeYear) {
          setFilters(prev => ({ ...prev, academic_year_id: activeYear.id }));
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    loadInitialData();
  }, []);

  // Update divisions when class changes
  useEffect(() => {
    if (filters.class_id) {
      const selectedClass = classes.find(c => c.id === filters.class_id);
      setDivisions(selectedClass?.divisions || []);
      setFilters(prev => ({ ...prev, division_id: 0, student_id: 0 }));
    } else {
      setDivisions([]);
      setFilters(prev => ({ ...prev, division_id: 0, student_id: 0 }));
    }
  }, [filters.class_id, classes]);

  // Update students list when division changes
  useEffect(() => {
    const loadStudents = async () => {
      if (filters.class_id && filters.division_id) {
        try {
          const { items } = await studentService.list({
            class_id: filters.class_id,
            limit: 1000
          });
          // Note: Backend student.list currently doesn't filter by division_id in the API service
          // but we can filter on frontend if needed or just show all for that class
          setStudents(items);
        } catch (err) {
          console.error("Failed to load students", err);
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
      if (data.records.length === 0) {
        setSnackbar({ open: true, message: "No attendance records found", severity: 'error' });
      } else {
        setSnackbar({ open: true, message: "Report generated successfully", severity: 'success' });
      }
    } catch (err) {
      console.error("Failed to fetch report", err);
      setSnackbar({ open: true, message: "Unable to load attendance data", severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters, page, rowsPerPage]);

  useEffect(() => {
    if (reportData) {
      fetchReport();
    }
  }, [page, rowsPerPage]);

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
    switch (status) {
      case 'Present': return <Chip label="Present" color="success" size="small" icon={<CheckCircleIcon />} />;
      case 'Absent': return <Chip label="Absent" color="error" size="small" icon={<CancelIcon />} />;
      case 'Half Day': return <Chip label="Half Day" color="warning" size="small" icon={<WarningIcon />} />;
      case 'Leave': return <Chip label="Leave" color="info" size="small" icon={<EventNoteIcon />} />;
      default: return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box sx={{ p: 4, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`, minHeight: '100vh' }}>
      <PageHeader
        links={[{ title: "Attendance", path: "/attendance/mark" }, { title: "Attendance Report", path: "/attendance/report" }]}
        homePath="/"
      />

      <Card sx={{
        mt: 3,
        borderRadius: 4,
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        backdropFilter: 'blur(4px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        overflow: 'visible'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>Search Filters</Typography>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              disabled={!reportData || reportData.records.length === 0}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Export CSV
            </Button>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                InputLabelProps={{ shrink: true }}
                value={filters.from_date}
                onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                InputLabelProps={{ shrink: true }}
                value={filters.to_date}
                onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select
                  value={filters.class_id}
                  label="Class"
                  onChange={(e) => setFilters(prev => ({ ...prev, class_id: Number(e.target.value) }))}
                >
                  <MenuItem value={0}>All Classes</MenuItem>
                  {classes.map(cls => (
                    <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Division</InputLabel>
                <Select
                  value={filters.division_id}
                  label="Division"
                  onChange={(e) => setFilters(prev => ({ ...prev, division_id: Number(e.target.value) }))}
                  disabled={!filters.class_id}
                >
                  <MenuItem value={0}>All Divisions</MenuItem>
                  {divisions.map(div => (
                    <MenuItem key={div.id} value={div.id}>{div.division_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Student</InputLabel>
                <Select
                  value={filters.student_id}
                  label="Student"
                  onChange={(e) => setFilters(prev => ({ ...prev, student_id: Number(e.target.value) }))}
                  disabled={!filters.division_id}
                >
                  <MenuItem value={0}>All Students</MenuItem>
                  {students.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.student_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                setFilters({
                  academic_year_id: academicYears.find(y => y.is_active)?.id || 0,
                  class_id: 0,
                  division_id: 0,
                  student_id: 0,
                  from_date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
                  to_date: new Date().toISOString().split('T')[0]
                });
                setReportData(null);
                setPage(0);
              }}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={fetchReport}
              disabled={loading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 4 }}
            >
              Search
            </Button>
          </Box>
        </CardContent>
      </Card>

      {reportData && (
        <Box sx={{ mt: 4 }}>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '4px solid ' + theme.palette.success.main }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}>
                    <CheckCircleIcon />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Present</Typography>
                    <Typography variant="h5" fontWeight={700}>{reportData.summary.total_present}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '4px solid ' + theme.palette.error.main }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}>
                    <CancelIcon />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Absent</Typography>
                    <Typography variant="h5" fontWeight={700}>{reportData.summary.total_absent}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '4px solid ' + theme.palette.warning.main }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }}>
                    <WarningIcon />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Half Day</Typography>
                    <Typography variant="h5" fontWeight={700}>{reportData.summary.total_half_day}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '4px solid ' + theme.palette.info.main }}>
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
                    <EventNoteIcon />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Leave</Typography>
                    <Typography variant="h5" fontWeight={700}>{reportData.summary.total_leave}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Table size="medium">
              <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell width="100" sx={{ fontWeight: 700 }}>Roll #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.records.map((record, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                    <TableCell>{record.roll_no || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{record.student_name}</TableCell>
                    <TableCell align="center">{getStatusChip(record.status)}</TableCell>
                    <TableCell align="center">
                      {record.type ? <Chip label={record.type} size="small" variant="outlined" sx={{ fontWeight: 700 }} /> : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{record.remarks || '-'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={reportData.total_count}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => {
                setPage(newPage);
                // Trigger re-fetch logic should be here or handled via useEffect on page change
              }}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </TableContainer>
        </Box>
      )}

      {loading && (
        <Box sx={{ mt: 10, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography sx={{ mt: 2 }}>Generating report...</Typography>
        </Box>
      )}

      {!reportData && !loading && (
        <Box sx={{ mt: 10, textAlign: 'center', opacity: 0.5 }}>
          <AssessmentIcon sx={{ fontSize: 80, mb: 2, color: theme.palette.primary.main }} />
          <Typography variant="h6">Select filters and search to generate attendance report</Typography>
          <Typography variant="body2">Monitor trends, identify absentees, and export data.</Typography>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%', borderRadius: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AttendanceReport;
