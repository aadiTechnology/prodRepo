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
  Checkbox,
  IconButton,
  TextField,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  alpha,
  useTheme
} from "@mui/material";
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon
} from "@mui/icons-material";
import { PageHeader } from "../../components/layout";
import schoolClassService, { SchoolClass, ClassDivision } from "../../api/services/schoolClassService";
import academicYearService, { AcademicYear } from "../../api/services/academicYearService";
import attendanceService, { AttendanceResponse } from "../../api/services/attendanceService";
import teacherService, { TeacherResponse } from "../../api/services/teacherService";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";

const ATTENDANCE_STATUSES = [
  { id: 'Present', label: 'Present', color: 'success' },
  { id: 'Absent', label: 'Absent', color: 'error' },
  { id: 'Half Day', label: 'Half Day', color: 'warning' },
  { id: 'Leave', label: 'Leave', color: 'info' },
];

const MarkAttendance = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { hasRole } = useRBAC();
  
  // State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  
  const [filters, setFilters] = useState({
    academic_year_id: 0,
    teacher_id: 0,
    class_id: 0,
    division_id: 0,
    attendance_date: new Date().toISOString().split('T')[0]
  });
  
  const [students, setStudents] = useState<AttendanceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: "",
    severity: 'success'
  });

  const today = new Date().toISOString().split('T')[0];

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [years, teacherList, classList] = await Promise.all([
          academicYearService.getAll(),
          teacherService.list({ limit: 1000 }),
          schoolClassService.getAll()
        ]);
        
        setAcademicYears(years);
        setTeachers(teacherList.items);
        setClasses(classList);
        
        // Find active year
        const activeYear = years.find(y => y.is_active);
        if (activeYear) {
          setFilters(prev => ({ ...prev, academic_year_id: activeYear.id }));
        }

        // Logic for Teacher role
        if (hasRole('TEACHER') && user?.email) {
          const myAssignments = teacherList.items.filter(t => t.email?.toLowerCase() === user.email?.toLowerCase());
          if (myAssignments.length > 0) {
            // Auto-select the first assignment
            const first = myAssignments[0];
            setFilters(prev => ({ 
              ...prev, 
              teacher_id: first.id,
              class_id: first.class_id || prev.class_id
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    loadInitialData();
  }, [hasRole, user?.email]);

  // Update filtered classes based on selected teacher
  const filteredClasses = useMemo(() => {
    if (!filters.teacher_id) return classes;
    
    // Get all classes assigned to this teacher
    const selectedTeacherAssignments = teachers.filter(t => t.id === filters.teacher_id);
    const assignedClassIds = selectedTeacherAssignments.map(t => t.class_id).filter(Boolean);
    
    if (assignedClassIds.length === 0) return [];
    
    return classes.filter(c => assignedClassIds.includes(c.id));
  }, [classes, teachers, filters.teacher_id]);

  // Update filtered divisions based on selected teacher and class
  const filteredDivisions = useMemo(() => {
    if (!filters.class_id) return [];
    
    const selectedClass = classes.find(c => c.id === filters.class_id);
    if (!selectedClass) return [];
    
    const allDivisions = selectedClass.divisions || [];
    
    if (!filters.teacher_id) return allDivisions;
    
    // Filter divisions assigned to this teacher for this class
    const selectedTeacherAssignments = teachers.filter(t => 
      t.id === filters.teacher_id && t.class_id === filters.class_id
    );
    const assignedDivisionIds = selectedTeacherAssignments.map(t => t.class_division_id).filter(Boolean);
    
    if (assignedDivisionIds.length === 0) return allDivisions; // Fallback to all if no specific division info (though schema has it)
    
    return allDivisions.filter(d => assignedDivisionIds.includes(d.id));
  }, [classes, teachers, filters.teacher_id, filters.class_id]);

  // Update divisions state for the dropdown
  useEffect(() => {
    setDivisions(filteredDivisions);
    
    // Auto-select if changed
    if (filteredDivisions.length > 0) {
      const isCurrentDivInFiltered = filteredDivisions.some(d => d.id === filters.division_id);
      if (!isCurrentDivInFiltered) {
        setFilters(prev => ({ ...prev, division_id: filteredDivisions[0].id }));
      }
    } else {
      setFilters(prev => ({ ...prev, division_id: 0 }));
    }
  }, [filteredDivisions, filters.division_id]);

  // Reset class if it's no longer in filtered classes
  useEffect(() => {
    if (filters.class_id && filteredClasses.length > 0) {
      const isCurrentClassInFiltered = filteredClasses.some(c => c.id === filters.class_id);
      if (!isCurrentClassInFiltered) {
        setFilters(prev => ({ ...prev, class_id: filteredClasses[0].id }));
      }
    } else if (filteredClasses.length === 0 && filters.class_id !== 0) {
      setFilters(prev => ({ ...prev, class_id: 0 }));
    }
  }, [filteredClasses, filters.class_id]);

  const fetchAttendance = useCallback(async () => {
    if (!filters.class_id || !filters.division_id || !filters.attendance_date) {
      setSnackbar({ open: true, message: "Please select Class and Division", severity: 'error' });
      return;
    }

    // Date range validation
    const selectedYear = academicYears.find(y => y.id === filters.academic_year_id);
    if (selectedYear) {
      if (filters.attendance_date < selectedYear.start_date || filters.attendance_date > selectedYear.end_date) {
        setSnackbar({ 
          open: true, 
          message: "Selected date is outside the academic year", 
          severity: 'error' 
        });
        return;
      }
    }

    // Future date validation
    if (filters.attendance_date > today) {
      setSnackbar({ 
        open: true, 
        message: "You cannot mark attendance for future dates", 
        severity: 'error' 
      });
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
      console.error("Failed to fetch attendance", err);
      setSnackbar({ open: true, message: "Failed to load students", severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleStatusChange = (studentId: number, status: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status } : s));
  };

  const handleRemarksChange = (studentId: number, remarks: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, remarks } : s));
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: s.status || 'Present' })));
  };

  const handleSave = async () => {
    if (!students.length) return;

    // Date range validation before save
    const selectedYear = academicYears.find(y => y.id === filters.academic_year_id);
    if (selectedYear) {
      if (filters.attendance_date < selectedYear.start_date || filters.attendance_date > selectedYear.end_date) {
        setSnackbar({ 
          open: true, 
          message: "Selected date is outside the academic year", 
          severity: 'error' 
        });
        return;
      }
    }

    // Future date validation
    if (filters.attendance_date > today) {
      setSnackbar({ 
        open: true, 
        message: "You cannot mark attendance for future dates", 
        severity: 'error' 
      });
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
          status: s.status || 'Present', // Default to present if not marked? Or validate?
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

  return (
    <Box sx={{ p: 4, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`, minHeight: '100vh' }}>
      <PageHeader
        links={[{ title: "Attendance", path: "#" }, { title: "Mark Attendance", path: "/attendance/mark" }]}
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
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={2.4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    value={filters.academic_year_id}
                    label="Academic Year"
                    onChange={(e) => setFilters(prev => ({ ...prev, academic_year_id: Number(e.target.value) }))}
                  >
                    {academicYears.map(year => (
                      <MenuItem key={year.id} value={year.id}>{year.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2.4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Teacher</InputLabel>
                  <Select
                    value={filters.teacher_id}
                    label="Teacher"
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      teacher_id: Number(e.target.value),
                      class_id: 0,
                      division_id: 0
                    }))}
                    disabled={hasRole('TEACHER')}
                  >
                    {!hasRole('TEACHER') && <MenuItem value={0}>All Teachers</MenuItem>}
                    {teachers.map(teacher => (
                      <MenuItem key={teacher.id} value={teacher.id}>{teacher.full_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2.4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={filters.class_id}
                    label="Class"
                    onChange={(e) => setFilters(prev => ({ ...prev, class_id: Number(e.target.value) }))}
                  >
                    <MenuItem value={0}>Select Class</MenuItem>
                    {filteredClasses.map(cls => (
                      <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2.4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Division</InputLabel>
                  <Select
                    value={filters.division_id}
                    label="Division"
                    onChange={(e) => setFilters(prev => ({ ...prev, division_id: Number(e.target.value) }))}
                    disabled={!divisions.length}
                  >
                    <MenuItem value={0}>Select Division</MenuItem>
                    {divisions.map(div => (
                      <MenuItem key={div.id} value={div.id}>{div.division_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2.4}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Attendance Date"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: academicYears.find(y => y.id === filters.academic_year_id)?.start_date,
                    max: [
                      academicYears.find(y => y.id === filters.academic_year_id)?.end_date,
                      today
                    ].filter(Boolean).sort()[0]
                  }}
                  value={filters.attendance_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, attendance_date: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    setStudents([]);
                    if (!hasRole('TEACHER')) {
                      setFilters(prev => ({ ...prev, teacher_id: 0, class_id: 0, division_id: 0 }));
                    } else {
                      setFilters(prev => ({ ...prev, class_id: 0, division_id: 0 }));
                    }
                  }}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Reset
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<SearchIcon />} 
                  onClick={fetchAttendance}
                  disabled={loading}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 4 }}
                >
                  Search Students
                </Button>
              </Grid>
          </Grid>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" fontWeight={700}>Student List</Typography>
              <Chip label={`${students.length} Students`} size="small" variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                color="success" 
                startIcon={<CheckBoxIcon />}

                onClick={markAllPresent}
                sx={{ borderRadius: 2, textTransform: 'none' }}
                // Custom variant "soft" if defined in theme, else use outlined/text
              >
                Mark All Present
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ borderRadius: 2, textTransform: 'none', px: 4, fontWeight: 700 }}
              >
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Table size="medium">
              <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
                <TableRow>
                  <TableCell width="80" sx={{ fontWeight: 700 }}>Roll #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Attendance Status</TableCell>
                  <TableCell width="300" sx={{ fontWeight: 700 }}>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.student_id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{student.roll_no || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{student.student_name}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        {ATTENDANCE_STATUSES.map((status) => (
                          <Tooltip key={status.id} title={status.label}>
                            <Button
                              variant={student.status === status.id ? "contained" : "outlined"}
                              color={status.color as any}
                              size="small"
                              onClick={() => handleStatusChange(student.student_id, status.id)}
                              sx={{ 
                                minWidth: 40, 
                                borderRadius: 1.5,
                                textTransform: 'none',
                                opacity: student.status && student.status !== status.id ? 0.5 : 1,
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': { transform: 'translateY(-2px)' }
                              }}
                            >
                              {status.id === 'Present' ? 'P' : status.id === 'Absent' ? 'A' : status.id === 'Half Day' ? 'HD' : 'L'}
                            </Button>
                          </Tooltip>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Add note..."
                        value={student.remarks || ""}
                        onChange={(e) => handleRemarksChange(student.student_id, e.target.value)}
                        variant="standard"
                        InputProps={{ disableUnderline: true, sx: { fontSize: '0.875rem', px: 1, py: 0.5, backgroundColor: alpha(theme.palette.divider, 0.03), borderRadius: 1 } }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {!students.length && !loading && (
        <Box sx={{ mt: 10, textAlign: 'center', opacity: 0.5 }}>
          <SearchIcon sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h6">Select filters and search to load students</Typography>
        </Box>
      )}

      {loading && (
        <Box sx={{ mt: 10, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography sx={{ mt: 2 }}>Loading student list...</Typography>
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

export default MarkAttendance;
