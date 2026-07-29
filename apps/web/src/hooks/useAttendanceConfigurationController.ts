import { useCallback, useMemo, useState } from "react";
import { useSnackbar } from "notistack";

import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import {
  createInitialAttendanceConfiguration,
  MOCK_ACADEMIC_YEARS,
} from "../pages/Attendance/configuration/attendanceConfiguration.mock";
import type {
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

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export type ListFilterState = {
  search: string;
  page: number;
  rowsPerPage: number;
};

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
  const [state, setState] = useState<AttendanceConfigurationState>(createInitialAttendanceConfiguration);
  const [activeSection, setActiveSection] = useState<AttendanceConfigSectionId>("general");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const holidayFilters = useListFilter();
  const shiftFilters = useListFilter();
  const statusFilters = useListFilter();

  const showSuccess = useCallback(
    (message: string) => {
      enqueueSnackbar(message, { variant: "success" });
    },
    [enqueueSnackbar]
  );

  const updateGeneral = useCallback(
    (patch: Partial<GeneralConfiguration>) => {
      setState((prev) => ({
        ...prev,
        general: { ...prev.general, ...patch },
      }));
      showSuccess("Configuration updated successfully.");
    },
    [showSuccess]
  );

  const setAcademicYear = useCallback(
    (academicYearId: string) => {
      updateGeneral({ academicYearId });
    },
    [updateGeneral]
  );

  const setAllowEditingAfterMarked = useCallback(
    (allowEditingAfterMarked: boolean) => {
      updateGeneral({ allowEditingAfterMarked });
    },
    [updateGeneral]
  );

  const setAttendanceMarkedBy = useCallback(
    (attendanceMarkedBy: GeneralConfiguration["attendanceMarkedBy"]) => {
      updateGeneral({ attendanceMarkedBy });
    },
    [updateGeneral]
  );

  const setWorkingDay = useCallback(
    (day: WorkingDayKey, enabled: boolean) => {
      setState((prev) => ({
        ...prev,
        workingDays: { ...prev.workingDays, [day]: enabled },
      }));
      showSuccess("Working days updated.");
    },
    [showSuccess]
  );

  const setWorkingDays = useCallback(
    (workingDays: WorkingDaysConfig) => {
      setState((prev) => ({ ...prev, workingDays }));
      showSuccess("Working days updated.");
    },
    [showSuccess]
  );

  const setOfficeTiming = useCallback(
    (officeTiming: OfficeTiming) => {
      setState((prev) => ({ ...prev, officeTiming }));
      showSuccess("Office timing saved.");
    },
    [showSuccess]
  );

  const setGraceTime = useCallback(
    (graceTime: GraceTimeConfig) => {
      setState((prev) => ({ ...prev, graceTime }));
      showSuccess("Grace time settings saved.");
    },
    [showSuccess]
  );

  const setCheckInRules = useCallback(
    (checkInRules: CheckInRules) => {
      setState((prev) => ({ ...prev, checkInRules }));
      showSuccess("Check-in rules updated.");
    },
    [showSuccess]
  );

  const toggleNotification = useCallback(
    (id: string, enabled: boolean) => {
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, enabled } : n)),
      }));
      showSuccess("Notification settings updated.");
    },
    [showSuccess]
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
      if (editTarget?.type === "holiday" && editTarget.item) {
        const existing = editTarget.item;
        setState((prev) => ({
          ...prev,
          holidays: prev.holidays.map((h) =>
            h.id === existing.id ? { ...h, ...values } : h
          ),
        }));
        showSuccess("Holiday updated successfully.");
      } else {
        const newHoliday: PublicHoliday = { id: createId("hol"), ...values };
        setState((prev) => ({ ...prev, holidays: [newHoliday, ...prev.holidays] }));
        showSuccess("Holiday added successfully.");
      }
      setEditTarget(null);
    },
    [editTarget, showSuccess]
  );

  const saveShift = useCallback(
    (values: ShiftFormValues) => {
      if (editTarget?.type === "shift" && editTarget.item) {
        const existing = editTarget.item;
        setState((prev) => ({
          ...prev,
          shifts: prev.shifts.map((s) =>
            s.id === existing.id ? { ...s, ...values } : s
          ),
        }));
        showSuccess("Shift updated successfully.");
      } else {
        const newShift: Shift = { id: createId("shift"), ...values };
        setState((prev) => ({ ...prev, shifts: [newShift, ...prev.shifts] }));
        showSuccess("Shift added successfully.");
      }
      setEditTarget(null);
    },
    [editTarget, showSuccess]
  );

  const saveStatus = useCallback(
    (values: StatusFormValues) => {
      if (editTarget?.type === "status" && editTarget.item) {
        const existing = editTarget.item;
        setState((prev) => ({
          ...prev,
          statuses: prev.statuses.map((s) =>
            s.id === existing.id ? { ...s, ...values } : s
          ),
        }));
        showSuccess("Status updated successfully.");
      } else {
        const newStatus: AttendanceStatusItem = { id: createId("st"), ...values };
        setState((prev) => ({ ...prev, statuses: [newStatus, ...prev.statuses] }));
        showSuccess("Status added successfully.");
      }
      setEditTarget(null);
    },
    [editTarget, showSuccess]
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "holiday") {
      const { item } = deleteTarget;
      setState((prev) => ({
        ...prev,
        holidays: prev.holidays.filter((h) => h.id !== item.id),
      }));
      showSuccess("Holiday deleted.");
    } else if (deleteTarget.type === "shift") {
      const { item } = deleteTarget;
      setState((prev) => ({
        ...prev,
        shifts: prev.shifts.filter((s) => s.id !== item.id),
      }));
      showSuccess("Shift deleted.");
    } else if (deleteTarget.type === "status") {
      const { item } = deleteTarget;
      setState((prev) => ({
        ...prev,
        statuses: prev.statuses.filter((s) => s.id !== item.id),
      }));
      showSuccess("Status deleted.");
    }

    setDeleteTarget(null);
  }, [deleteTarget, showSuccess]);

  return {
    state,
    academicYears: MOCK_ACADEMIC_YEARS,
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
  };
}

export type AttendanceConfigurationController = ReturnType<
  typeof useAttendanceConfigurationController
>;
