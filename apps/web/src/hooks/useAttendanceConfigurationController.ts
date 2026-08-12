import { useCallback, useEffect, useMemo, useState } from "react";
import { useSnackbar } from "notistack";

import attendanceConfigurationService, {
  getAttendanceConfigErrorMessage,
  toCheckInRulesPayload,
  toGraceTimePayload,
  toOfficeTimingPayload,
} from "../api/services/attendanceConfigurationService";
import { academicYearService } from "../api/services/academicYearService";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import type {
  AcademicYearOption,
  AttendanceConfigSectionId,
  AttendanceConfigurationState,
  GeneralConfiguration,
  GraceTimeConfig,
  HolidayFormValues,
  OfficeTiming,
  PublicHoliday,
  Shift,
  ShiftFormValues,
  StatusFormValues,
  WorkingDayKey,
  WorkingDaysConfig,
  CheckInRules,
  AttendanceStatusItem,
} from "../pages/Attendance/configuration/attendanceConfiguration.types";

function emptyConfigurationState(academicYearId = ""): AttendanceConfigurationState {
  return {
    general: {
      academicYearId,
      configurationScope: "entire-school",
      allowEditingAfterMarked: true,
      applyChangesTo: "future-only",
      attendanceMarkedBy: { teacher: true, schoolAdmin: true },
    },
    workingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    holidays: [],
    shifts: [],
    officeTiming: {
      startTime: "09:00",
      endTime: "17:00",
      minimumWorkingHours: 6,
    },
    graceTime: {
      enabled: true,
      graceMinutes: 15,
      statusAfterGrace: "Late",
    },
    statuses: [],
    checkInRules: {
      checkInMandatory: true,
      checkOutMandatory: true,
      allowAttendanceWithoutCheckOut: false,
      allowMultipleCheckIn: false,
      allowNextDayCheckOut: false,
      autoCalculateWorkingHours: true,
    },
    notifications: [],
  };
}

function useListFilter(defaultRowsPerPage = DEFAULT_LIST_ROWS_PER_PAGE) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  return {
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(0);
    },
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage: (value: number) => {
      setRowsPerPage(value);
      setPage(0);
    },
  };
}

function paginate<T>(items: T[], page: number, rowsPerPage: number): T[] {
  const start = page * rowsPerPage;
  return items.slice(start, start + rowsPerPage);
}

export type DeleteTarget =
  | { type: "holiday"; item: PublicHoliday }
  | { type: "shift"; item: Shift }
  | { type: "status"; item: AttendanceStatusItem }
  | null;

export type EditTarget =
  | { type: "holiday"; item: PublicHoliday | null }
  | { type: "shift"; item: Shift | null }
  | { type: "status"; item: AttendanceStatusItem | null }
  | null;

