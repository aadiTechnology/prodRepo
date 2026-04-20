import React from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  TextField,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Stack,
  alpha,
} from "@mui/material";
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  CheckBox as CheckBoxIcon,
  CalendarMonth as CalendarIcon,
  Groups as GroupsIcon,
} from "@mui/icons-material";

import { PageHeader } from "../../components/layout";
import { ListPageLayout, EntityTableSection } from "../../components/reusable";
import { useMarkAttendanceController } from "../../hooks/useMarkAttendanceController";
import { useRBAC } from "../../context/RBACContext";
import { ATTENDANCE_STATUSES, createMarkAttendanceColumns } from "./MarkAttendance.config";
import { colorTokens } from "../../tokens/colors";

const filterSelectSx = {
  minWidth: { xs: "100%", sm: 150 },
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

const filterDateSx = {
  minWidth: { xs: "100%", sm: 160 },
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

const MarkAttendance = () => {
  const { hasRole } = useRBAC();
  const controller = useMarkAttendanceController();

  const {
    academicYears,
    teachers,
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
  } = controller;

  const columns = React.useMemo(() => {
    const baseColumns = createMarkAttendanceColumns({
      onStatusChange: updateStudentStatus,
      onRemarksChange: updateStudentRemarks,
    });

    return baseColumns.map((col) => {
      if (col.id === "student_name") {
        return {
          ...col,
          render: (row: any) => (
            <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.primary }}>
              {row.student_name}
            </Typography>
          ),
        };
      }
      if (col.id === "status") {
        return {
          ...col,
          render: (row: any) => (
            <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75 }}>
              {ATTENDANCE_STATUSES.map((status) => {
                const isSelected = row.status === status.id;
                return (
                  <Tooltip key={status.id} title={status.label} arrow>
                    <Button
                      variant={isSelected ? "contained" : "outlined"}
                      color={status.color as any}
                      size="small"
                      onClick={() => updateStudentStatus(row.student_id, status.id)}
                      sx={{
                        minWidth: 38,
                        height: 32,
                        borderRadius: "10px",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        opacity: row.status && !isSelected ? 0.45 : 1,
                        transition: "all 0.2s ease-in-out",
                        boxShadow: isSelected ? `0 4px 10px rgba(0,0,0,0.15)` : "none",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                          opacity: 1,
                        },
                      }}
                    >
                      {status.short}
                    </Button>
                  </Tooltip>
                );
              })}
            </Box>
          ),
        };
      }
      if (col.id === "remarks") {
        return {
          ...col,
          render: (row: any) => (
            <TextField
              fullWidth
              size="small"
              placeholder="Add note..."
              value={row.remarks || ""}
              onChange={(e) => updateStudentRemarks(row.student_id, e.target.value)}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  fontSize: "0.8rem",
                  bgcolor: colorTokens.background.subtle,
                  "& fieldset": { borderColor: "transparent" },
                  "&:hover fieldset": { borderColor: colorTokens.border.default },
                  "&.Mui-focused fieldset": { borderColor: colorTokens.preschool.turquoise.main },
                },
              }}
            />
          ),
        };
      }
      return col;
    });
  }, [updateStudentStatus, updateStudentRemarks]);

  const filterToolbar = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      gap={1.5}
      flexWrap="wrap"
      sx={{ width: { xs: "100%", sm: "auto" }, minWidth: 0 }}
    >
      {/* Academic Year */}
      <Select
        value={filters.academic_year_id || ""}
        displayEmpty
        size="small"
        onChange={(e) => setFilters((prev) => ({ ...prev, academic_year_id: Number(e.target.value) }))}
        sx={filterSelectSx}
      >
        <MenuItem value="">
          <Typography variant="body2" color="text.secondary">Academic Year</Typography>
        </MenuItem>
        {academicYears.map((year) => (
          <MenuItem key={year.id} value={year.id}>{year.name}</MenuItem>
        ))}
      </Select>

      {/* Teacher */}
      <Select
        value={filters.teacher_id || ""}
        displayEmpty
        size="small"
        disabled={hasRole("TEACHER")}
        onChange={(e) =>
          setFilters((prev) => ({
            ...prev,
            teacher_id: Number(e.target.value),
            class_id: 0,
            division_id: 0,
          }))
        }
        sx={filterSelectSx}
      >
        {!hasRole("TEACHER") && (
          <MenuItem value="">
            <Typography variant="body2" color="text.secondary">All Teachers</Typography>
          </MenuItem>
        )}
        {teachers.map((teacher) => (
          <MenuItem key={teacher.id} value={teacher.id}>{teacher.full_name}</MenuItem>
        ))}
      </Select>

      {/* Class */}
      <Select
        value={filters.class_id || ""}
        displayEmpty
        size="small"
        onChange={(e) => setFilters((prev) => ({ ...prev, class_id: Number(e.target.value), division_id: 0 }))}
        sx={filterSelectSx}
      >
        <MenuItem value="">
          <Typography variant="body2" color="text.secondary">Select Class</Typography>
        </MenuItem>
        {filteredClasses.map((cls) => (
          <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
        ))}
      </Select>

      {/* Division */}
      <Select
        value={filters.division_id || ""}
        displayEmpty
        size="small"
        disabled={!filteredDivisions.length}
        onChange={(e) => setFilters((prev) => ({ ...prev, division_id: Number(e.target.value) }))}
        sx={filterSelectSx}
      >
        <MenuItem value="">
          <Typography variant="body2" color="text.secondary">Select Division</Typography>
        </MenuItem>
        {filteredDivisions.map((div) => (
          <MenuItem key={div.id} value={div.id}>{div.division_name}</MenuItem>
        ))}
      </Select>

      {/* Date */}
      <TextField
        size="small"
        type="date"
        label="Date"
        InputLabelProps={{ shrink: true }}
        value={filters.attendance_date}
        onChange={(e) => setFilters((prev) => ({ ...prev, attendance_date: e.target.value }))}
        sx={filterDateSx}
      />

      {/* Reset */}
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={resetFilters}
        sx={{
          borderRadius: "15px",
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.85rem",
          borderColor: colorTokens.border.default,
          color: colorTokens.text.secondary,
          "&:hover": { borderColor: colorTokens.preschool.turquoise.main, color: colorTokens.preschool.turquoise.main },
          whiteSpace: "nowrap",
        }}
      >
        Reset
      </Button>

      {/* Search */}
      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
        onClick={fetchStudents}
        disabled={loading}
        sx={{
          borderRadius: "15px",
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.85rem",
          px: 3,
          background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
          "&:hover": {
            boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.4)}`,
            transform: "translateY(-1px)",
          },
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
        }}
      >
        Search Students
      </Button>
    </Stack>
  );

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[
            { title: "Attendance", path: "#" },
            { title: "Mark Attendance", path: "/attendance/mark" },
          ]}
          homePath="/"
          actions={filterToolbar}
        />
      }
    >
      {/* Student Table Section */}
      {students.length > 0 && (
        <>
          {/* Student list sub-header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 2,
              py: 1.5,
              borderBottom: `1px solid ${colorTokens.border.subtle}`,
              bgcolor: colorTokens.background.subtle,
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Stack direction="row" alignItems="center" gap={1.5}>
              <GroupsIcon sx={{ color: colorTokens.menuColors.academics, fontSize: 22 }} />
              <Typography variant="subtitle1" fontWeight={700} color={colorTokens.text.primary}>
                Student List
              </Typography>
              <Chip
                label={`${students.length} Students`}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.1),
                  color: colorTokens.preschool.turquoise.dark,
                  border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.25)}`,
                }}
              />
            </Stack>

            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<CheckBoxIcon />}
                onClick={markAllPresent}
                size="small"
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  borderColor: colorTokens.success.main,
                  color: colorTokens.success.main,
                  "&:hover": {
                    bgcolor: alpha(colorTokens.success.main, 0.06),
                    borderColor: colorTokens.success.dark,
                  },
                }}
              >
                Mark All Present
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={saveAttendance}
                disabled={saving}
                size="small"
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  px: 2.5,
                  background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                  boxShadow: `0 4px 10px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
                  "&:hover": {
                    boxShadow: `0 6px 14px ${alpha(colorTokens.preschool.turquoise.main, 0.4)}`,
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                {saving ? "Saving..." : "Save Attendance"}
              </Button>
            </Stack>
          </Box>

          <EntityTableSection<any>
            label="Attendance Student List"
            loading={loading}
            totalRows={students.length}
            page={0}
            rowsPerPage={students.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
            columns={columns}
            data={students}
            showPagination={false}
            showInfoBar={false}
            getRowKey={(row) => String(row.student_id)}
          />
        </>
      )}

      {/* Empty state */}
      {!students.length && !loading && (
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
          <CalendarIcon sx={{ fontSize: 64, color: colorTokens.preschool.turquoise.main }} />
          <Typography variant="h6" fontWeight={600} color={colorTokens.text.primary}>
            Select filters and search to load students
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose an academic year, class, and division, then click Search Students.
          </Typography>
        </Box>
      )}

      {/* Loading state */}
      {loading && (
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
          <CircularProgress
            size={44}
            sx={{ color: colorTokens.preschool.turquoise.main }}
          />
          <Typography variant="body2" color="text.secondary">
            Loading student list...
          </Typography>
        </Box>
      )}

      {/* Snackbar */}
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
    </ListPageLayout>
  );
};

export default MarkAttendance;
