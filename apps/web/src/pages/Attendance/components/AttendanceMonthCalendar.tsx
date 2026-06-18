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
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  EventNote as EventNoteIcon,
  FiberManualRecord as DotIcon,
} from "@mui/icons-material";
import { AppCard } from "../../../components/primitives";
import { colorTokens } from "../../../tokens/colors";

export type AttendanceCalendarStatus =
  | "Present"
  | "Absent"
  | "Half Day"
  | "Leave"
  | "Holiday"
  | "Weekend";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const STATUS_META: Record<
  AttendanceCalendarStatus,
  { color: string; Icon: React.ElementType }
> = {
  Present: { color: colorTokens.preschool.mint.main, Icon: CheckCircleIcon },
  Absent: { color: colorTokens.preschool.coral.main, Icon: CancelIcon },
  "Half Day": { color: colorTokens.preschool.peach.main, Icon: WarningIcon },
  Leave: { color: colorTokens.preschool.lavender.main, Icon: EventNoteIcon },
  Holiday: { color: colorTokens.text.secondary, Icon: DotIcon },
  Weekend: { color: colorTokens.text.secondary, Icon: DotIcon },
};

const toIsoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export interface AttendanceMonthCalendarProps {
  month: Date;
  onMonthChange: (next: Date) => void;
  statusByDate: Record<string, AttendanceCalendarStatus>;
}

export function AttendanceMonthCalendar({
  month,
  onMonthChange,
  statusByDate,
}: AttendanceMonthCalendarProps) {
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

  const shiftMonth = (delta: number) => {
    onMonthChange(new Date(year, monthIndex + delta, 1));
  };

  return (
    <AppCard
      sx={{
        height: "100%",
        borderRadius: "14px",
        border: `1px solid ${colorTokens.border.default}`,
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: colorTokens.text.primary }}>
            {monthLabel}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft />
            </IconButton>
            <IconButton size="small" aria-label="Next month" onClick={() => shiftMonth(1)}>
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
                sx={{
                  minHeight: 52,
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.25,
                  bgcolor: meta ? alpha(meta.color, 0.14) : alpha(colorTokens.border.subtle, 0.35),
                  border: meta
                    ? `1px solid ${alpha(meta.color, 0.28)}`
                    : `1px solid ${colorTokens.border.subtle}`,
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

        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1.5}
          sx={{ pt: 0.5, borderTop: `1px solid ${colorTokens.border.subtle}` }}
        >
          {(Object.keys(STATUS_META) as AttendanceCalendarStatus[]).map((status) => {
            const { color, Icon } = STATUS_META[status];
            return (
              <Stack key={status} direction="row" spacing={0.5} alignItems="center">
                <Icon sx={{ fontSize: 14, color }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.text.secondary }}>
                  {status === "Half Day" ? "Half Day" : status}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </AppCard>
  );
}

export default AttendanceMonthCalendar;
