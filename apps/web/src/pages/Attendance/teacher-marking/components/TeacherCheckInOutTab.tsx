import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
import { colorTokens } from "../../../../tokens/colors";
import { formatAttendanceTimeDisplay } from "../teacherAttendanceMarking.utils";

interface TeacherCheckInOutTabProps {
  controller: TeacherAttendanceMarkingController;
}

function TimeDisplay({ label, value, testId }: { label: string; value: string; testId: string }) {
  const hasValue = value !== "—";
  return (
    <Box
      sx={{
        borderRadius: 2,
        p: 2,
        bgcolor: hasValue
          ? alpha(colorTokens.preschool.turquoise.main, 0.06)
          : alpha(colorTokens.text.secondary, 0.04),
        border: `1px solid ${
          hasValue
            ? alpha(colorTokens.preschool.turquoise.main, 0.2)
            : colorTokens.border.default
        }`,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mt: 0.5, letterSpacing: 0.5 }}
        data-testid={testId}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function TeacherCheckInOutTab({ controller }: TeacherCheckInOutTabProps) {
  const {
    displayCheckInTime,
    displayCheckOutTime,
    showCheckInButton,
    showCheckOutButton,
    buttonsDisabled,
    checkInOutErrors,
    handleCheckIn,
    handleCheckOut,
    selfTeacherId,
    isTeacher,
    saving,
    today,
    todayAttendanceStatus,
    officeTimingConfig,
    todayRecord,
  } = controller;

  const formattedDate = new Date(`${today}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const officeStart = formatAttendanceTimeDisplay(officeTimingConfig.startTime);
  const officeEnd = formatAttendanceTimeDisplay(officeTimingConfig.endTime);
  const isComplete = !!todayRecord.checkInTime && !!todayRecord.checkOutTime;

  return (
    <Box data-testid="tab-check-in-out-content">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
        }}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <AccessTimeIcon color="primary" />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Today&apos;s Attendance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formattedDate}
                </Typography>
              </Box>
            </Stack>
            {todayAttendanceStatus ? (
              <Chip
                label={todayAttendanceStatus}
                size="small"
                color={todayAttendanceStatus === "Late" ? "warning" : "success"}
                variant="outlined"
                data-testid="check-in-out-status-chip"
              />
            ) : null}
          </Stack>

          <Box
            sx={{
              borderRadius: 2,
              px: 2,
              py: 1.25,
              bgcolor: alpha(colorTokens.primary.main, 0.04),
              border: `1px solid ${colorTokens.border.default}`,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Office hours: <strong>{officeStart}</strong> – <strong>{officeEnd}</strong>
            </Typography>
          </Box>

          {isTeacher && !selfTeacherId ? (
            <Alert severity="warning" data-testid="check-in-no-teacher-profile">
              No teacher profile is linked to your login. Ask an admin to link your user account to a
              teacher record.
            </Alert>
          ) : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Check In
              </Typography>
              <TimeDisplay
                label="Recorded time"
                value={displayCheckInTime}
                testId="field-check-in-time"
              />
              {showCheckInButton ? (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<LoginIcon />}
                  onClick={() => void handleCheckIn()}
                  disabled={buttonsDisabled || saving}
                  data-testid="btn-check-in"
                  sx={{
                    py: 1.25,
                    bgcolor: colorTokens.preschool.mint.main,
                    "&:hover": { bgcolor: colorTokens.preschool.mint.dark },
                  }}
                >
                  {saving ? "Saving…" : "Check In"}
                </Button>
              ) : todayRecord.checkInTime ? (
                <Chip
                  icon={<CheckCircleOutlineIcon />}
                  label="Checked in"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ alignSelf: "flex-start" }}
                />
              ) : null}
            </Stack>

            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Check Out
              </Typography>
              <TimeDisplay
                label="Recorded time"
                value={displayCheckOutTime}
                testId="field-check-out-time"
              />
              {showCheckOutButton ? (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<LogoutIcon />}
                  onClick={() => void handleCheckOut()}
                  disabled={buttonsDisabled || saving}
                  data-testid="btn-check-out"
                  sx={{
                    py: 1.25,
                    bgcolor: colorTokens.preschool.lavender.main,
                    "&:hover": { bgcolor: colorTokens.preschool.lavender.dark },
                  }}
                >
                  {saving ? "Saving…" : "Check Out"}
                </Button>
              ) : todayRecord.checkOutTime ? (
                <Chip
                  icon={<CheckCircleOutlineIcon />}
                  label="Checked out"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ alignSelf: "flex-start" }}
                />
              ) : !todayRecord.checkInTime ? (
                <Typography variant="caption" color="text.secondary">
                  Check in first to enable check out
                </Typography>
              ) : null}
            </Stack>
          </Box>

          {isComplete ? (
            <Alert severity="success" data-testid="check-in-out-complete">
              Attendance recorded for today — {displayCheckInTime} to {displayCheckOutTime}
            </Alert>
          ) : null}

          {checkInOutErrors.length > 0 ? (
            <Stack spacing={0.5} data-testid="check-in-out-errors">
              {checkInOutErrors.map((error) => (
                <Alert key={error} severity="error">
                  {error}
                </Alert>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}
