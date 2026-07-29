import React, { useMemo } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  Schedule as LateIcon,
  EventNote as LeaveIcon,
  Warning as HalfDayIcon,
  FiberManualRecord as DotIcon,
} from "@mui/icons-material";

import { colorTokens } from "../../../../tokens/colors";
import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
import type { TeacherAttendanceStatus } from "../teacherAttendanceMarking.types";
import { toIsoDate } from "../teacherAttendanceMarking.utils";
import TeacherSectionCard from "./TeacherSectionCard";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const STATUS_META: Record<
  TeacherAttendanceStatus,
  { color: string; Icon: React.ElementType; label: string }
> = {
  Present: { color: colorTokens.preschool.mint.main, Icon: PresentIcon, label: "Present" },
  Absent: { color: colorTokens.preschool.coral.main, Icon: AbsentIcon, label: "Absent" },
  Late: { color: colorTokens.preschool.peach.main, Icon: LateIcon, label: "Late" },
  "Half Day": { color: "#8b5cf6", Icon: HalfDayIcon, label: "Half Day" },
  Leave: { color: colorTokens.preschool.lavender.main, Icon: LeaveIcon, label: "Leave" },
  Holiday: { color: colorTokens.text.secondary, Icon: DotIcon, label: "Holiday" },
  Others: { color: "#94a3b8", Icon: DotIcon, label: "Others" },
};

interface AttendanceCalendarSectionProps {
  controller: TeacherAttendanceMarkingController;
}

export default function AttendanceCalendarSection({ controller }: AttendanceCalendarSectionProps) {
  const {
    calendarMonth,
    setCalendarMonth,
    calendarStatusByDate,
    calendarDetailDate,
    setCalendarDetailDate,
    selectCalendarDate,
    getRecordForDate,
    selectedTeacher,
  } = controller;

  const year = calendarMonth.getFullYear();
  const monthIndex = calendarMonth.getMonth();

  const cells = useMemo(() => {
    const firstDay = new Date(year, monthIndex, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - startOffset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return { key: `empty-${index}`, empty: true as const };
      }
      const iso = toIsoDate(year, monthIndex, dayNumber);
      return {
        key: iso,
        empty: false as const,
        day: dayNumber,
        iso,
        status: calendarStatusByDate[iso],
      };
    });
  }, [calendarStatusByDate, monthIndex, year]);

  const monthLabel = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) => {
    setCalendarMonth(new Date(year, monthIndex + delta, 1));
  };

  const detailRecord = calendarDetailDate
    ? getRecordForDate(calendarDetailDate, selectedTeacher?.id)
    : undefined;

  return (
    <>
      <TeacherSectionCard
        id="attendance-calendar"
        title="Attendance Calendar"
        description={`Monthly view for ${selectedTeacher?.name ?? "selected teacher"}`}
        data-testid="section-attendance-calendar"
      >
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {monthLabel}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                data-testid="btn-calendar-prev-month"
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                data-testid="btn-calendar-next-month"
              >
                <ChevronRight />
              </IconButton>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 0.75,
            }}
            data-testid="teacher-attendance-calendar-grid"
          >
            {WEEKDAY_LABELS.map((label) => (
              <Typography
                key={label}
                variant="caption"
                align="center"
                sx={{ fontWeight: 700, color: colorTokens.text.secondary, py: 0.5 }}
              >
                {label}
              </Typography>
            ))}

            {cells.map((cell) => {
              if (cell.empty) {
                return <Box key={cell.key} sx={{ minHeight: 52 }} />;
              }

              const meta = cell.status ? STATUS_META[cell.status] : null;
              const StatusIcon = meta?.Icon;

              return (
                <Box
                  key={cell.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectCalendarDate(cell.iso)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") selectCalendarDate(cell.iso);
                  }}
                  data-testid={`calendar-cell-${cell.iso}`}
                  sx={{
                    minHeight: 52,
                    borderRadius: "10px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.25,
                    bgcolor: meta ? alpha(meta.color, 0.14) : alpha(colorTokens.border.subtle, 0.35),
                    border: meta
                      ? `1px solid ${alpha(meta.color, 0.28)}`
                      : `1px solid ${colorTokens.border.subtle}`,
                    "&:hover": {
                      bgcolor: meta ? alpha(meta.color, 0.22) : alpha(colorTokens.border.subtle, 0.5),
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: colorTokens.text.primary, lineHeight: 1 }}
                  >
                    {cell.day}
                  </Typography>
                  {StatusIcon ? (
                    <StatusIcon sx={{ fontSize: 16, color: meta!.color }} />
                  ) : null}
                </Box>
              );
            })}
          </Box>

          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            {(Object.keys(STATUS_META) as TeacherAttendanceStatus[]).map((status) => {
              const { color, Icon, label } = STATUS_META[status];
              return (
                <Stack key={status} direction="row" spacing={0.5} alignItems="center">
                  <Icon sx={{ fontSize: 14, color }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.text.secondary }}>
                    {label}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      </TeacherSectionCard>

      <Dialog
        open={calendarDetailDate != null}
        onClose={() => setCalendarDetailDate(null)}
        data-testid="dialog-calendar-detail"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Attendance — {calendarDetailDate}
        </DialogTitle>
        <DialogContent>
          {detailRecord ? (
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Status:</strong> {detailRecord.statuses.join(" + ") || "—"}
              </Typography>
              <Typography variant="body2">
                <strong>Check-in:</strong> {detailRecord.checkInTime ?? "—"}
              </Typography>
              <Typography variant="body2">
                <strong>Check-out:</strong> {detailRecord.checkOutTime ?? "—"}
              </Typography>
              {detailRecord.remarks ? (
                <Typography variant="body2">
                  <strong>Remarks:</strong> {detailRecord.remarks}
                </Typography>
              ) : null}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" data-testid="calendar-detail-empty">
              No attendance record for this date.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
