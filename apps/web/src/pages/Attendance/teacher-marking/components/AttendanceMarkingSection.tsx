import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import {
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Save as SaveIcon,
} from "@mui/icons-material";

import { colorTokens } from "../../../../tokens/colors";
import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
import type { TeacherAttendanceStatus } from "../teacherAttendanceMarking.types";
import { MAX_REMARKS_LENGTH, REMARKS_REQUIRED_STATUSES } from "../teacherAttendanceMarking.types";
import TeacherSectionCard from "./TeacherSectionCard";

interface AttendanceMarkingSectionProps {
  controller: TeacherAttendanceMarkingController;
}

export default function AttendanceMarkingSection({ controller }: AttendanceMarkingSectionProps) {
  const {
    isTeacher,
    isAdminLike,
    activeTeachers,
    selectedDate,
    setSelectedDate,
    selectedTeacherId,
    setSelectedTeacherId,
    selectedTeacher,
    selectedShift,
    officeTiming,
    graceTime,
    currentRecord,
    isReadOnly,
    canEditCheckout,
    canEditStatus,
    canEditRemarks,
    validationErrors,
    handleCheckIn,
    handleCheckOut,
    handleStatusChange,
    handleRemarksChange,
    requestSave,
    workingHoursLabel,
    overtimeLabel,
  } = controller;

  const remarksRequired = currentRecord.statuses.some((s) =>
    REMARKS_REQUIRED_STATUSES.includes(s)
  );

  return (
    <TeacherSectionCard
      id="attendance-marking"
      title="Attendance Marking"
      description={
        isTeacher
          ? "Mark your attendance for the selected date"
          : "Mark or edit staff attendance on behalf of staff"
      }
      data-testid="section-attendance-marking"
    >
      <Stack spacing={2.5}>
        {currentRecord.payrollProcessed ? (
          <Alert severity="warning" data-testid="alert-payroll-readonly">
            Attendance is read-only after payroll processing.
          </Alert>
        ) : null}

        {isReadOnly && !currentRecord.payrollProcessed && isTeacher ? (
          <Alert severity="info" data-testid="alert-submitted-readonly">
            Attendance has been submitted and cannot be edited.
          </Alert>
        ) : null}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            label="Attendance Date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              max: new Date().toISOString().slice(0, 10),
              "data-testid": "input-attendance-date",
            }}
            fullWidth
            disabled={isReadOnly && isTeacher}
            data-testid="field-attendance-date"
          />

          {isAdminLike ? (
            <Autocomplete
              options={activeTeachers}
              getOptionLabel={(t) => t.name}
              value={activeTeachers.find((t) => t.id === selectedTeacherId) ?? null}
              onChange={(_e, value) => {
                if (value) setSelectedTeacherId(value.id);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Teacher"
                  placeholder="Search by teacher name"
                  inputProps={{
                    ...params.inputProps,
                    "data-testid": "input-teacher-search",
                  }}
                />
              )}
              data-testid="field-teacher-search"
              disabled={false}
            />
          ) : (
            <TextField
              label="Teacher"
              value={selectedTeacher?.name ?? ""}
              InputProps={{ readOnly: true }}
              fullWidth
              data-testid="field-teacher-auto"
            />
          )}
        </Box>

        {selectedShift ? (
          <Box
            data-testid="shift-information"
            sx={{
              borderRadius: 2,
              p: 2,
              bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.06),
              border: `1px solid ${alpha(colorTokens.preschool.turquoise.main, 0.2)}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Shift Information
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
              <Typography variant="body2" data-testid="shift-name">
                <strong>Shift:</strong> {selectedShift.name}
              </Typography>
              <Typography variant="body2" data-testid="shift-start">
                <strong>Start:</strong> {selectedShift.startTime}
              </Typography>
              <Typography variant="body2" data-testid="shift-end">
                <strong>End:</strong> {selectedShift.endTime}
              </Typography>
              <Typography variant="body2" data-testid="office-timing">
                <strong>Office:</strong> {officeTiming.startTime} – {officeTiming.endTime}
              </Typography>
            </Stack>
            {graceTime.enabled ? (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Grace time: {graceTime.graceMinutes} minutes (status becomes Late if exceeded)
              </Typography>
            ) : null}
          </Box>
        ) : null}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Check-in
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Check-in Time"
                value={currentRecord.checkInTime ?? "—"}
                InputProps={{ readOnly: true }}
                fullWidth
                data-testid="field-check-in-time"
              />
              <Button
                variant="contained"
                startIcon={<CheckInIcon />}
                onClick={handleCheckIn}
                disabled={isReadOnly || !!currentRecord.checkInTime}
                data-testid="btn-check-in"
                sx={{
                  whiteSpace: "nowrap",
                  bgcolor: colorTokens.preschool.mint.main,
                  "&:hover": { bgcolor: colorTokens.preschool.mint.dark },
                }}
              >
                Check In
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Check-out
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Check-out Time"
                type="time"
                value={currentRecord.checkOutTime ?? ""}
                onChange={(e) => handleCheckOut(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ "data-testid": "input-check-out-time" }}
                fullWidth
                disabled={!currentRecord.checkInTime || (!canEditCheckout && !!currentRecord.isSubmitted)}
                data-testid="field-check-out-time"
              />
              <Button
                variant="contained"
                startIcon={<CheckOutIcon />}
                onClick={() => handleCheckOut()}
                disabled={!currentRecord.checkInTime || isReadOnly}
                data-testid="btn-check-out"
                sx={{
                  whiteSpace: "nowrap",
                  bgcolor: colorTokens.preschool.lavender.main,
                  "&:hover": { bgcolor: colorTokens.preschool.lavender.dark },
                }}
              >
                Check Out
              </Button>
            </Stack>
          </Box>
        </Box>

        {workingHoursLabel ? (
          <Stack direction="row" spacing={2} data-testid="working-hours-display">
            <Chip
              label={`Working Hours: ${workingHoursLabel}`}
              color="primary"
              variant="outlined"
              data-testid="chip-working-hours"
            />
            {overtimeLabel ? (
              <Chip
                label={`Overtime: ${overtimeLabel}`}
                color="warning"
                variant="outlined"
                data-testid="chip-overtime"
              />
            ) : null}
          </Stack>
        ) : null}

        <FormControl fullWidth disabled={!canEditStatus}>
          <InputLabel id="attendance-status-label">Attendance Status</InputLabel>
          <Select
            labelId="attendance-status-label"
            multiple
            value={currentRecord.statuses}
            label="Attendance Status"
            onChange={(e) => {
              const value = e.target.value;
              handleStatusChange(
                (typeof value === "string" ? value.split(",") : value) as TeacherAttendanceStatus[]
              );
            }}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {(selected as TeacherAttendanceStatus[]).map((s) => (
                  <Chip key={s} label={s} size="small" data-testid={`chip-status-${s}`} />
                ))}
              </Box>
            )}
            data-testid="select-attendance-status"
          >
            {controller.statusOptions.map((status) => (
              <MenuItem key={status} value={status} data-testid={`status-option-${status}`}>
                {status}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Multiple statuses allowed (e.g. Half Day + Leave)</FormHelperText>
        </FormControl>

        <TextField
          label="Remarks"
          value={currentRecord.remarks}
          onChange={(e) => handleRemarksChange(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          required={remarksRequired}
          disabled={!canEditRemarks}
          helperText={`${currentRecord.remarks.length}/${MAX_REMARKS_LENGTH} characters${
            remarksRequired ? " — Required for Absent, Leave, or Half Day" : ""
          }`}
          inputProps={{ maxLength: MAX_REMARKS_LENGTH, "data-testid": "input-remarks" }}
          data-testid="field-remarks"
        />

        {currentRecord.remarkHistory.length > 0 ? (
          <Box data-testid="remark-history">
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Remark History
            </Typography>
            <Stack spacing={0.5}>
              {currentRecord.remarkHistory.map((entry) => (
                <Typography key={entry.id} variant="caption" color="text.secondary">
                  {entry.text} — {entry.updatedBy} ({new Date(entry.updatedAt).toLocaleString()})
                </Typography>
              ))}
            </Stack>
          </Box>
        ) : null}

        {validationErrors.length > 0 ? (
          <Stack spacing={0.5} data-testid="validation-errors">
            {validationErrors.map((err) => (
              <Alert key={err} severity="error">
                {err}
              </Alert>
            ))}
          </Stack>
        ) : null}

        <Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={requestSave}
            disabled={isReadOnly}
            data-testid="btn-save-attendance"
            sx={{
              bgcolor: colorTokens.preschool.turquoise.main,
              "&:hover": { bgcolor: colorTokens.preschool.turquoise.dark },
            }}
          >
            Save Attendance
          </Button>
        </Box>
      </Stack>
    </TeacherSectionCard>
  );
}