export function useAttendanceConfigurationController() {
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState<AttendanceConfigurationState>(emptyConfigurationState);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AttendanceConfigSectionId>("general");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const holidayFilters = useListFilter();
  const shiftFilters = useListFilter();
  const statusFilters = useListFilter();

  const academicYearIdNum = useMemo(() => {
    const raw = state.general.academicYearId;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [state.general.academicYearId]);

  const showSuccess = useCallback(
    (message: string) => {
      enqueueSnackbar(message, { variant: "success" });
    },
    [enqueueSnackbar]
  );

  const showError = useCallback(
    (error: unknown, fallback: string) => {
      enqueueSnackbar(getAttendanceConfigErrorMessage(error, fallback), { variant: "error" });
    },
    [enqueueSnackbar]
  );

  const applyState = useCallback((next: AttendanceConfigurationState) => {
    setState(next);
    setLoadError(null);
  }, []);

  const loadConfiguration = useCallback(
    async (academicYearId: number) => {
      setLoading(true);
      setLoadError(null);
      try {
        const next = await attendanceConfigurationService.get(academicYearId);
        applyState(next);
      } catch (error) {
        const message = getAttendanceConfigErrorMessage(
          error,
          "Failed to load attendance configuration."
        );
        setLoadError(message);
        setState(emptyConfigurationState(String(academicYearId)));
        enqueueSnackbar(message, { variant: "error" });
      } finally {
        setLoading(false);
      }
    },
    [applyState, enqueueSnackbar]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setLoadError(null);
      try {
        const years = await academicYearService.listActive();
        if (cancelled) return;
        const options: AcademicYearOption[] = years.map((y) => ({
          id: String(y.id),
          label: y.name,
        }));
        setAcademicYears(options);

        const defaultId =
          resolveCurrentAcademicYearId(years) || (options[0]?.id ?? "");
        if (!defaultId) {
          setLoadError("No active academic year found.");
          setState(emptyConfigurationState());
          setLoading(false);
          return;
        }

        const next = await attendanceConfigurationService.get(Number(defaultId));
        if (cancelled) return;
        applyState(next);
      } catch (error) {
        if (cancelled) return;
        const message = getAttendanceConfigErrorMessage(
          error,
          "Failed to load attendance configuration."
        );
        setLoadError(message);
        enqueueSnackbar(message, { variant: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyState, enqueueSnackbar]);

  const runSave = useCallback(
    async (
      action: () => Promise<AttendanceConfigurationState>,
      successMessage: string,
      errorFallback: string
    ): Promise<boolean> => {
      if (academicYearIdNum == null) {
        enqueueSnackbar("Select an academic year first.", { variant: "warning" });
        return false;
      }
      setSaving(true);
      try {
        const next = await action();
        applyState(next);
        showSuccess(successMessage);
        return true;
      } catch (error) {
        showError(error, errorFallback);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [academicYearIdNum, applyState, enqueueSnackbar, showError, showSuccess]
  );

  const setAcademicYear = useCallback(
    (academicYearId: string) => {
      setState((prev) => ({
        ...prev,
        general: { ...prev.general, academicYearId },
      }));
      const id = Number(academicYearId);
      if (Number.isFinite(id) && id > 0) {
        void loadConfiguration(id);
      }
    },
    [loadConfiguration]
  );

  const setAllowEditingAfterMarked = useCallback(
    (allowEditingAfterMarked: boolean) => {
      if (academicYearIdNum == null) return;
      void runSave(
        () =>
          attendanceConfigurationService.updateSettings(academicYearIdNum, {
            allow_editing_after_marked: allowEditingAfterMarked,
          }),
        "Configuration updated successfully.",
        "Failed to update configuration."
      );
    },
    [academicYearIdNum, runSave]
  );

  const setAttendanceMarkedBy = useCallback(
    (attendanceMarkedBy: GeneralConfiguration["attendanceMarkedBy"]) => {
      if (academicYearIdNum == null) return;
      void runSave(
        () =>
          attendanceConfigurationService.updateSettings(academicYearIdNum, {
            attendance_marked_by: {
              teacher: attendanceMarkedBy.teacher,
              school_admin: attendanceMarkedBy.schoolAdmin,
            },
          }),
        "Configuration updated successfully.",
        "Failed to update configuration."
      );
    },
    [academicYearIdNum, runSave]
  );

  const setWorkingDay = useCallback(
    (day: WorkingDayKey, enabled: boolean) => {
      if (academicYearIdNum == null) return;
      const workingDays = { ...state.workingDays, [day]: enabled };
      void runSave(
        () =>
          attendanceConfigurationService.updateSettings(academicYearIdNum, {
            working_days: workingDays,
          }),
        "Working days updated.",
        "Failed to update working days."
      );
    },
    [academicYearIdNum, runSave, state.workingDays]
  );

  const setWorkingDays = useCallback(
    (workingDays: WorkingDaysConfig) => {
      if (academicYearIdNum == null) return;
      void runSave(
        () =>
          attendanceConfigurationService.updateSettings(academicYearIdNum, {
            working_days: workingDays,
          }),
        "Working days updated.",
        "Failed to update working days."
      );
    },
    [academicYearIdNum, runSave]
  );

  const setOfficeTiming = useCallback(
    (officeTiming: OfficeTiming) => {
      if (academicYearIdNum == null) return;
      void runSave(
        () =>
          attendanceConfigurationService.updateSettings(academicYearIdNum, {
            office_timing: toOfficeTimingPayload(officeTiming),
          }),
        "Office timing saved.",
        "Failed to save office timing."
      );
    },
    [academicYearIdNum, runSave]
  );

  const setGraceTime = useCallback(
    (graceTime: GraceTimeConfig) => {
      if (academicYearIdNum == null) return;
      void runSave(
        () =>
          attendanceConfigurationService.updateSettings(academicYearIdNum, {
            grace_time: toGraceTimePayload(graceTime),
          }),
        "Grace time settings saved.",
        "Failed to save grace time."
      );
    },
    [academicYearIdNum, runSave]
  );

  const setCheckInRules = useCallback(
    (checkInRules: CheckInRules) => {
      if (academicYearIdNum == null) return;
      void runSave(
        () =>
          attendanceConfigurationService.updateSettings(academicYearIdNum, {
            check_in_rules: toCheckInRulesPayload(checkInRules),
          }),
        "Check-in rules updated.",
        "Failed to update check-in rules."
      );
    },
    [academicYearIdNum, runSave]
  );

  const toggleNotification = useCallback(
    (id: string, enabled: boolean) => {
      if (academicYearIdNum == null) return;
      void runSave(
        () =>
          attendanceConfigurationService.toggleNotification(
            academicYearIdNum,
            Number(id),
            enabled
          ),
        "Notification settings updated.",
        "Failed to update notification."
      );
    },
    [academicYearIdNum, runSave]
  );

  const filteredHolidays = useMemo(() => {
    const q = holidayFilters.search.trim().toLowerCase();
    if (!q) return state.holidays;
    return state.holidays.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.date.includes(q)
    );
  }, [holidayFilters.search, state.holidays]);

  const filteredShifts = useMemo(() => {
    const q = shiftFilters.search.trim().toLowerCase();
    if (!q) return state.shifts;
    return state.shifts.filter((s) => s.name.toLowerCase().includes(q));
  }, [shiftFilters.search, state.shifts]);

  const filteredStatuses = useMemo(() => {
    const q = statusFilters.search.trim().toLowerCase();
    if (!q) return state.statuses;
    return state.statuses.filter((s) => s.name.toLowerCase().includes(q));
  }, [statusFilters.search, state.statuses]);

  const paginatedHolidays = useMemo(
    () => paginate(filteredHolidays, holidayFilters.page, holidayFilters.rowsPerPage),
    [filteredHolidays, holidayFilters.page, holidayFilters.rowsPerPage]
  );

  const paginatedShifts = useMemo(
    () => paginate(filteredShifts, shiftFilters.page, shiftFilters.rowsPerPage),
    [filteredShifts, shiftFilters.page, shiftFilters.rowsPerPage]
  );

  const paginatedStatuses = useMemo(
    () => paginate(filteredStatuses, statusFilters.page, statusFilters.rowsPerPage),
    [filteredStatuses, statusFilters.page, statusFilters.rowsPerPage]
  );

  const saveHoliday = useCallback(
    (values: HolidayFormValues) => {
      if (academicYearIdNum == null) return;
      const editing = editTarget?.type === "holiday" ? editTarget.item : null;
      void (async () => {
        const ok = await runSave(
          () =>
            editing
              ? attendanceConfigurationService.updateHoliday(
                  academicYearIdNum,
                  Number(editing.id),
                  values
                )
              : attendanceConfigurationService.createHoliday(academicYearIdNum, values),
          editing ? "Holiday updated successfully." : "Holiday added successfully.",
          editing ? "Failed to update holiday." : "Failed to add holiday."
        );
        if (ok) setEditTarget(null);
      })();
    },
    [academicYearIdNum, editTarget, runSave]
  );

  const saveShift = useCallback(
    (values: ShiftFormValues) => {
      if (academicYearIdNum == null) return;
      const editing = editTarget?.type === "shift" ? editTarget.item : null;
      void (async () => {
        const ok = await runSave(
          () =>
            editing
              ? attendanceConfigurationService.updateShift(
                  academicYearIdNum,
                  Number(editing.id),
                  values
                )
              : attendanceConfigurationService.createShift(academicYearIdNum, values),
          editing ? "Shift updated successfully." : "Shift added successfully.",
          editing ? "Failed to update shift." : "Failed to add shift."
        );
        if (ok) setEditTarget(null);
      })();
    },
    [academicYearIdNum, editTarget, runSave]
  );

  const saveStatus = useCallback(
    (values: StatusFormValues) => {
      if (academicYearIdNum == null) return;
      const editing = editTarget?.type === "status" ? editTarget.item : null;
      void (async () => {
        const ok = await runSave(
          () =>
            editing
              ? attendanceConfigurationService.updateStatus(
                  academicYearIdNum,
                  Number(editing.id),
                  values
                )
              : attendanceConfigurationService.createStatus(academicYearIdNum, values),
          editing ? "Status updated successfully." : "Status added successfully.",
          editing ? "Failed to update status." : "Failed to add status."
        );
        if (ok) setEditTarget(null);
      })();
    },
    [academicYearIdNum, editTarget, runSave]
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget || academicYearIdNum == null) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    if (target.type === "holiday") {
      void runSave(
        () =>
          attendanceConfigurationService.deleteHoliday(
            academicYearIdNum,
            Number(target.item.id)
          ),
        "Holiday deleted.",
        "Failed to delete holiday."
      );
      return;
    }
    if (target.type === "shift") {
      void runSave(
        () =>
          attendanceConfigurationService.deleteShift(
            academicYearIdNum,
            Number(target.item.id)
          ),
        "Shift deleted.",
        "Failed to delete shift."
      );
      return;
    }
    void runSave(
      () =>
        attendanceConfigurationService.deleteStatus(
          academicYearIdNum,
          Number(target.item.id)
        ),
      "Status deleted.",
      "Failed to delete status."
    );
  }, [academicYearIdNum, deleteTarget, runSave]);

  return {
    state,
    academicYears,
    loading,
    saving,
    loadError,
    activeSection,
    setActiveSection,
    deleteTarget,
    setDeleteTarget,
    editTarget,
    setEditTarget,
    confirmDelete,
    holidayFilters,
    shiftFilters,
    statusFilters,
    filteredHolidays,
    filteredShifts,
    filteredStatuses,
    paginatedHolidays,
    paginatedShifts,
    paginatedStatuses,
    setAcademicYear,
    setAllowEditingAfterMarked,
    setAttendanceMarkedBy,
    setWorkingDay,
    setWorkingDays,
    setOfficeTiming,
    setGraceTime,
    setCheckInRules,
    toggleNotification,
    saveHoliday,
    saveShift,
    saveStatus,
    reload: () => {
      if (academicYearIdNum != null) void loadConfiguration(academicYearIdNum);
    },
  };
}

export type AttendanceConfigurationController = ReturnType<
  typeof useAttendanceConfigurationController
>;
