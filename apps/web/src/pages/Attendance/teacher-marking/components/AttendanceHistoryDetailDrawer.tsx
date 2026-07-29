import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import type { TeacherAttendanceRecord } from "../teacherAttendanceMarking.types";
import { getShiftById, getTeacherById } from "../teacherAttendanceMarking.mock";
import { minutesToDuration } from "../teacherAttendanceMarking.utils";

interface AttendanceHistoryDetailDrawerProps {
  record: TeacherAttendanceRecord | null;
  onClose: () => void;
}

function DetailRow({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <Box data-testid={testId}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function AttendanceHistoryDetailDrawer({
  record,
  onClose,
}: AttendanceHistoryDetailDrawerProps) {
  const open = record != null;
  const teacher = record ? getTeacherById(record.teacherId) : undefined;
  const shift = teacher ? getShiftById(teacher.shiftId) : undefined;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      data-testid="drawer-attendance-history-detail"
      PaperProps={{
        sx: { width: { xs: "100%", sm: 400 }, p: 0 },
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="drawer-detail-title">
            Attendance Details
          </Typography>
          <IconButton
            aria-label="Close attendance detail"
            onClick={onClose}
            data-testid="btn-close-history-detail"
          >
            <CloseIcon />
          </IconButton>
        </Stack>

        {record ? (
          <Stack spacing={2} data-testid={`drawer-detail-record-${record.id}`}>
            <DetailRow label="Date" value={record.date} testId="drawer-detail-date" />
            <DetailRow
              label="Teacher Name"
              value={teacher?.name ?? "—"}
              testId="drawer-detail-teacher"
            />
            <DetailRow
              label="Shift"
              value={shift ? `${shift.name} (${shift.startTime} – ${shift.endTime})` : "—"}
              testId="drawer-detail-shift"
            />
            <Divider />
            <DetailRow
              label="Check-in Time"
              value={record.checkInTime ?? "—"}
              testId="drawer-detail-check-in"
            />
            <DetailRow
              label="Check-out Time"
              value={record.checkOutTime ?? "—"}
              testId="drawer-detail-check-out"
            />
            <DetailRow
              label="Working Hours"
              value={
                record.workingHoursMinutes != null
                  ? minutesToDuration(record.workingHoursMinutes)
                  : "—"
              }
              testId="drawer-detail-working-hours"
            />
            {record.overtimeMinutes != null && record.overtimeMinutes > 0 ? (
              <DetailRow
                label="Overtime"
                value={minutesToDuration(record.overtimeMinutes)}
                testId="drawer-detail-overtime"
              />
            ) : null}

            <Box data-testid="drawer-detail-statuses">
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Attendance Status
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {record.statuses.length > 0 ? (
                  record.statuses.map((s) => (
                    <Chip key={s} label={s} size="small" data-testid={`drawer-status-${s}`} />
                  ))
                ) : (
                  <Typography variant="body2">—</Typography>
                )}
              </Stack>
            </Box>

            <DetailRow
              label="Remarks"
              value={record.remarks || "—"}
              testId="drawer-detail-remarks"
            />

            {record.remarkHistory.length > 0 ? (
              <Box data-testid="drawer-detail-remark-history">
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Remark History
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                  {record.remarkHistory.map((entry) => (
                    <Typography key={entry.id} variant="caption" color="text.secondary">
                      {entry.text} — {entry.updatedBy} (
                      {new Date(entry.updatedAt).toLocaleString()})
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ) : null}

            <Divider />

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {record.isSubmitted ? (
                <Chip
                  label="Submitted"
                  size="small"
                  color="success"
                  variant="outlined"
                  data-testid="drawer-chip-submitted"
                />
              ) : (
                <Chip
                  label="Draft"
                  size="small"
                  variant="outlined"
                  data-testid="drawer-chip-draft"
                />
              )}
              {record.payrollProcessed ? (
                <Chip
                  label="Payroll Processed"
                  size="small"
                  color="warning"
                  variant="outlined"
                  data-testid="drawer-chip-payroll"
                />
              ) : null}
            </Stack>
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  );
}
