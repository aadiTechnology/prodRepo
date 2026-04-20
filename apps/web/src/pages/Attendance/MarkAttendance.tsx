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
} from "@mui/material";
import {
  CheckBoxOutlined,
  CheckBoxOutlineBlank,
} from "@mui/icons-material";

import { PageHeader } from "../../components/layout";
import { ListPageLayout, EntityTableSection } from "../../components/reusable";
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
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) => (
  <Stack direction="row" alignItems="center" gap={0.6}>
    <Box sx={{ color, fontSize: 16, lineHeight: 1, display: "flex" }}>{icon}</Box>
    <Typography variant="caption" sx={{ fontWeight: 700, color, lineHeight: 1, fontSize: "0.75rem" }}>
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
  const columns = useMemo(() => {
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
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Stack direction="row" spacing={0.75}>
                {ATTENDANCE_STATUSES.map((status) => (
                  <FormControlLabel
                    key={status.id}
                    sx={{ mr: 0 }}
                    control={
                      <Checkbox
                        checked={row.status === status.id}
                        onChange={() => updateStudentStatus(row.student_id, status.id)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {status.short}
                      </Typography>
                    }
                    labelPlacement="end"
                  />
                ))}
              </Stack>
            </Box>
          ),
        };
      }
      if (col.id === "remarks") {
        return {
          ...col,
          render: (row: any) => (
            <TextField
              size="small"
              fullWidth
              placeholder="Remarks (optional)"
              value={row.remarks || ""}
              onChange={(event) => updateStudentRemarks(row.student_id, event.target.value)}
            />
          ),
        };
      }
      return col;
    });
  }, [updateStudentStatus, updateStudentRemarks]);

  // ── Filters Section ─────────────────────────────────────────────────────────
  const filtersSection = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      gap={1.5}
      flexWrap="wrap"
      sx={{ width: "100%" }}
    >
      {/* Date Picker */}
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
          minWidth: { xs: "100%", sm: 180 },
          "& .MuiOutlinedInput-root": {
            borderRadius: "15px",
            fontSize: "0.85rem",
            fontWeight: 600,
            bgcolor: "#ffffff",
          },
        }}
      />

      {/* Academic Year */}
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
          <Typography variant="body2" color="text.secondary">
            Academic Year
          </Typography>
        </MenuItem>
        {academicYears.map((year) => (
          <MenuItem key={year.id} value={year.id}>
            {year.name}
          </MenuItem>
        ))}
      </Select>

      {/* Teacher */}
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
        sx={{
          ...filterSelectSx,
          ...(isTeacher && {
            "& .MuiOutlinedInput-root": {
              ...filterSelectSx["& .MuiOutlinedInput-root"],
              bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.07),
            },
          }),
        }}
      >
        {!isTeacher && (
          <MenuItem value="">
            <Typography variant="body2" color="text.secondary">
              All Teachers
            </Typography>
          </MenuItem>
        )}
        {teachers.map((teacher) => (
          <MenuItem key={teacher.id} value={teacher.id}>
            {teacher.full_name}
          </MenuItem>
        ))}
      </Select>

      {/* Class */}
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
          <Typography variant="body2" color="text.secondary">
            Class
          </Typography>
        </MenuItem>
        {filteredClasses.map((cls) => (
          <MenuItem key={cls.id} value={cls.id}>
            {cls.name}
          </MenuItem>
        ))}
      </Select>

      {/* Division */}
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
          <Typography variant="body2" color="text.secondary">
            Division
          </Typography>
        </MenuItem>
        {filteredDivisions.map((div) => (
          <MenuItem key={div.id} value={div.id}>
            {div.division_name}
          </MenuItem>
        ))}
      </Select>

      {/* Action Buttons */}
      {students.length > 0 && (
        <>
          <FormControlLabel
            sx={{ ml: { xs: 0, sm: 1 } }}
            control={
              <Checkbox
                checked={allRowsPresent}
                onChange={markAllPresent}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Select All (Mark All Present)
              </Typography>
            }
          />
          <Button
            variant="outlined"
            onClick={resetFilters}
            sx={{ borderRadius: "12px", textTransform: "none" }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={saveAttendance}
            disabled={saving}
            sx={{ borderRadius: "12px", textTransform: "none", px: 2.5 }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : "Save"}
          </Button>
        </>
      )}
    </Stack>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[
            { title: "Attendance", path: "#" },
            { title: "Mark Attendance", path: "/attendance/mark" },
          ]}
          homePath="/"
          actions={filtersSection}
        />
      }
    >
      {/* ── Legend Bar ───────────────────────────────────────────────────– */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, sm: 2.5 },
          px: { xs: 2, sm: 2.5 },
          py: 1,
          borderBottom: `1px solid ${colorTokens.border.subtle}`,
          bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.02),
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            color: colorTokens.text.secondary,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            fontSize: "0.7rem",
          }}
        >
          Legend
        </Typography>
        <LegendItem
          icon={<CheckBoxOutlined sx={{ fontSize: 16 }} />}
          label="Present"
          color="#2e7d32"
        />
        <LegendItem
          icon={<CheckBoxOutlineBlank sx={{ fontSize: 16 }} />}
          label="Absent"
          color="#c62828"
        />
        <LegendItem
          icon={
            <Typography component="span" sx={{ fontWeight: 800, fontSize: "0.7rem", color: "#e65100", lineHeight: 1 }}>
              HD
            </Typography>
          }
          label="Half Day"
          color="#e65100"
        />
        <LegendItem
          icon={
            <Typography component="span" sx={{ fontWeight: 800, fontSize: "0.7rem", color: "#0277bd", lineHeight: 1 }}>
              L
            </Typography>
          }
          label="Leave"
          color="#0277bd"
        />
      </Box>

      {/* ── Table Section ────────────────────────────────────────────────– */}
      <EntityTableSection<any>
        label="Attendance"
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
        showPagination={students.length > 0}
        showInfoBar={students.length > 0}
        getRowKey={(row) => String(row.student_id)}
      />

      {/* ── Empty State ──────────────────────────────────────────────────– */}
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
          <Box
            component="img"
            src="/icons/3d-calendar.png"
            alt="calendar"
            sx={{ width: 72, height: 72, objectFit: "contain" }}
          />
          <Typography variant="h6" fontWeight={600} color={colorTokens.text.primary} sx={{ fontSize: "1rem" }}>
            Select filters to load students
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose date, class and division to load students.
          </Typography>
        </Box>
      )}

      {/* ── Loading State ────────────────────────────────────────────────– */}
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
          <CircularProgress size={44} sx={{ color: colorTokens.preschool.turquoise.main }} />
          <Typography variant="body2" color="text.secondary">
            Loading student list...
          </Typography>
        </Box>
      )}



      {/* ── Snackbar ─────────────────────────────────────────────────────– */}
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
