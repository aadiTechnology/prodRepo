import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  TextField,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  alpha,
  Checkbox,
  FormControlLabel,
  IconButton,
  Grid,
  Card,
} from "@mui/material";
import {
  CheckBoxOutlined,
  CheckBoxOutlineBlank,
  Refresh as RefreshIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";

import { PageHeader, PageLayout } from "../../components/layout";
import { EntityTableSection } from "../../components/reusable";
import FormHeaderIconAction from "../../components/primitives/FormHeaderIconAction";
import { useMarkAttendanceController } from "../../hooks/useMarkAttendanceController";
import { ATTENDANCE_STATUSES, createMarkAttendanceColumns } from "./MarkAttendance.config";
import { colorTokens } from "../../tokens/colors";

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

// ── Legend Item ───────────────────────────────────────────────────────────────
const LegendItem = ({
  label,
  color,
  short,
}: {
  label: string;
  color: string;
  short: string;
}) => (
  <Stack direction="row" alignItems="center" gap={0.8}>
    <Box sx={{ 
      width: 24, 
      height: 24, 
      borderRadius: '6px', 
      bgcolor: alpha(color, 0.1), 
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.65rem',
      fontWeight: 900,
      border: `1px solid ${alpha(color, 0.2)}`
    }}>
      {short}
    </Box>
    <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, fontSize: "0.75rem" }}>
      {label}
    </Typography>
  </Stack>
);

