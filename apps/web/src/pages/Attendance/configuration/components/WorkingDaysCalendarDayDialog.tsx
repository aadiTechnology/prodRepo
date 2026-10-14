import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";

import { TableRowActions } from "../../../../components/reusable";
import { FormHeaderIconAction } from "../../../../components/primitives";
import { CancelButton } from "../../../../components/semantic";
import { colorTokens } from "../../../../tokens/colors";
import type {
  DateShiftOverride,
  ExtraWorkingTeacher,
  OfficeTiming,
  PublicHoliday,
  WorkingDayKey,
} from "../attendanceConfiguration.types";
import {
  buildDateShiftEntriesForSave,
  findDateShiftOverrideForScope,
  isAllTeachersDateShift,
  listDateShiftOverridesForDay,
} from "../dateShiftTiming.utils";
import {
  findActiveHoliday,
  formatTimingRange,
  isScheduledNonWorkingDate,
  isoToWorkingDayKey,
} from "../workingDaysCalendar.utils";

const DAY_LABEL: Record<WorkingDayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function entryKey(entry: ExtraWorkingTeacher): string {
  return `${entry.teacherId}:${entry.day}:${entry.date ?? "weekly"}`;
}

function formatScopeLabel(entry: ExtraWorkingTeacher, weekday: WorkingDayKey): string {
  if (entry.date) {
    return `Only ${new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  return `Every ${DAY_LABEL[weekday]}`;
}

const toggleGroupSx = {
  width: "100%",
  display: "flex",
  "& .MuiToggleButtonGroup-grouped": {
    flex: 1,
    border: 1,
    borderColor: "divider",
  },
  "& .MuiToggleButton-root": {
    flex: 1,
    py: 1,
    textTransform: "none" as const,
    lineHeight: 1.25,
    whiteSpace: "normal" as const,
  },
};

const toggleGroupSelectedSx = {
  ...toggleGroupSx,
  "& .MuiToggleButton-root.Mui-selected": {
    bgcolor: alpha(colorTokens.preschool.mint.main, 0.2),
    color: "#15803d",
    fontWeight: 700,
    "&:hover": {
      bgcolor: alpha(colorTokens.preschool.mint.main, 0.28),
    },
  },
};

const helperCaptionSx = { display: "block" as const };

function toPickerValue(timeValue: string): Dayjs | null {
  if (!timeValue) return null;
  const [hourRaw, minuteRaw] = timeValue.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return dayjs().hour(hour).minute(minute).second(0).millisecond(0);
}

function fromPickerValue(next: Dayjs | null): string {
  if (!next) return "";
  return next.format("HH:mm");
}

const sectionDividerSx = { my: 2, borderColor: colorTokens.border.subtle };

const TIMING_SCOPE_ALL = "__all_teachers__";

type Props = {
  open: boolean;
  iso: string;
  workingDays: Record<WorkingDayKey, boolean>;
  holidays: PublicHoliday[];
  nonWorkingDates: string[];
  extraWorkingTeachers: ExtraWorkingTeacher[];
  officeTiming: OfficeTiming;
  dateShiftOverrides: DateShiftOverride[];
  teachers: { id: string; name: string }[];
  onClose: () => void;
  onReplaceDateShiftOverridesForDay: (date: string, entries: DateShiftOverride[]) => void;
  onAddHoliday: (name: string, date: string) => void;
  onRemoveHoliday: (holiday: PublicHoliday) => void;
  onEditHoliday: (holiday: PublicHoliday) => void;
  onAddExtraWorkingTeacher: (teacherId: string, day: WorkingDayKey, date?: string) => void;
  onRemoveExtraWorkingTeacher: (teacherId: string, day: WorkingDayKey, date?: string) => void;
  onUpdateExtraWorkingTeacher: (from: ExtraWorkingTeacher, to: ExtraWorkingTeacher) => void;
};

export default function WorkingDaysCalendarDayDialog({
  open,
  iso,
  workingDays,
  holidays,
  nonWorkingDates,
  extraWorkingTeachers,
  officeTiming,
  dateShiftOverrides,
  teachers,
  onClose,
  onReplaceDateShiftOverridesForDay,
  onAddHoliday,
  onRemoveHoliday,
  onEditHoliday,
  onAddExtraWorkingTeacher,
  onRemoveExtraWorkingTeacher,
  onUpdateExtraWorkingTeacher,
}: Props) {
  const weekday = iso ? isoToWorkingDayKey(iso) : "monday";
  const holiday = iso ? findActiveHoliday(iso, holidays) : undefined;
  const scheduledOff = iso ? isScheduledNonWorkingDate(iso, nonWorkingDates) : false;
  const isSchoolWorkingDay = workingDays[weekday] && !scheduledOff;
  const [holidayName, setHolidayName] = useState("");
  const [extraTeacherId, setExtraTeacherId] = useState("");
  const [addScope, setAddScope] = useState<"date" | "weekly" | null>(null);
  const [editingEntry, setEditingEntry] = useState<ExtraWorkingTeacher | null>(null);
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editScope, setEditScope] = useState<"date" | "weekly">("weekly");
  const [customStart, setCustomStart] = useState(officeTiming.startTime);
  const [customEnd, setCustomEnd] = useState(officeTiming.endTime);
  const [timingSelection, setTimingSelection] = useState<"default" | "custom">("default");
  const [timingScopeIds, setTimingScopeIds] = useState<string[]>([TIMING_SCOPE_ALL]);

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [teachers]);

  const syncCustomTimesFromScope = useCallback(
    (scopeIds: string[]) => {
      if (!iso) return;
      if (scopeIds.includes(TIMING_SCOPE_ALL)) {
        const allOverride = findDateShiftOverrideForScope(iso, dateShiftOverrides, null);
        if (allOverride) {
          setCustomStart(allOverride.startTime);
          setCustomEnd(allOverride.endTime);
        } else {
          setCustomStart(officeTiming.startTime);
          setCustomEnd(officeTiming.endTime);
        }
        return;
      }
      const firstWithOverride = scopeIds
        .map((id) => findDateShiftOverrideForScope(iso, dateShiftOverrides, id))
        .find(Boolean);
      if (firstWithOverride) {
        setCustomStart(firstWithOverride.startTime);
        setCustomEnd(firstWithOverride.endTime);
      } else {
        setCustomStart(officeTiming.startTime);
        setCustomEnd(officeTiming.endTime);
      }
    },
    [iso, dateShiftOverrides, officeTiming.startTime, officeTiming.endTime]
  );

  useEffect(() => {
    if (!open || !iso) return;
    setHolidayName("");
    setExtraTeacherId("");
    setAddScope(null);
    setEditingEntry(null);

    const dayOverrides = listDateShiftOverridesForDay(iso, dateShiftOverrides);
    const teacherOverrides = dayOverrides.filter((item) => !isAllTeachersDateShift(item));
    const allEntry = dayOverrides.find((item) => isAllTeachersDateShift(item));

    if (dayOverrides.length === 0) {
      setTimingSelection("default");
      setTimingScopeIds([TIMING_SCOPE_ALL]);
      setCustomStart(officeTiming.startTime);
      setCustomEnd(officeTiming.endTime);
      return;
    }

    setTimingSelection("custom");
    if (teacherOverrides.length > 0) {
      setTimingScopeIds(
        teacherOverrides.map((item) => String(item.teacherId)).filter(Boolean)
      );
      setCustomStart(teacherOverrides[0].startTime);
      setCustomEnd(teacherOverrides[0].endTime);
    } else if (allEntry) {
      setTimingScopeIds([TIMING_SCOPE_ALL]);
      setCustomStart(allEntry.startTime);
      setCustomEnd(allEntry.endTime);
    }
  }, [open, iso, officeTiming.startTime, officeTiming.endTime, dateShiftOverrides]);

  const handleTimingScopeChange = (event: SelectChangeEvent<string[]>) => {
    const raw = event.target.value;
    const next = typeof raw === "string" ? raw.split(",") : raw;
    const teachersOnly = next.filter((id) => id !== TIMING_SCOPE_ALL);

    if (teachersOnly.length > 0) {
      setTimingScopeIds(teachersOnly);
      syncCustomTimesFromScope(teachersOnly);
      return;
    }

    setTimingScopeIds([TIMING_SCOPE_ALL]);
    syncCustomTimesFromScope([TIMING_SCOPE_ALL]);
  };

  const formattedDate = useMemo(() => {
    if (!iso) return "";
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [iso]);

  const entriesForDate = useMemo(() => {
    return extraWorkingTeachers.filter((item) => {
      if (item.day !== weekday) return false;
      if (item.date) return item.date === iso;
      return true;
    });
  }, [extraWorkingTeachers, weekday, iso]);

  const isPlainWorkingDay =
    isSchoolWorkingDay && !holiday && !entriesForDate.some((e) => e.date === iso);

  const daySummary = holiday
    ? `Public holiday${holiday.name ? `: ${holiday.name}` : ""}.`
    : isSchoolWorkingDay
      ? "Working day for all teachers."
      : `Off day (${DAY_LABEL[weekday]}). School closed; working teachers may still mark.`;

  const daySummaryHighlight = useMemo(() => {
    if (holiday) {
      return {
        bgcolor: alpha("#0ea5e9", 0.14),
        border: `1px solid ${alpha("#0ea5e9", 0.4)}`,
        color: "#0369a1",
      };
    }
    if (isSchoolWorkingDay) {
      return {
        bgcolor: alpha(colorTokens.preschool.mint.main, 0.14),
        border: `1px solid ${alpha(colorTokens.preschool.mint.main, 0.4)}`,
        color: "#15803d",
      };
    }
    return {
      bgcolor: alpha(colorTokens.text.secondary, 0.1),
      border: `1px solid ${alpha(colorTokens.text.secondary, 0.25)}`,
      color: colorTokens.text.primary,
    };
  }, [holiday, isSchoolWorkingDay]);

  const hasWeekly = (teacherId: string) =>
    extraWorkingTeachers.some((item) => item.teacherId === teacherId && item.day === weekday && !item.date);

  const hasThisDay = (teacherId: string) =>
    extraWorkingTeachers.some(
      (item) => item.teacherId === teacherId && item.day === weekday && item.date === iso
    );

  const availableForWeekly = teachers.filter((t) => !hasWeekly(t.id));
  const availableForThisDay = teachers.filter((t) => !hasThisDay(t.id));

  const buildEntry = (teacherId: string, scope: "date" | "weekly"): ExtraWorkingTeacher => ({
    teacherId,
    day: weekday,
    ...(scope === "date" ? { date: iso } : {}),
  });

  const startEdit = (entry: ExtraWorkingTeacher) => {
    setEditingEntry(entry);
    setEditTeacherId(entry.teacherId);
    setEditScope(entry.date ? "date" : "weekly");
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEditTeacherId("");
    setEditScope("weekly");
  };

  const commitEdit = (from: ExtraWorkingTeacher, teacherId: string, scope: "date" | "weekly") => {
    if (!teacherId) return;
    const next = buildEntry(teacherId, scope);
    if (entryKey(from) === entryKey(next)) {
      cancelEdit();
      return;
    }
    onUpdateExtraWorkingTeacher(from, next);
    cancelEdit();
  };

  const addExtraWithScope = (scope: "date" | "weekly") => {
    if (!extraTeacherId) return;
    if (scope === "date") {
      if (!availableForThisDay.some((t) => t.id === extraTeacherId)) return;
      onAddExtraWorkingTeacher(extraTeacherId, weekday, iso);
    } else {
      if (!availableForWeekly.some((t) => t.id === extraTeacherId)) return;
      onAddExtraWorkingTeacher(extraTeacherId, weekday);
    }
    setAddScope(scope);
    setExtraTeacherId("");
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
      }}
      disableEscapeKeyDown
      fullWidth
      maxWidth="sm"
      data-testid="dialog-working-days-calendar-day"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: "white",
            lineHeight: 1.3,
            flex: 1,
            minWidth: 0,
            pr: 1,
          }}
        >
          {formattedDate}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: "white", bgcolor: "transparent", p: 0.3, flexShrink: 0 }}
        >
          <CancelIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>
      <DialogContent
        sx={{
          flex: 1,
          py: 2,
          px: 2.5,
          overflowY: "auto",
        }}
      >
        <Stack spacing={0}>
          <Box
            sx={{
              px: 1.25,
              py: 1,
              borderRadius: 1.5,
              fontSize: "0.875rem",
              fontWeight: 600,
              lineHeight: 1.45,
              ...daySummaryHighlight,
            }}
            data-testid="calendar-day-summary"
          >
            {daySummary}
          </Box>

          <Divider sx={sectionDividerSx} />

          <Stack spacing={2}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Timing for this date
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              fullWidth
              value={timingSelection}
              sx={{
                ...toggleGroupSx,
                "& .MuiToggleButton-root.Mui-selected": {
                  bgcolor: alpha(colorTokens.preschool.mint.main, 0.2),
                  color: "#15803d",
                  fontWeight: 700,
                  "&:hover": {
                    bgcolor: alpha(colorTokens.preschool.mint.main, 0.28),
                  },
                },
              }}
              onChange={(_, value: "default" | "custom" | null) => {
                if (!value) return;
                if (value === "default") {
                  setTimingSelection("default");
                  onReplaceDateShiftOverridesForDay(iso, []);
                  return;
                }
                setTimingSelection("custom");
                syncCustomTimesFromScope(timingScopeIds);
              }}
            >
              <ToggleButton value="default" data-testid="btn-calendar-timing-default">
                Default timing
              </ToggleButton>
              <ToggleButton value="custom" data-testid="btn-calendar-timing-custom">
                Custom timing
              </ToggleButton>
            </ToggleButtonGroup>

            {timingSelection === "default" ? (
              <Box
                sx={{
                  px: 1.25,
                  py: 1,
                  borderRadius: 1.5,
                  bgcolor: alpha(colorTokens.preschool.mint.main, 0.1),
                  border: `1px solid ${alpha(colorTokens.preschool.mint.main, 0.35)}`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#15803d" }}>
                  {formatTimingRange(officeTiming.startTime, officeTiming.endTime)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                  Default office timing for every teacher on this date.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                <FormControl fullWidth size="small" sx={{ mt: 0.25 }}>
                  <InputLabel id="label-calendar-timing-teacher">Applies to</InputLabel>
                  <Select
                    labelId="label-calendar-timing-teacher"
                    label="Applies to"
                    multiple
                    value={timingScopeIds}
                    onChange={handleTimingScopeChange}
                    renderValue={(selected) => {
                      const ids = selected as string[];
                      if (ids.includes(TIMING_SCOPE_ALL)) return "All";
                      return ids.map((id) => teacherNameById.get(id) ?? id).join(", ");
                    }}
                    inputProps={{ "data-testid": "select-calendar-timing-scope" } as object}
                    MenuProps={{
                      PaperProps: { sx: { maxHeight: 280 } },
                    }}
                  >
                    <MenuItem value={TIMING_SCOPE_ALL} data-testid="option-timing-all-teachers">
                      <Checkbox
                        size="small"
                        checked={timingScopeIds.includes(TIMING_SCOPE_ALL)}
                      />
                      <ListItemText primary="All" />
                    </MenuItem>
                    {teachers.map((t) => (
                      <MenuItem
                        key={t.id}
                        value={t.id}
                        data-testid={`option-timing-teacher-${t.id}`}
                      >
                        <Checkbox size="small" checked={timingScopeIds.includes(t.id)} />
                        <ListItemText primary={t.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: "divider",
                    bgcolor: "grey.50",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
                    {timingScopeIds.includes(TIMING_SCOPE_ALL)
                      ? `Set start and end for all teachers on ${iso}.`
                      : `Set the same start and end for ${timingScopeIds.length} selected teacher(s) on ${iso}.`}
                  </Typography>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: "100%" }}>
                        <TimePicker
                          label="Start time"
                          ampm
                          value={toPickerValue(customStart)}
                          onChange={(next) => setCustomStart(fromPickerValue(next))}
                          slotProps={{
                            textField: {
                              size: "small",
                              fullWidth: true,
                              sx: { bgcolor: "background.paper", flex: 1 },
                            },
                          }}
                        />
                        <TimePicker
                          label="End time"
                          ampm
                          value={toPickerValue(customEnd)}
                          onChange={(next) => setCustomEnd(fromPickerValue(next))}
                          slotProps={{
                            textField: {
                              size: "small",
                              fullWidth: true,
                              sx: { bgcolor: "background.paper", flex: 1 },
                            },
                          }}
                        />
                      </Stack>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{ alignSelf: "flex-start", minWidth: 120 }}
                        disabled={
                          !timingScopeIds.includes(TIMING_SCOPE_ALL) && timingScopeIds.length === 0
                        }
                        onClick={() => {
                          const entries = buildDateShiftEntriesForSave(
                            iso,
                            timingScopeIds,
                            customStart,
                            customEnd,
                            TIMING_SCOPE_ALL
                          );
                          onReplaceDateShiftOverridesForDay(iso, entries);
                        }}
                        data-testid="btn-calendar-save-custom-shift"
                      >
                        Save timing
                      </Button>
                    </Stack>
                  </LocalizationProvider>
                </Box>
              </Stack>
            )}
          </Stack>

          <Divider sx={sectionDividerSx} />

          {!holiday ? (
            <Stack spacing={1.25}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Mark this date as holiday
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={helperCaptionSx}>
                Adds a public holiday for this date only.
              </Typography>
              <TextField
                size="small"
                label="Holiday name"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder={`Day off — ${iso}`}
                inputProps={{ "data-testid": "input-calendar-day-holiday-name" } as object}
              />
              <Button
                variant="contained"
                size="small"
                sx={{ alignSelf: "flex-start" }}
                disabled={!iso}
                onClick={() =>
                  onAddHoliday(holidayName.trim() || `Day off — ${iso}`, iso)
                }
                data-testid="btn-calendar-add-holiday"
              >
                Add public holiday
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignItems: "center" }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onEditHoliday(holiday)}
                data-testid="btn-calendar-edit-holiday"
              >
                Edit in Public Holidays
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => onRemoveHoliday(holiday)}
                data-testid="btn-calendar-remove-holiday"
              >
                Remove holiday
              </Button>
            </Stack>
          )}

          <Divider sx={sectionDividerSx} />

          <Stack spacing={1.25}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Extra working teachers ({DAY_LABEL[weekday]})
            </Typography>
            {!isPlainWorkingDay ? (
              <Typography variant="caption" color="text.secondary" sx={helperCaptionSx}>
                Only this day applies to {iso} only. Every {DAY_LABEL[weekday]} applies to all{" "}
                {DAY_LABEL[weekday]}s that are weekly off or public holidays.
              </Typography>
            ) : null}

            {!editingEntry ? (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "grey.50",
                }}
              >
                <Stack spacing={1.25} sx={{ width: "100%" }}>
                  <FormControl size="small" fullWidth>
                  <InputLabel id="label-calendar-extra-teacher">Add teacher</InputLabel>
                  <Select
                    labelId="label-calendar-extra-teacher"
                    label="Add teacher"
                    value={extraTeacherId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setExtraTeacherId(id);
                      if (!id) setAddScope(null);
                    }}
                  >
                    {teachers.map((teacher) => (
                      <MenuItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  fullWidth
                  disabled={!extraTeacherId}
                  value={addScope}
                  sx={{
                    ...toggleGroupSelectedSx,
                    ...(extraTeacherId
                      ? {
                          p: 0.25,
                          borderRadius: 1,
                          border: `1px solid ${alpha(colorTokens.preschool.mint.main, 0.35)}`,
                        }
                      : {}),
                  }}
                  onChange={(_, value: "date" | "weekly" | null) => {
                    if (!value || !extraTeacherId) return;
                    addExtraWithScope(value);
                  }}
                >
                  <ToggleButton
                    value="date"
                    disabled={
                      !extraTeacherId || !availableForThisDay.some((t) => t.id === extraTeacherId)
                    }
                  >
                    Only this day
                  </ToggleButton>
                  <ToggleButton
                    value="weekly"
                    disabled={
                      !extraTeacherId || !availableForWeekly.some((t) => t.id === extraTeacherId)
                    }
                  >
                    Every {DAY_LABEL[weekday]}
                  </ToggleButton>
                </ToggleButtonGroup>
                {!extraTeacherId ? (
                  <Typography variant="caption" color="text.secondary" sx={helperCaptionSx}>
                    Select a teacher, then choose Only this day or Every {DAY_LABEL[weekday]} to save.
                  </Typography>
                ) : null}
                </Stack>
              </Box>
            ) : null}

            {entriesForDate.length > 0 ? (
              <Stack spacing={1} sx={{ pt: 0.25 }}>
                {entriesForDate.map((entry) => {
                  const name = teachers.find((t) => t.id === entry.teacherId)?.name || `Teacher ${entry.teacherId}`;
                  const isEditing = editingEntry && entryKey(editingEntry) === entryKey(entry);

                  if (isEditing && editingEntry) {
                    return (
                      <Box
                        key={entryKey(entry)}
                        sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider" }}
                      >
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
                            <FormControl size="small" fullWidth>
                              <InputLabel id="label-edit-extra-teacher">Teacher</InputLabel>
                              <Select
                                labelId="label-edit-extra-teacher"
                                label="Teacher"
                                value={editTeacherId}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  setEditTeacherId(id);
                                  commitEdit(editingEntry, id, editScope);
                                }}
                              >
                                {teachers.map((teacher) => (
                                  <MenuItem key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <ToggleButtonGroup
                              exclusive
                              size="small"
                              fullWidth
                              value={editScope}
                              sx={toggleGroupSelectedSx}
                              onChange={(_, value: "date" | "weekly" | null) => {
                                if (!value) return;
                                setEditScope(value);
                                commitEdit(editingEntry, editTeacherId, value);
                              }}
                            >
                              <ToggleButton value="date">Only this day</ToggleButton>
                              <ToggleButton value="weekly">Every {DAY_LABEL[weekday]}</ToggleButton>
                            </ToggleButtonGroup>
                          </Stack>
                          <FormHeaderIconAction
                            variant="cancel"
                            tooltipTitle="Cancel"
                            onClick={cancelEdit}
                            data-testid="btn-cancel-edit-extra-working"
                          />
                        </Stack>
                      </Box>
                    );
                  }

                  return (
                    <Stack
                      key={entryKey(entry)}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{
                        py: 1,
                        px: 1.25,
                        borderRadius: 1.5,
                        border: 1,
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        minHeight: 48,
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ flex: 1, minWidth: 0 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, lineHeight: 1.2, display: "flex", alignItems: "center" }}
                        >
                          {name}
                        </Typography>
                        <Chip
                          size="small"
                          label={formatScopeLabel(entry, weekday)}
                          color={entry.date ? "default" : "primary"}
                          variant={entry.date ? "outlined" : "filled"}
                          sx={{ height: 22, fontSize: "0.7rem", "& .MuiChip-label": { px: 1 } }}
                        />
                      </Stack>
                      <Box sx={{ flexShrink: 0 }}>
                        <TableRowActions
                          onEdit={() => startEdit(entry)}
                          onDelete={() =>
                            onRemoveExtraWorkingTeacher(entry.teacherId, weekday, entry.date)
                          }
                          editTestId={`btn-calendar-edit-extra-${entry.teacherId}`}
                          deleteTestId={`btn-calendar-remove-extra-${entry.teacherId}-${entry.date ?? "weekly"}`}
                        />
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            ) : entriesForDate.length === 0 && !editingEntry ? (
              <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
                No extra working teachers for this date yet.
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: 2.5,
          py: 1.5,
          gap: 1,
          flexShrink: 0,
          borderTop: `1px solid ${colorTokens.border.subtle}`,
          justifyContent: "flex-end",
        }}
      >
        <CancelButton onClick={onClose} data-testid="btn-calendar-day-close">
          Cancel
        </CancelButton>
      </DialogActions>
    </Dialog>
  );
}
