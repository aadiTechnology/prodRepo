import { useEffect, useState } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  Typography,
  alpha,
} from "@mui/material";
import { colorTokens } from "../../../../tokens/colors";
import teacherService from "../../../../api/services/teacherService";
import ConfirmDialog from "../../../../components/semantic/ConfirmDialog";
import type { ExtraWorkingTeacher, PublicHoliday, WorkingDayKey, DateShiftOverride } from "../attendanceConfiguration.types";
import type { AttendanceConfigurationController } from "../../../../hooks/useAttendanceConfigurationController";
import WorkingDaysConfigCalendar from "./WorkingDaysConfigCalendar";
import WorkingDaysCalendarDayDialog from "./WorkingDaysCalendarDayDialog";
import WorkingDaysSaturdayMonthPanel from "./WorkingDaysSaturdayMonthPanel";
import ConfigSectionCard from "./ConfigSectionCard";
import { replaceDateShiftOverridesForDay } from "../dateShiftTiming.utils";

const workingDaysHelperHighlightSx = {
  display: "block",
  px: 1.25,
  py: 1,
  borderRadius: 1.5,
  bgcolor: alpha(colorTokens.primary.main, 0.08),
  borderLeft: `3px solid ${colorTokens.primary.main}`,
  color: colorTokens.text.primary,
  fontSize: "0.8125rem",
  lineHeight: 1.55,
  fontWeight: 500,
};