// ── Main Component ────────────────────────────────────────────────────────────
const MarkAttendance = () => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

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
    updateStudentStatus,
    updateStudentRemarks,
    markAllPresent,
    saveAttendance,
    resetFilters,
    filteredClasses,
    filteredDivisions,
    isTeacher,
  } = controller;

  const allRowsPresent = students.length > 0 && students.every((s) => s.status === "Present");

  // Paginate students
  const paginatedStudents = students.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  // ── Column definitions ────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      id: "roll_no",
      label: "ROLL",
      width: "10%",
      render: (row: any) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: colorTokens.text.secondary }}>
          {row.roll_no || "-"}
        </Typography>
      ),
    },
    {
      id: "student_name",
      label: "STUDENT NAME",
      width: "30%",
      render: (row: any) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.primary }}>
          {row.student_name}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "STATUS",
      width: "35%",
      align: "center" as const,
      render: (row: any) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Stack direction="row" spacing={1}>
            {ATTENDANCE_STATUSES.map((status) => {
              const isSelected = row.status === status.id;
              let color: string = colorTokens.text.secondary;
              if (isSelected) {
                if (status.id === 'Present') color = colorTokens.preschool.mint.main;
                else if (status.id === 'Absent') color = colorTokens.preschool.coral.main;
                else if (status.id === 'Half Day') color = colorTokens.preschool.peach.main;
                else if (status.id === 'Leave') color = colorTokens.preschool.lavender.main;
              }

              return (
                <FormControlLabel
                  key={status.id}
                  sx={{ mr: 0, ml: 0 }}
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={() => updateStudentStatus(row.student_id, status.id)}
                      size="small"
                      sx={{
                        p: 0.5,
                        color: alpha(colorTokens.text.secondary, 0.2),
                        '&.Mui-checked': {
                          color: color,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ 
                      fontWeight: 800, 
                      color: isSelected ? color : colorTokens.text.secondary,
                      fontSize: '0.7rem'
                    }}>
                      {status.short}
                    </Typography>
                  }
                  labelPlacement="end"
                />
              );
            })}
          </Stack>
        </Box>
      ),
    },
    {
      id: "remarks",
      label: "REMARKS",
      width: "25%",
      render: (row: any) => (
        <TextField
          size="small"
          fullWidth
          placeholder="Add remarks..."
          value={row.remarks || ""}
          onChange={(event) => updateStudentRemarks(row.student_id, event.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              fontSize: "0.8rem",
              bgcolor: alpha(colorTokens.background.default, 0.4),
              "& fieldset": { border: 'none' },
              "&:hover fieldset": { border: 'none' },
              "&.Mui-focused fieldset": { border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.3)}` },
            },
          }}
        />
      ),
    }
  ], [updateStudentStatus, updateStudentRemarks]);

  // ── Filters Section ─────────────────────────────────────────────────────────
  const filtersSection = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      gap={1.5}
      flexWrap="wrap"
      sx={{ width: "100%" }}
    >
      <TextField
        label="Date"
        type="date"
        size="small"
        value={filters.attendance_date}
        onChange={(e) =>
          setFilters((prev) => ({ ...prev, attendance_date: e.target.value }))
        }
        InputLabelProps={{ shrink: true }}
        inputProps={{
          max: new Date().toISOString().split("T")[0],
          min: isTeacher ? new Date().toISOString().split("T")[0] : undefined,
        }}
        sx={{
          minWidth: { xs: "100%", sm: 160 },
          "& .MuiOutlinedInput-root": {
            borderRadius: "15px",
            fontSize: "0.85rem",
            fontWeight: 600,
            bgcolor: "#ffffff",
          },
        }}
      />

      <Select
        value={filters.academic_year_id || ""}
        displayEmpty
        size="small"
        onChange={(e) =>
          setFilters((prev) => ({ ...prev, academic_year_id: Number(e.target.value) }))
        }
        sx={filterSelectSx}
      >
        <MenuItem value="">
          <Typography variant="body2" color="text.secondary">Academic Year</Typography>
        </MenuItem>
        {academicYears.map((year) => (
          <MenuItem key={year.id} value={year.id}>{year.name}</MenuItem>
        ))}
      </Select>

      <Select
        value={filters.teacher_id || ""}
        displayEmpty
        size="small"
        disabled={isTeacher}
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
        {!isTeacher && (
          <MenuItem value="">
            <Typography variant="body2" color="text.secondary">All Teachers</Typography>
          </MenuItem>
        )}
        {teachers.map((teacher) => (
          <MenuItem key={teacher.id} value={teacher.id}>{teacher.full_name}</MenuItem>
        ))}
      </Select>

      <Select
        value={filters.class_id || ""}
        displayEmpty
        size="small"
        disabled={isTeacher}
        onChange={(e) =>
          setFilters((prev) => ({
            ...prev,
            class_id: Number(e.target.value),
            division_id: 0,
          }))
        }
        sx={filterSelectSx}
      >
        <MenuItem value="">
          <Typography variant="body2" color="text.secondary">Class</Typography>
        </MenuItem>
        {filteredClasses.map((cls) => (
          <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
        ))}
      </Select>

      <Select
        value={filters.division_id || ""}
        displayEmpty
        size="small"
        disabled={!filteredDivisions.length || isTeacher}
        onChange={(e) =>
          setFilters((prev) => ({ ...prev, division_id: Number(e.target.value) }))
        }
        sx={filterSelectSx}
      >
        <MenuItem value="">
          <Typography variant="body2" color="text.secondary">Division</Typography>
        </MenuItem>
        {filteredDivisions.map((div) => (
          <MenuItem key={div.id} value={div.id}>{div.division_name}</MenuItem>
        ))}
      </Select>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: { xs: 0, sm: "auto" } }}>
        <Tooltip title="Reset Filters">
          <IconButton
            onClick={resetFilters}
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
          links={[{ title: "Attendance", path: "#" }, { title: "Mark Attendance", path: "/attendance/mark" }]}
          homePath="/"
          actions={filtersSection}
        />
      }
    >
      {students.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', flex: 1, minHeight: 0 }}>
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
              justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 3,
              bgcolor: alpha(colorTokens.primary.main, 0.015)
            }}>
               <Box>
                 <Typography variant="h6" sx={{ fontWeight: 800, color: colorTokens.text.primary, fontSize: '1.15rem' }}>
                    Daily Attendance Roster
                 </Typography>
                 <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                    <LegendItem label="Present" short="P" color={colorTokens.preschool.mint.main} />
                    <LegendItem label="Absent" short="A" color={colorTokens.preschool.coral.main} />
                    <LegendItem label="Half Day" short="HD" color={colorTokens.preschool.peach.main} />
                    <LegendItem label="Leave" short="L" color={colorTokens.preschool.lavender.main} />
                 </Stack>
               </Box>
               <Stack direction="row" spacing={1.5} alignItems="center">
                  <Tooltip title="Mark All Present">
                    <IconButton
                      onClick={markAllPresent}
                      sx={{
                        color: allRowsPresent ? colorTokens.text.secondary : colorTokens.preschool.turquoise.main,
                        backgroundColor: alpha(allRowsPresent ? colorTokens.text.secondary : colorTokens.preschool.turquoise.main, 0.08),
                        borderRadius: "12px",
                        width: 44,
                        height: 44,
                        border: `1.5px solid ${alpha(allRowsPresent ? colorTokens.text.secondary : colorTokens.preschool.turquoise.main, 0.2)}`,
                        "&:hover": { backgroundColor: alpha(allRowsPresent ? colorTokens.text.secondary : colorTokens.preschool.turquoise.main, 0.15) },
                      }}
                    >
                      <DoneAllIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                  </Tooltip>

                  <FormHeaderIconAction
                    variant="save"
                    tooltipTitle="Save Attendance"
                    onClick={saveAttendance}
                    loading={saving}
                  />
               </Stack>
            </Box>
            <EntityTableSection<any>
              label=""
              loading={loading}
              totalRows={students.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={(v) => {
                setRowsPerPage(v);
                setPage(0);
              }}
              columns={columns}
              data={paginatedStudents}
              showPagination={true}
              showInfoBar={false}
              getRowKey={(row) => String(row.student_id)}
            />
          </Card>
        </Box>
      ) : (
        !loading && (
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
              src="/icons/3d-calendar.png"
              alt="calendar"
              sx={{ width: 84, height: 84, objectFit: "contain", opacity: 0.8 }}
            />
            <Typography variant="h6" fontWeight={700} color={colorTokens.text.primary} sx={{ fontSize: "1.1rem", mt: 1 }}>
              Ready to mark attendance?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 350, lineHeight: 1.6 }}>
              Select Date, Class & Division filter from the top bar to load your student roster.
            </Typography>
          </Box>
        )
      )}

      {loading && students.length === 0 && (
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
            Loading roster...
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

export default MarkAttendance;
