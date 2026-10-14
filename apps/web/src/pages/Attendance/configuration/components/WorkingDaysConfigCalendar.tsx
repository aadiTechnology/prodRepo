import { useMemo } from "react";
import { Box, IconButton, Stack, Typography, alpha } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

import { AppCard } from "../../../../components/primitives";
import { colorTokens } from "../../../../tokens/colors";
import type {
  ExtraWorkingTeacher,
  PublicHoliday,
  WorkingDayKey,
  WorkingDaysConfig,
  DateShiftOverride,
} from "../attendanceConfiguration.types";
import {
  buildWorkingDaysPreviewGrid,
  type WorkingDayCellKind,
} from "../workingDaysCalendar.utils";

const WEEKEND_RED = "#dc2626";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const HEADER_WEEKDAY_KEYS: WorkingDayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const CELL_STYLE: Record<
  WorkingDayCellKind,
  { bg: string; border: string; labelColor: string; dayColor: string }
> = {
  working: {
    bg: alpha(colorTokens.preschool.mint.main, 0.12),
    border: alpha(colorTokens.preschool.mint.main, 0.45),
    labelColor: "#15803d",
    dayColor: colorTokens.text.primary,
  },
  holiday: {
    bg: alpha(WEEKEND_RED, 0.1),
    border: alpha(WEEKEND_RED, 0.45),
    labelColor: WEEKEND_RED,
    dayColor: WEEKEND_RED,
  },
  weekend: {
    bg: alpha(WEEKEND_RED, 0.08),
    border: alpha(WEEKEND_RED, 0.35),
    labelColor: WEEKEND_RED,
    dayColor: WEEKEND_RED,
  },
};

const LEGEND: { kind: WorkingDayCellKind; title: string }[] = [
  { kind: "working", title: "Working Day" },
  { kind: "holiday", title: "Holiday" },
  { kind: "weekend", title: "Weekend" },
];

type Props = {
  month: Date;
  onMonthChange: (next: Date) => void;
  workingDays: WorkingDaysConfig;
  holidays: PublicHoliday[];
  nonWorkingDates: string[];
  extraWorkingTeachers: ExtraWorkingTeacher[];
  dateShiftOverrides: DateShiftOverride[];
  teacherName: (id: string) => string;
  selectedDate?: string;
  onDateSelect?: (iso: string) => void;
};

function LegendSwatch({ kind }: { kind: WorkingDayCellKind }) {
  const style = CELL_STYLE[kind];
  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: "6px",
        bgcolor: style.bg,
        border: `1px solid ${style.border}`,
        flexShrink: 0,
      }}
    />
  );
}

export default function WorkingDaysConfigCalendar({
  month,
  onMonthChange,
  workingDays,
  holidays,
  nonWorkingDates,
  extraWorkingTeachers,
  dateShiftOverrides,
  teacherName,
  selectedDate,
  onDateSelect,
}: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const cells = useMemo(
    () =>
      buildWorkingDaysPreviewGrid(
        year,
        monthIndex,
        workingDays,
        holidays,
        nonWorkingDates,
        extraWorkingTeachers,
        teacherName,
        dateShiftOverrides
      ),
    [year, monthIndex, workingDays, holidays, nonWorkingDates, extraWorkingTeachers, teacherName, dateShiftOverrides]
  );

  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const shiftMonth = (delta: number) => {
    onMonthChange(new Date(year, monthIndex + delta, 1));
  };

  return (
    <AppCard
      sx={{
        borderRadius: "14px",
        border: `1px solid ${colorTokens.border.default}`,
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
      }}
      data-testid="working-days-config-calendar"
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
          {WEEKDAY_LABELS.map((label, index) => {
            const weekdayKey = HEADER_WEEKDAY_KEYS[index];
            const isWeeklyOff = !workingDays[weekdayKey];
            return (
              <Typography
                key={label}
                variant="caption"
                align="center"
                sx={{
                  fontWeight: 700,
                  color: isWeeklyOff ? WEEKEND_RED : colorTokens.text.secondary,
                  py: 0.5,
                }}
              >
                {label}
              </Typography>
            );
          })}

          {cells.map((cell) => {
            if (!cell.inMonth) {
              return <Box key={`pad-${cell.iso}`} sx={{ minHeight: 88 }} />;
            }

            const style = CELL_STYLE[cell.kind];
            const isSelected = selectedDate === cell.iso;
            const interactive = !!onDateSelect;

            return (
              <Box
                key={cell.iso}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                onClick={interactive ? () => onDateSelect!(cell.iso) : undefined}
                onKeyDown={
                  interactive
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") onDateSelect!(cell.iso);
                      }
                    : undefined
                }
                data-testid={`working-days-cell-${cell.iso}`}
                sx={{
                  minHeight: 88,
                  borderRadius: "10px",
                  px: 0.5,
                  py: 0.5,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  justifyContent: "flex-start",
                  gap: 0.25,
                  cursor: interactive ? "pointer" : "default",
                  bgcolor: style.bg,
                  border: isSelected
                    ? `2px solid ${colorTokens.preschool.mint.main}`
                    : `1px solid ${style.border}`,
                  "&:hover": interactive ? { filter: "brightness(0.98)" } : undefined,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, color: style.dayColor, lineHeight: 1, px: 0.25 }}
                >
                  {cell.day}
                </Typography>
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.62rem",
                    lineHeight: 1.15,
                    color: style.labelColor,
                    px: 0.25,
                    wordBreak: "break-word",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={cell.kind === "holiday" ? cell.statusLabel : undefined}
                >
                  {cell.statusLabel}
                </Typography>
                {cell.shiftTimingLines.map((line, lineIndex) => (
                  <Typography
                    key={`${cell.iso}-timing-${lineIndex}`}
                    variant="caption"
                    align="center"
                    sx={{
                      fontSize: "0.58rem",
                      lineHeight: 1.2,
                      color: "#7c3aed",
                      fontWeight: 700,
                      px: 0.25,
                      wordBreak: "break-word",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                    title={line}
                  >
                    {line}
                  </Typography>
                ))}
                {cell.extraTeacherNames.length > 0 ? (
                  <Typography
                    variant="caption"
                    align="center"
                    component="span"
                    sx={{
                      fontSize: "0.58rem",
                      lineHeight: 1.2,
                      fontWeight: 600,
                      px: 0.25,
                      wordBreak: "break-word",
                      display: "block",
                    }}
                    title={cell.extraTeacherNames.join(", ")}
                  >
                    <Box component="span" sx={{ color: "#15803d", fontWeight: 700 }}>
                      Working: {cell.extraTeacherNames.join(", ")}
                    </Box>
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </Box>

        <Stack
          direction="row"
          flexWrap="wrap"
          gap={2}
          sx={{ pt: 0.5, borderTop: `1px solid ${colorTokens.border.subtle}` }}
        >
          {LEGEND.map((item) => (
            <Stack key={item.kind} direction="row" spacing={0.75} alignItems="center">
              <LegendSwatch kind={item.kind} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color:
                    item.kind === "weekend" || item.kind === "holiday"
                      ? WEEKEND_RED
                      : colorTokens.text.secondary,
                }}
              >
                {item.title}
              </Typography>
            </Stack>
          ))}
          <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.text.secondary }}>
            “Time: …” = custom timing on that date
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.text.secondary }}>
            “Working: …” = teachers who can mark on that holiday or weekend
          </Typography>
        </Stack>
      </Stack>
    </AppCard>
  );
}
