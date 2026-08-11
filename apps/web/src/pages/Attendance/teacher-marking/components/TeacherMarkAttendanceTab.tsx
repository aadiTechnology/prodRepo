import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import LockIcon from "@mui/icons-material/Lock";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";

import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
import { FormHeaderIconAction } from "../../../../components/primitives";
import { MAX_REMARKS_LENGTH } from "../teacherAttendanceMarking.types";
import TeacherMarkAttendanceCalendar from "./TeacherMarkAttendanceCalendar";

interface TeacherMarkAttendanceTabProps {
  controller: TeacherAttendanceMarkingController;
}

export default function TeacherMarkAttendanceTab({ controller }: TeacherMarkAttendanceTabProps) {
  const {
    isAdminLike,
    markDate,
    setMarkDate,
    markTeacherId,
    setMarkTeacherId,
    markableTeachers,
    markDraft,
    markErrors,
    markRecord,
    calendarMonth,
    setCalendarMonth,
    calendarStatusByDate,
    calendarApprovalByDate,
    selectCalendarDate,
    updateMarkDraft,
    saveMarkAttendance,
    cancelMarkAttendance,
    today,
    teachersLoading,
    teachersError,
    saving,
  } = controller;

  const approvalState =
    markRecord && markRecord.isSubmitted ? markRecord.approvalStatus : null;
  const isRejected = approvalState === "Rejected";
  // Admins can always correct marks; teachers are locked while Waiting/Approved.
  const actionsLocked =
    !isAdminLike &&
    (approvalState === "Waiting for Approval" || approvalState === "Approved");
  const toPickerValue = (timeValue: string): Dayjs | null => {
    if (!timeValue) return null;
    const [hourRaw, minuteRaw] = timeValue.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return dayjs().hour(hour).minute(minute).second(0).millisecond(0);
  };
  const fromPickerValue = (next: Dayjs | null): string => {
    if (!next) return "";
    return next.format("HH:mm");
  };

  const statusChip =
    approvalState === "Approved" ? (
      <Chip
        icon={<LockIcon />}
        label="Approved"
        color="success"
        size="small"
        variant="outlined"
        data-testid="mark-status-chip"
      />
    ) : approvalState === "Waiting for Approval" ? (
      <Chip
        icon={<HourglassEmptyIcon />}
        label="Waiting for Approval"
        color="warning"
        size="small"
        variant="outlined"
        data-testid="mark-status-chip"
      />
    ) : approvalState === "Rejected" ? (
      <Chip
        icon={<CancelIcon />}
        label="Rejected"
        color="error"
        size="small"
        variant="outlined"
        data-testid="mark-status-chip"
      />
    ) : (
      <Chip
        label="Not Marked"
        size="small"
        variant="outlined"
        data-testid="mark-status-chip"
      />
    );

  return (
    <Box data-testid="tab-mark-attendance-content">
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        alignItems="stretch"
      >
        <Box
          sx={{
            width: { xs: "100%", md: 320 },
            flexShrink: 0,
            p: 2,
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
          }}
        >
          <TeacherMarkAttendanceCalendar
            month={calendarMonth}
            selectedDate={markDate}
            statusByDate={calendarStatusByDate}
            approvalByDate={calendarApprovalByDate}
            onMonthChange={setCalendarMonth}
            onDateSelect={selectCalendarDate}
          />
        </Box>

        <Paper
          elevation={0}
          sx={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
          }}
          data-testid="mark-attendance-entry-card"
        >
          <Stack spacing={2.5}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <AssignmentIndIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Attendance Entry
                </Typography>
              </Stack>
              {statusChip}
            </Stack>

            {teachersError ? (
              <Alert severity="error" data-testid="mark-teachers-error">
                {teachersError}
              </Alert>
            ) : null}

            {isAdminLike && !teachersLoading && markableTeachers.length === 0 ? (
              <Alert severity="warning" data-testid="mark-teachers-empty">
                No active teachers found for this school. Add teachers in Teacher Management first.
              </Alert>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {isAdminLike ? (
                <TextField
                  select
                  label="Teacher Name"
                  value={markTeacherId}
                  onChange={(e) => setMarkTeacherId(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ flex: 1 }}
                  disabled={teachersLoading || markableTeachers.length === 0}
                  data-testid="field-mark-teacher"
                >
                  {markableTeachers.map((teacher) => (
                    <MenuItem
                      key={teacher.id}
                      value={teacher.id}
                      data-testid={`mark-teacher-option-${teacher.id}`}
                    >
                      {teacher.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}

              <TextField
                label="Attendance Date"
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                size="small"
                fullWidth
                sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  max: today,
                  "data-testid": "select-mark-attendance-date",
                }}
                data-testid="field-mark-attendance-date"
              />
            </Stack>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TimePicker
                  label="Check In"
                  ampm
                  value={toPickerValue(markDraft.checkInTime)}
                  onChange={(next) => updateMarkDraft("checkInTime", fromPickerValue(next))}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      sx: { flex: 1 },
                      inputProps: { "data-testid": "input-mark-check-in" },
                    },
                  }}
                />
                <TimePicker
                  label="Check Out"
                  ampm
                  value={toPickerValue(markDraft.checkOutTime)}
                  onChange={(next) => updateMarkDraft("checkOutTime", fromPickerValue(next))}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      sx: { flex: 1 },
                      inputProps: { "data-testid": "input-mark-check-out" },
                    },
                  }}
                />
              </Stack>
            </LocalizationProvider>

            <TextField
              label="Remarks"
              value={markDraft.remarks}
              onChange={(e) => updateMarkDraft("remarks", e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={3}
              placeholder="Add any session notes or remarks here..."
              inputProps={{
                maxLength: MAX_REMARKS_LENGTH,
                "data-testid": "input-mark-remarks",
              }}
              helperText={`${markDraft.remarks.length}/${MAX_REMARKS_LENGTH} characters`}
              FormHelperTextProps={{ sx: { textAlign: "right", m: 0, mt: 0.5 } }}
              data-testid="field-mark-remarks"
            />

            {markErrors.length > 0 ? (
              <Stack spacing={0.5} data-testid="mark-attendance-errors">
                {markErrors.map((error) => (
                  <Alert key={error} severity="error">
                    {error}
                  </Alert>
                ))}
              </Stack>
            ) : null}

            {isRejected ? (
              <TextField
                label="Reason for Reject"
                value={markRecord?.rejectionReason ?? ""}
                size="small"
                fullWidth
                multiline
                minRows={2}
                InputProps={{ readOnly: true }}
                inputProps={{ "data-testid": "input-mark-rejection-reason" }}
                data-testid="field-mark-rejection-reason"
              />
            ) : null}

            <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
              {actionsLocked && approvalState === "Waiting for Approval" ? (
                <Button
                  variant="contained"
                  color="warning"
                  disabled
                  data-testid="btn-mark-status-waiting"
                >
                  Waiting for Approval
                </Button>
              ) : actionsLocked && approvalState === "Approved" ? null
              : (
                <>
                  <FormHeaderIconAction
                    variant="cancel"
                    tooltipTitle="Cancel changes"
                    onClick={cancelMarkAttendance}
                    disabled={saving}
                    data-testid="btn-mark-cancel"
                  />
                  <FormHeaderIconAction
                    variant="save"
                    tooltipTitle="Save attendance"
                    onClick={() => void saveMarkAttendance()}
                    disabled={isAdminLike && markableTeachers.length === 0}
                    loading={saving}
                    data-testid="btn-mark-save"
                  />
                </>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
