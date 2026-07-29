import React, { useMemo } from "react";
import {
  Box,
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
import type { TeacherAttendanceStatus } from "../teacherAttendanceMarking.types";
import { toIsoDate } from "../teacherAttendanceMarking.utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const STATUS_META: Record<
  TeacherAttendanceStatus,
  { color: string; Icon: React.ElementType }
> = {
  Present: { color: colorTokens.preschool.mint.main, Icon: PresentIcon },
  Absent: { color: colorTokens.preschool.coral.main, Icon: AbsentIcon },
  Late: { color: colorTokens.preschool.peach.main, Icon: LateIcon },
  "Half Day": { color: "#8b5cf6", Icon: HalfDayIcon },
  Leave: { color: colorTokens.preschool.lavender.main, Icon: LeaveIcon },
  Holiday: { color: colorTokens.text.secondary, Icon: DotIcon },
  Others: { color: "#94a3b8", Icon: DotIcon },
};

interface TeacherMarkAttendanceCalendarProps {
  month: Date;
  selectedDate: string;
  statusByDate: Record<string, TeacherAttendanceStatus>;
  onMonthChange: (next: Date) => void;
  onDateSelect: (iso: string) => void;
}

export default function TeacherMarkAttendanceCalendar({
  month,
  selectedDate,
  statusByDate,
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
      };
    });
  }, [monthIndex, statusByDate, year]);

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
          const meta = cell.status ? STATUS_META[cell.status] : null;
          const StatusIcon = meta?.Icon;

          return (
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
                  : meta
                    ? alpha(meta.color, 0.12)
                    : alpha(colorTokens.border.subtle, 0.35),
                border: isSelected
                  ? `2px solid ${colorTokens.preschool.turquoise.main}`
                  : meta
                    ? `1px solid ${alpha(meta.color, 0.28)}`
                    : `1px solid ${colorTokens.border.subtle}`,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {cell.day}
              </Typography>
              {StatusIcon ? <StatusIcon sx={{ fontSize: 14, color: meta!.color }} /> : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
