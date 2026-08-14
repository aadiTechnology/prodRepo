import React, { useMemo } from "react";
import {
  Box,
  IconButton,
  Stack,
  Typography,
  alpha,
  Tooltip,
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
  HourglassEmpty as WaitingIcon,
  Celebration as HolidayIcon,
} from "@mui/icons-material";

import { colorTokens } from "../../../../tokens/colors";
import type {
  ApprovalStatus,
  TeacherAttendanceStatus,
} from "../teacherAttendanceMarking.types";
import { toIsoDate } from "../teacherAttendanceMarking.utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const STATUS_META: Record<
  TeacherAttendanceStatus,
  { color: string; Icon: React.ElementType; label: string }
> = {
  Present: { color: colorTokens.preschool.mint.main, Icon: PresentIcon, label: "Present" },
  Absent: { color: colorTokens.preschool.coral.main, Icon: AbsentIcon, label: "Absent" },
  Late: { color: "#eab308", Icon: LateIcon, label: "Late" },           // amber-yellow
  "Half Day": { color: "#8b5cf6", Icon: HalfDayIcon, label: "Half Day" },
  Leave: { color: colorTokens.preschool.lavender.main, Icon: LeaveIcon, label: "Leave" },
  Holiday: { color: colorTokens.text.secondary, Icon: DotIcon, label: "Holiday" },
  Others: { color: "#94a3b8", Icon: DotIcon, label: "Others" },
};

// Holiday gets its own distinct color — teal/blue-green, nothing like Late (yellow)
const HOLIDAY_COLOR = "#0ea5e9"; // sky-blue

const APPROVAL_META: Partial<
  Record<ApprovalStatus, { color: string; Icon: React.ElementType; label: string }>
> = {
  Rejected: {
    color: colorTokens.preschool.coral.main,
    Icon: AbsentIcon,
    label: "Rejected",
  },
  "Waiting for Approval": {
    color: colorTokens.preschool.peach.main,
    Icon: WaitingIcon,
    label: "Waiting for Approval",
  },
};

function formatTimeDisplay(time: string | null): string {
  if (!time) return "—";
  const [hour, minute] = time.split(":");
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "—";
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatTimeRange(checkIn: string | null, checkOut: string | null): string {
  const inTime = formatTimeDisplay(checkIn);
  const outTime = formatTimeDisplay(checkOut);
  if (inTime === "—" && outTime === "—") return "No times recorded";
  if (inTime === "—") return `Check Out: ${outTime}`;
  if (outTime === "—") return `Check In: ${inTime}`;
  return `${inTime} - ${outTime}`;
}

interface TeacherMarkAttendanceCalendarProps {
  month: Date;
  selectedDate: string;
  statusByDate: Record<string, TeacherAttendanceStatus>;
  /** Approval overrides calendar icon: Rejected=red, Waiting=orange, Approved=status color */
  approvalByDate?: Record<string, ApprovalStatus>;
  /** Records by date for tooltip times */
  recordsByDate?: Record<string, { checkInTime: string | null; checkOutTime: string | null }>;
  /** Holidays by date (ISO string -> holiday name) */
  holidays?: Record<string, string>;
  onMonthChange: (next: Date) => void;
  onDateSelect: (iso: string) => void;
}

function resolveCellMeta(
  status: TeacherAttendanceStatus | undefined,
  approval: ApprovalStatus | undefined
): { color: string; Icon: React.ElementType; label: string } | null {
  if (approval === "Rejected") {
    return APPROVAL_META.Rejected!;
  }
  if (approval === "Waiting for Approval") {
    return APPROVAL_META["Waiting for Approval"]!;
  }
  // Approved / draft / no approval → show attendance status (Present=green, Late=orange, …)
  if (!status) return null;
  return STATUS_META[status];
}

export default function TeacherMarkAttendanceCalendar({
  month,
  selectedDate,
  statusByDate,
  approvalByDate = {},
  recordsByDate = {},
  holidays = {},
  onMonthChange,
  onDateSelect,
}: TeacherMarkAttendanceCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

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
        status: statusByDate[iso],
        approval: approvalByDate[iso],
        holidayName: holidays[iso],
      };
    });
  }, [monthIndex, statusByDate, approvalByDate, holidays, year]);

  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Box data-testid="mark-attendance-calendar">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {monthLabel}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            aria-label="Previous month"
            onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
            data-testid="btn-mark-calendar-prev"
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Next month"
            onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
            data-testid="btn-mark-calendar-next"
          >
            <ChevronRight />
          </IconButton>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
        }}
        data-testid="mark-attendance-calendar-grid"
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
            return <Box key={cell.key} sx={{ minHeight: 40 }} />;
          }

          const isSelected = cell.iso === selectedDate;
          const meta = resolveCellMeta(cell.status, cell.approval);
          const StatusIcon = meta?.Icon;
          const isHoliday = !!cell.holidayName;
          const recordTimes = recordsByDate[cell.iso];
          const tooltipText = isHoliday
            ? `🎉 ${cell.holidayName}`
            : formatTimeRange(recordTimes?.checkInTime ?? null, recordTimes?.checkOutTime ?? null);

          return (
            <Tooltip title={tooltipText} arrow disableInteractive>
              <Box
                key={cell.key}
                role="button"
                tabIndex={0}
                onClick={() => onDateSelect(cell.iso)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onDateSelect(cell.iso);
                }}
                data-testid={`mark-calendar-cell-${cell.iso}`}
                sx={{
                  minHeight: 40,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.25,
                  bgcolor: isSelected
                    ? alpha(colorTokens.preschool.turquoise.main, 0.2)
                    : isHoliday
                      ? alpha(HOLIDAY_COLOR, 0.15)
                      : meta
                        ? alpha(meta.color, 0.12)
                        : alpha(colorTokens.border.subtle, 0.35),
                  border: isSelected
                    ? `2px solid ${colorTokens.preschool.turquoise.main}`
                    : isHoliday
                      ? `1px solid ${alpha(HOLIDAY_COLOR, 0.5)}`
                      : meta
                        ? `1px solid ${alpha(meta.color, 0.28)}`
                        : `1px solid ${colorTokens.border.subtle}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1,
                    color: isHoliday ? HOLIDAY_COLOR : "inherit",
                  }}
                >
                  {cell.day}
                </Typography>
                {isHoliday ? (
                  <HolidayIcon
                    sx={{ fontSize: 14, color: HOLIDAY_COLOR }}
                  />
                ) : StatusIcon ? (
                  <StatusIcon
                    sx={{ fontSize: 14, color: meta!.color }}
                    titleAccess={meta!.label}
                  />
                ) : null}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mt: 1.5, px: 0.25 }}
        data-testid="mark-attendance-calendar-legend"
      >
        {[
          { label: "Present", color: STATUS_META.Present.color },
          { label: "Rejected", color: APPROVAL_META.Rejected!.color },
          { label: "Late", color: "#eab308" },
          { label: "Holiday", color: HOLIDAY_COLOR },
        ].map((item) => (
          <Stack
            key={item.label}
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: item.color,
                flexShrink: 0,
              }}
            />
            <Typography
              variant="caption"
              noWrap
              sx={{ color: colorTokens.text.secondary, fontWeight: 500 }}
            >
              {item.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