const WORKING_DAY_OPTIONS: { key: WorkingDayKey; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

type Props = {
  controller: AttendanceConfigurationController;
};

export default function WorkingDaysSection({ controller }: Props) {
  const {
    state,
    setWorkingDay,
    saveExtraWorkingTeachers,
    saveDateShiftOverrides,
    saveNonWorkingDates,
    saveHoliday,
    removeHoliday,
    setEditTarget,
    setActiveSection,
    saving,
  } = controller;
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [previewMonth, setPreviewMonth] = useState(() => new Date());
  const [selectedPreviewDate, setSelectedPreviewDate] = useState<string | null>(null);
  const [pendingHolidayDelete, setPendingHolidayDelete] = useState<PublicHoliday | null>(null);

  useEffect(() => {
    let cancelled = false;
    void teacherService.list({ status: "active", limit: 500, skip: 0 }).then((res) => {
      if (cancelled) return;
      setTeachers((res.items || []).map((t) => ({ id: String(t.id), name: t.full_name })));
    }).catch(() => {
      if (!cancelled) setTeachers([]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name || `Teacher ${id}`;

  const addExtraWorkingFromCalendar = (teacherId: string, day: WorkingDayKey, date?: string) => {
    const exists = state.extraWorkingTeachers.some(
      (item) =>
        item.teacherId === teacherId &&
        item.day === day &&
        (item.date ?? "") === (date ?? "")
    );
    if (exists) return;
    saveExtraWorkingTeachers([
      ...state.extraWorkingTeachers,
      date ? { teacherId, day, date } : { teacherId, day },
    ]);
  };

  const removeExtraWorkingFromCalendar = (teacherId: string, day: WorkingDayKey, date?: string) => {
    saveExtraWorkingTeachers(
      state.extraWorkingTeachers.filter(
        (item) =>
          !(
            item.teacherId === teacherId &&
            item.day === day &&
            (item.date ?? "") === (date ?? "")
          )
      )
    );
  };

  const updateExtraWorkingFromCalendar = (from: ExtraWorkingTeacher, to: ExtraWorkingTeacher) => {
    const rest = state.extraWorkingTeachers.filter(
      (item) =>
        !(
          item.teacherId === from.teacherId &&
          item.day === from.day &&
          (item.date ?? "") === (from.date ?? "")
        )
    );
    const duplicate = rest.some(
      (item) =>
        item.teacherId === to.teacherId &&
        item.day === to.day &&
        (item.date ?? "") === (to.date ?? "")
    );
    if (duplicate) return;
    saveExtraWorkingTeachers([...rest, to]);
  };

  const handleAddHolidayFromCalendar = (name: string, date: string) => {
    saveHoliday({ name, date, description: "", status: "active" });
  };

  const replaceDateShiftOverridesForCalendarDay = (
    date: string,
    entries: DateShiftOverride[]
  ) => {
    saveDateShiftOverrides(
      replaceDateShiftOverridesForDay(state.dateShiftOverrides, date, entries)
    );
  };

  return (
    <ConfigSectionCard
      id="section-working-days"
      title="Working Days"
      data-testid="section-working-days"
    >
      <Box sx={{ minWidth: 0, width: "100%" }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          Default week
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            columnGap: { xs: 1, sm: 2 },
            rowGap: 0.75,
            overflow: "visible",
          }}
        >
          {WORKING_DAY_OPTIONS.map(({ key, label }) => (
            <FormControlLabel
              key={key}
              sx={{
                m: 0,
                flexShrink: 0,
                whiteSpace: "nowrap",
                "& .MuiFormControlLabel-label": { fontSize: "0.875rem" },
              }}
              control={
                <Checkbox
                  size="small"
                  checked={state.workingDays[key]}
                  onChange={(e) => setWorkingDay(key, e.target.checked)}
                  inputProps={{ "data-testid": `checkbox-working-day-${key}` } as object}
                />
              }
              label={label}
            />
          ))}
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography component="p" sx={{ ...workingDaysHelperHighlightSx, mb: 1.5 }}>
            Click a date: mark holiday, change shift timing for that day, add or remove extra working teachers
            (shown on the cell).
          </Typography>
          <WorkingDaysConfigCalendar
            month={previewMonth}
            onMonthChange={setPreviewMonth}
            workingDays={state.workingDays}
            holidays={state.holidays}
            nonWorkingDates={state.nonWorkingDates}
            extraWorkingTeachers={state.extraWorkingTeachers}
            dateShiftOverrides={state.dateShiftOverrides}
            teacherName={teacherName}
            selectedDate={selectedPreviewDate ?? undefined}
            onDateSelect={setSelectedPreviewDate}
          />
          <WorkingDaysSaturdayMonthPanel
            month={previewMonth}
            nonWorkingDates={state.nonWorkingDates}
            saturdayIsWorkingDay={state.workingDays.saturday}
            saving={saving}
            onSetNonWorkingDates={saveNonWorkingDates}
          />
          <WorkingDaysCalendarDayDialog
            open={selectedPreviewDate != null}
            iso={selectedPreviewDate ?? ""}
            workingDays={state.workingDays}
            holidays={state.holidays}
            nonWorkingDates={state.nonWorkingDates}
            extraWorkingTeachers={state.extraWorkingTeachers}
            officeTiming={state.officeTiming}
            dateShiftOverrides={state.dateShiftOverrides}
            teachers={teachers}
            onClose={() => setSelectedPreviewDate(null)}
            onReplaceDateShiftOverridesForDay={replaceDateShiftOverridesForCalendarDay}
            onAddHoliday={handleAddHolidayFromCalendar}
            onRemoveHoliday={(holiday: PublicHoliday) => setPendingHolidayDelete(holiday)}
            onEditHoliday={(holiday: PublicHoliday) => {
              setSelectedPreviewDate(null);
              setEditTarget({ type: "holiday", item: holiday });
              setActiveSection("public-holidays");
            }}
            onAddExtraWorkingTeacher={addExtraWorkingFromCalendar}
            onRemoveExtraWorkingTeacher={removeExtraWorkingFromCalendar}
            onUpdateExtraWorkingTeacher={updateExtraWorkingFromCalendar}
          />
        </Box>
      </Box>

      <ConfirmDialog
        open={pendingHolidayDelete != null}
        onClose={() => setPendingHolidayDelete(null)}
        onConfirm={() => {
          if (pendingHolidayDelete) removeHoliday(pendingHolidayDelete);
          setPendingHolidayDelete(null);
        }}
        title="Confirm Delete"
        message={
          pendingHolidayDelete
            ? `Remove holiday "${pendingHolidayDelete.name}" on ${pendingHolidayDelete.date}?`
            : ""
        }
        confirmLabel="Delete"
        data-testid="dialog-calendar-delete-holiday"
      />
    </ConfigSectionCard>
  );
}
