import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
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
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";

import { PageHeader, PageLayout } from "../../components/layout";
import { EntityTableSection } from "../../components/reusable";
import { AppCard } from "../../components/primitives";
import FormHeaderIconAction from "../../components/primitives/FormHeaderIconAction";
import { useMarkAttendanceController } from "../../hooks/useMarkAttendanceController";
import { ATTENDANCE_STATUSES } from "./MarkAttendance.config";
import { colorTokens } from "../../tokens/colors";

// ── Shared select style (token-based) ─────────────────────────────────────────
const filterSelectSx = {
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

// ── Local gradient icon button (mirrors PrimaryActionButton, supports disabled) ──
interface HeaderGradientIconButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}

const HeaderGradientIconButton = ({
  onClick,
  icon,
  label,
  disabled = false,
}: HeaderGradientIconButtonProps) => (
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
          boxShadow: disabled
            ? "none"
            : `0 8px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.25)}`,
          transition: "all 0.3s ease",
          "&:hover": {
            transform: disabled ? "none" : "scale(1.08)",
            boxShadow: disabled
              ? "none"
              : `0 12px 20px ${alpha(colorTokens.preschool.turquoise.main, 0.35)}`,
          },
        }}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
);

// ── Legend chip (compact, token-driven) ───────────────────────────────────────
const LegendItem = ({
  label,
  color,
  short,
}: {
  label: string;
  color: string;
  short: string;
}) => (
  <Stack
    direction="row"
    alignItems="center"
    gap={0.75}
    sx={{
      px: 1,
      py: 0.5,
      borderRadius: "10px",
      bgcolor: alpha(color, 0.08),
      border: `1px solid ${alpha(color, 0.2)}`,
    }}
  >
    <Box
      sx={{
        width: 20,
        height: 20,
        borderRadius: "6px",
        bgcolor: alpha(color, 0.15),
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.65rem",
        fontWeight: 900,
      }}
    >
      {short}
    </Box>
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        color: colorTokens.text.secondary,
        fontSize: "0.72rem",
        whiteSpace: "nowrap",
      }}
    >
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
    lockClassFilter,
    lockDivisionFilter,
  } = controller;

  const allRowsPresent = students.length > 0 && students.every((s) => s.status === "Present");

  const paginatedStudents = students.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  // ── Column definitions ────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
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
                  if (status.id === "Present") color = colorTokens.preschool.mint.main;
                  else if (status.id === "Absent") color = colorTokens.preschool.coral.main;
                  else if (status.id === "Half Day") color = colorTokens.preschool.peach.main;
                  else if (status.id === "Leave") color = colorTokens.preschool.lavender.main;
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
                          "&.Mui-checked": { color },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          color: isSelected ? color : colorTokens.text.secondary,
                          fontSize: "0.7rem",
                        }}
                      >
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
                "& fieldset": { border: "none" },
                "&:hover fieldset": { border: "none" },
                "&.Mui-focused fieldset": {
                  border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
                },
              },
            }}
          />
        ),
      },
    ],
    [updateStudentStatus, updateStudentRemarks]
  );

  // ── Row 1: PageHeader actions (Date + gradient action icons + Save) ──────
  const headerActions = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      gap={1.5}
      flexWrap="wrap"
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
          minWidth: { xs: "100%", sm: 170 },
          "& .MuiOutlinedInput-root": {
            borderRadius: "15px",
            fontSize: "0.85rem",
            fontWeight: 600,
            bgcolor: "#ffffff",
          },
        }}
      />

      <Stack direction="row" spacing={1.25} alignItems="center">
        <HeaderGradientIconButton
          onClick={resetFilters}
          icon={<RefreshIcon sx={{ fontSize: 22 }} />}
          label="Reset Filters"
        />
        <HeaderGradientIconButton
          onClick={markAllPresent}
          icon={<DoneAllIcon sx={{ fontSize: 22 }} />}
          label={allRowsPresent ? "All marked present" : "Mark All Present"}
          disabled={allRowsPresent || students.length === 0}
        />
        <FormHeaderIconAction
          variant="save"
          tooltipTitle="Save Attendance"
          onClick={saveAttendance}
          loading={saving}
          disabled={students.length === 0}
        />
      </Stack>
    </Stack>
  );

  // ── Row 2: Filter & Legend card (separate container) ──────────────────────
  const filterCard = (
    <AppCard
      paddingSize="none"
      sx={{
        borderRadius: "14px",
        border: `1px solid ${colorTokens.border.default}`,
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        gap={1.5}
        flexWrap="wrap"
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.75,
          bgcolor: alpha(colorTokens.primary.main, 0.015),
        }}
      >
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
          disabled={lockClassFilter}
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
          disabled={!filteredDivisions.length || lockDivisionFilter}
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

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ ml: { md: "auto" }, rowGap: 1 }}
        >
          <LegendItem label="Present" short="P" color={colorTokens.preschool.mint.main} />
          <LegendItem label="Absent" short="A" color={colorTokens.preschool.coral.main} />
          <LegendItem label="Half Day" short="HD" color={colorTokens.preschool.peach.main} />
          <LegendItem label="Leave" short="L" color={colorTokens.preschool.lavender.main} />
        </Stack>
      </Stack>
    </AppCard>
  );

  // ── Row 3: Student list card (separate container) ─────────────────────────
  const tableCard = (
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
      {loading && students.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 15,
            gap: 2,
          }}
        >
          <CircularProgress size={44} sx={{ color: colorTokens.preschool.turquoise.main }} />
          <Typography variant="body2" color="text.secondary">
            Loading roster...
          </Typography>
        </Box>
      ) : students.length > 0 ? (
        <EntityTableSection<any>
          label="Student Attendance"
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
          showPagination
          showInfoBar
          getRowKey={(row) => String(row.student_id)}
        />
      ) : (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 15,
            gap: 2,
            textAlign: "center",
          }}
        >
          <Box
            component="img"
            src="/icons/3d-calendar.png"
            alt="calendar"
            sx={{ width: 84, height: 84, objectFit: "contain", opacity: 0.8 }}
          />
          <Typography
            variant="h6"
            fontWeight={700}
            color={colorTokens.text.primary}
            sx={{ fontSize: "1.1rem", mt: 1 }}
          >
            Ready to mark attendance?
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 350, lineHeight: 1.6, opacity: 0.7 }}
          >
            Pick Date, Academic Year, Class &amp; Division above to load the student roster.
          </Typography>
        </Box>
      )}
    </AppCard>
  );

  return (
    <PageLayout
      pageBackground
      header={
        <PageHeader
          links={[
            { title: "Attendance", path: "#" },
            { title: "Mark Attendance", path: "/attendance/mark" },
          ]}
          homePath="/"
          actions={headerActions}
        />
      }
    >
      {filterCard}
      {tableCard}

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
