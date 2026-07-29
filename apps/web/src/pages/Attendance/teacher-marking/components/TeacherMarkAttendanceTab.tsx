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
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import LockIcon from "@mui/icons-material/Lock";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";

import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
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
    selectCalendarDate,
    updateMarkDraft,
    saveMarkAttendance,
    cancelMarkAttendance,
    today,
  } = controller;

  const approvalState =
    markRecord && markRecord.isSubmitted ? markRecord.approvalStatus : null;
  const isRejected = approvalState === "Rejected";

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

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Check In"
                type="time"
                value={markDraft.checkInTime}
                onChange={(e) => updateMarkDraft("checkInTime", e.target.value)}
                size="small"
                fullWidth
                sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ "data-testid": "input-mark-check-in" }}
                data-testid="field-mark-check-in"
              />
              <TextField
                label="Check Out"
                type="time"
                value={markDraft.checkOutTime}
                onChange={(e) => updateMarkDraft("checkOutTime", e.target.value)}
                size="small"
                fullWidth
                sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ "data-testid": "input-mark-check-out" }}
                data-testid="field-mark-check-out"
              />
            </Stack>

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
              {approvalState === "Waiting for Approval" ? (
                <Button
                  variant="contained"
                  color="warning"
                  disabled
                  data-testid="btn-mark-status-waiting"
                >
                  Waiting for Approval
                </Button>
              ) : approvalState === "Approved" ? (
                <Button
                  variant="contained"
                  color="success"
                  disabled
                  data-testid="btn-mark-status-approved"
                >
                  Approved
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    onClick={cancelMarkAttendance}
                    data-testid="btn-mark-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={saveMarkAttendance}
                    data-testid="btn-mark-save"
                  >
                    Save
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
