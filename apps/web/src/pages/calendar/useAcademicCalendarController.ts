import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";

import { academicYearService, type AcademicYear } from "../../api/services/academicYearService";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";
import { fetchAcademicCalendar } from "../../services/academicCalendarApi";
import {
  buildHolidayMap,
  buildMonthCells,
  EMPTY_ACADEMIC_YEARS,
  isAdminCalendarUser,
  isParentCalendarUser,
  parseISODateOnly,
  type CalendarCell,
} from "./academicCalendar.utils";

export function useAcademicCalendarController() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { hasPermission, roles } = useRBAC();

  const isParentUser = isParentCalendarUser(user?.role, roles);
  const isAdminUser = isAdminCalendarUser(user?.role, roles);

  const canManageHolidays =
    isAdminUser && !isParentUser && hasPermission("ACADEMIC_MGMT:create");

  const [year, setYear] = useState(() => dayjs().year());
  const [month, setMonth] = useState(() => dayjs().month() + 1);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const calendarErrorNotifiedRef = useRef<string | null>(null);

  const academicYearsQuery = useQuery({
    queryKey: ["academic-calendar", "academic-years"],
    queryFn: academicYearService.listActive,
    retry: 1,
  });

  const academicYears = academicYearsQuery.data ?? EMPTY_ACADEMIC_YEARS;

  useEffect(() => {
    if (academicYears.length === 0) return;
    if (academicYearId != null) {
      const ok = academicYears.some((y) => y.id === academicYearId);
      if (ok) return;
    }
    const preferred = academicYears.find((y) => y.is_active) ?? academicYears[0];
    if (preferred) {
      setAcademicYearId(preferred.id);
    }
  }, [academicYears, academicYearId]);

  const selectedAcademicYear = useMemo(
    () => academicYears.find((y) => y.id === academicYearId) ?? null,
    [academicYears, academicYearId]
  );

  const calendarQuery = useQuery({
    queryKey: ["academic-calendar", "grid", year, month, academicYearId],
    queryFn: () =>
      fetchAcademicCalendar({
        year,
        month,
        academic_year_id: academicYearId as number,
        page: 1,
        page_size: 100,
      }),
    enabled: academicYearId != null,
    retry: 1,
  });

  useEffect(() => {
    if (!calendarQuery.isError) {
      calendarErrorNotifiedRef.current = null;
      return;
    }
    const notifyKey = `${year}-${month}-${academicYearId}`;
    if (calendarErrorNotifiedRef.current === notifyKey) return;
    calendarErrorNotifiedRef.current = notifyKey;
    enqueueSnackbar("Failed to load calendar", { variant: "error" });
  }, [calendarQuery.isError, year, month, academicYearId, enqueueSnackbar]);

  const holidayByDate = useMemo(
    () => buildHolidayMap(calendarQuery.data?.data ?? []),
    [calendarQuery.data?.data]
  );

  const monthCells = useMemo(
    () => buildMonthCells(year, month, selectedAcademicYear),
    [year, month, selectedAcademicYear]
  );

  const cellsWithHolidays: CalendarCell[] = useMemo(
    () =>
      monthCells.map((c) => {
        if (c.kind !== "day") return c;
        const holiday = holidayByDate.get(c.iso);
        return {
          ...c,
          holiday,
          outsideAcademicYear: c.outsideAcademicYear || (holiday?.outside_academic_year ?? false),
        };
      }),
    [monthCells, holidayByDate]
  );

  const monthLabel = useMemo(
    () => dayjs().year(year).month(month - 1).format("MMMM YYYY"),
    [year, month]
  );

  const goPrevMonth = useCallback(() => {
    const d = dayjs().year(year).month(month - 1).subtract(1, "month");
    setYear(d.year());
    setMonth(d.month() + 1);
  }, [year, month]);

  const goNextMonth = useCallback(() => {
    const d = dayjs().year(year).month(month - 1).add(1, "month");
    setYear(d.year());
    setMonth(d.month() + 1);
  }, [year, month]);

  const academicStatus = calendarQuery.data?.academic_status ?? null;

  const monthOutsideAcademicYear = useMemo(() => {
    if (academicStatus === "CLOSED") return true;
    if (!selectedAcademicYear) return false;
    const monthStart = dayjs().year(year).month(month - 1).date(1);
    const monthEnd = monthStart.endOf("month");
    const ayStart = parseISODateOnly(selectedAcademicYear.start_date);
    const ayEnd = parseISODateOnly(selectedAcademicYear.end_date);
    return monthEnd.isBefore(ayStart, "day") || monthStart.isAfter(ayEnd, "day");
  }, [academicStatus, selectedAcademicYear, year, month]);

  const showCalendarSkeleton =
    academicYearId != null && calendarQuery.isLoading && !calendarQuery.data;
  const calendarLoadFailed = academicYearId != null && calendarQuery.isError && !calendarQuery.data;
  const noHolidays =
    !showCalendarSkeleton &&
    !calendarLoadFailed &&
    calendarQuery.isSuccess &&
    (calendarQuery.data?.total ?? 0) === 0 &&
    (calendarQuery.data?.data?.length ?? 0) === 0;
  const emptyMonthMessage =
    monthOutsideAcademicYear || academicStatus === "CLOSED"
      ? "This month is outside the selected academic year."
      : "No holidays found for this month.";

  const canAddHoliday = canManageHolidays && academicYearId != null && !monthOutsideAcademicYear;
  const showAddHolidayButton = canManageHolidays;

  const addHolidayTooltip =
    monthOutsideAcademicYear
      ? "This month is outside the selected academic year"
      : academicYearId == null
        ? "Select an academic year first"
        : "Add a holiday";

  const buildAddHolidayPath = useCallback(
    (isoDate?: string) => {
      const params = new URLSearchParams();
      params.set("academic_year_id", String(academicYearId));
      if (isoDate) {
        params.set("start_date", isoDate);
        params.set("end_date", isoDate);
      }
      return `/academics/configuration/holidays/new?${params.toString()}`;
    },
    [academicYearId]
  );

  const handleAddHoliday = useCallback(() => {
    if (!canAddHoliday) {
      enqueueSnackbar("Holidays cannot be added for months outside the academic year.", {
        variant: "warning",
      });
      return;
    }
    navigate(buildAddHolidayPath());
  }, [canAddHoliday, buildAddHolidayPath, navigate, enqueueSnackbar]);

  const handleDayClick = useCallback(
    (iso: string, outsideAcademicYear: boolean, isHoliday: boolean) => {
      if (monthOutsideAcademicYear) {
        enqueueSnackbar("Holidays cannot be added for months outside the academic year.", {
          variant: "warning",
        });
        return;
      }
      if (outsideAcademicYear) {
        enqueueSnackbar("This date is outside the academic year. Choose a date within the academic year.", {
          variant: "warning",
        });
        return;
      }
      if (isHoliday) return;
      if (academicYearId == null) {
        enqueueSnackbar("Select an academic year first", { variant: "warning" });
        return;
      }
      navigate(buildAddHolidayPath(iso));
    },
    [canManageHolidays, monthOutsideAcademicYear, academicYearId, buildAddHolidayPath, navigate, enqueueSnackbar]
  );

  const handleAcademicYearChange = useCallback((value: number) => {
    setAcademicYearId(value);
  }, []);

  return {
    month,
    academicYearId,
    handleAcademicYearChange,
    academicYearsQuery,
    academicYears,
    calendarQuery,
    cellsWithHolidays,
    monthLabel,
    goPrevMonth,
    goNextMonth,
    showCalendarSkeleton,
    calendarLoadFailed,
    noHolidays,
    emptyMonthMessage,
    canAddHoliday,
    showAddHolidayButton,
    addHolidayTooltip,
    handleAddHoliday,
    handleDayClick,
  };
}
