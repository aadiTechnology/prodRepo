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
  Grid,
  Card,
  Button,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  EventNote as EventNoteIcon,
} from "@mui/icons-material";
import { PageHeader, PageLayout } from "../../components/layout";
import { EntityTableSection } from "../../components/reusable";
import { colorTokens } from "../../tokens/colors";
import schoolClassService, { SchoolClass, ClassDivision } from "../../api/services/schoolClassService";
import academicYearService, { AcademicYear } from "../../api/services/academicYearService";
import attendanceService, { AttendanceReportResponse } from "../../api/services/attendanceService";
import studentService from "../../api/services/studentService";

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

const AttendanceReport = () => {
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

  const filtersSection = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      gap={1.5}
      flexWrap="wrap"
      sx={{ width: "100%" }}
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

      <Select
        value={filters.class_id || ""}
        displayEmpty
        size="small"
        onChange={(e) => {
          setPage(0);
          setFilters(prev => ({ ...prev, class_id: Number(e.target.value) }));
        }}
        sx={filterSelectSx}
      >
        <MenuItem value="">
          <Typography variant="body2" color="text.secondary">All Classes</Typography>
        </MenuItem>
        {classes.map(cls => (
          <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
        ))}
      </Select>

      <Select
        value={filters.division_id || ""}
        displayEmpty
        size="small"
        disabled={!filters.class_id}
        onChange={(e) => {
          setPage(0);
          setFilters(prev => ({ ...prev, division_id: Number(e.target.value) }));
        }}
        sx={filterSelectSx}
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
        sx={filterSelectSx}
      >
        <MenuItem value="">
          <Typography variant="body2" color="text.secondary">All Students</Typography>
        </MenuItem>
        {students.map(s => (
          <MenuItem key={s.id} value={s.id}>{s.student_name}</MenuItem>
        ))}
      </Select>

      {/* Action Buttons */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: { xs: 0, sm: "auto" } }}>
        <Tooltip title="Reset Filters">
          <IconButton
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
            sx={{
              color: colorTokens.text.secondary,
              backgroundColor: alpha(colorTokens.text.secondary, 0.08),
              borderRadius: "12px",
              width: 44,
              height: 44,
              border: `1.5px solid ${alpha(colorTokens.text.secondary, 0.2)}`,
              "&:hover": { backgroundColor: alpha(colorTokens.text.secondary, 0.15) },
            }}
          >
            <RefreshIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );

  return (
    <PageLayout
      pageBackground={true}
      header={
        <PageHeader
          links={[{ title: "Attendance", path: "/attendance/mark" }, { title: "Attendance Report", path: "/attendance/report" }]}
          homePath="/"
          actions={filtersSection}
        />
      }
    >
      {reportData && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', flex: 1, minHeight: 0 }}>
          {/* Summary Cards */}
          <Grid container spacing={3}>
            {/* Present Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ borderRadius: "16px", bgcolor: alpha(colorTokens.preschool.mint.main, 0.12) }}>
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.secondary }}>
                      Total Present
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 1 }}>
                      {reportData.summary.total_present}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.mint.dark, display: 'block', mt: 2 }}>
                      Logged attendances
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    width: 56, height: 56, borderRadius: '16px', 
                    bgcolor: colorTokens.preschool.mint.main, color: "#ffffff",
                    boxShadow: `0 8px 16px ${alpha(colorTokens.preschool.mint.main, 0.3)}`
                  }}>
                    <CheckCircleIcon />
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Absent Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ borderRadius: "16px", bgcolor: alpha(colorTokens.preschool.coral.main, 0.1) }}>
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.secondary }}>
                      Total Absent
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 1 }}>
                      {reportData.summary.total_absent}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.coral.dark, display: 'block', mt: 2 }}>
                      Missed sessions
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    width: 56, height: 56, borderRadius: '16px', 
                    bgcolor: colorTokens.preschool.coral.main, color: "#ffffff",
                    boxShadow: `0 8px 16px ${alpha(colorTokens.preschool.coral.main, 0.3)}`
                  }}>
                    <CancelIcon />
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Half Day Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ borderRadius: "16px", bgcolor: alpha(colorTokens.preschool.peach.main, 0.15) }}>
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.secondary }}>
                      Half Days
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 1 }}>
                      {reportData.summary.total_half_day}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.peach.dark, display: 'block', mt: 2 }}>
                      Partial attendance
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    width: 56, height: 56, borderRadius: '16px', 
                    bgcolor: colorTokens.preschool.peach.main, color: "#ffffff",
                    boxShadow: `0 8px 16px ${alpha(colorTokens.preschool.peach.main, 0.3)}`
                  }}>
                    <WarningIcon />
                  </Box>
                </Box>
              </Card>
            </Grid>

            {/* Leave Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ borderRadius: "16px", bgcolor: alpha(colorTokens.preschool.lavender.main, 0.15) }}>
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.secondary }}>
                      On Leave
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 1 }}>
                      {reportData.summary.total_leave}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.preschool.lavender.dark, display: 'block', mt: 2 }}>
                      Approved time off
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    width: 56, height: 56, borderRadius: '16px', 
                    bgcolor: colorTokens.preschool.lavender.main, color: "#ffffff",
                    boxShadow: `0 8px 16px ${alpha(colorTokens.preschool.lavender.main, 0.3)}`
                  }}>
                    <EventNoteIcon />
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Elegant Table Wrapper */}
          <Card 
            elevation={0}
            sx={{ 
              borderRadius: "20px", 
              bgcolor: "#ffffff",
              border: `1px solid ${colorTokens.border.subtle}`,
              boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.02)",
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              flex: 1, 
              minHeight: 0
            }}
          >
            <Box sx={{ 
              px: { xs: 2.5, sm: 3.5 }, py: { xs: 2.5, sm: 3 }, 
              borderBottom: `1px solid ${colorTokens.border.subtle}`,
              display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, 
              justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2,
              bgcolor: alpha(colorTokens.primary.main, 0.015)
            }}>
               <Box>
                 <Typography variant="h6" sx={{ fontWeight: 800, color: colorTokens.text.primary, fontSize: '1.15rem' }}>
                    Attendance Analytics Ledger
                 </Typography>
                 <Typography variant="body2" sx={{ color: colorTokens.text.secondary, mt: 0.5, fontWeight: 500 }}>
                    Detailed breakdown of student attendance logs
                 </Typography>
               </Box>
               <Stack direction="row" spacing={3} alignItems="center">
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: colorTokens.preschool.turquoise.main, lineHeight: 1 }}>
                      {Math.round((reportData.summary.total_present / Math.max(1, (reportData.summary.total_present + reportData.summary.total_absent + reportData.summary.total_half_day + reportData.summary.total_leave))) * 100)}%
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Overall Rate
                    </Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    onClick={handleExport}
                    disabled={!reportData || reportData.records.length === 0}
                    sx={{ 
                      borderRadius: '14px', 
                      px: 3, py: 1.25,
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: '0 8px 20px rgba(6, 185, 114, 0.25)',
                      background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, #049d5f 100%)`,
                      "&:hover": {
                         boxShadow: '0 8px 20px rgba(6, 185, 114, 0.4)',
                      }
                    }}
                  >
                    Export CSV
                  </Button>
               </Stack>
            </Box>
            <EntityTableSection<any>
              label=""
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
              showPagination={true}
              showInfoBar={false}
              getRowKey={(row, index) => String(index)}
            />
          </Card>
        </Box>
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
