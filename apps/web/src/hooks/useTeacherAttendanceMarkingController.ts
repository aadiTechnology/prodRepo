import { useCallback, useEffect, useMemo, useState } from "react";

import staffAttendanceService, {
  type StaffAttendanceResponse,
} from "../api/services/staffAttendanceService";
import attendanceConfigurationService, {
  getHolidaysForCalendar,
} from "../api/services/attendanceConfigurationService";
import academicYearService from "../api/services/academicYearService";
import teacherService from "../api/services/teacherService";
import { useAuth } from "../context/AuthContext";
import { useAttendanceReportRole } from "./useAttendanceReportRole";
import type {
  ApprovalStatus,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
  TeacherProfile,
} from "../pages/Attendance/teacher-marking/teacherAttendanceMarking.types";
import {
  MAX_REMARKS_LENGTH,
  CHECK_IN_SUCCESS_MESSAGE,
  CHECK_OUT_SUCCESS_MESSAGE,
} from "../pages/Attendance/teacher-marking/teacherAttendanceMarking.types";
import {
  formatCurrentTime,
  formatAttendanceTimeDisplay,
  getTodayIso,
  getCurrentMonthStartIso,
  isFutureDate,
  isApprovalQueueRecord,
  listDatesInRange,
  buildAttendanceListGrid,
  isWeekend,
  isHoliday,
  primaryCalendarStatus,
  resolveStatusAfterCheckIn,
  toIsoDate,
} from "../pages/Attendance/teacher-marking/teacherAttendanceMarking.utils";

export type TeacherAttendanceTab = "check-in-out" | "mark-attendance" | "attendance-details";

export type TeacherMarkDraft = {
  checkInTime: string;
  checkOutTime: string;
  remarks: string;
};

export type AttendanceDetailsFilters = {
  teacherId: string;
  approvalStatus: ApprovalStatus | "";
  fromDate: string;
  toDate: string;
};

export type SnackbarState = {
  open: boolean;
  message: string;
  severity: "success" | "error" | "warning" | "info";
};

function resolveDefaultAttendanceTab(isAdminLike: boolean): TeacherAttendanceTab {
  return isAdminLike ? "attendance-details" : "check-in-out";
}

function parseTimeSafe(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function upsertRecord(
  records: TeacherAttendanceRecord[],
  record: TeacherAttendanceRecord
): TeacherAttendanceRecord[] {
  const idx = records.findIndex(
    (r) => r.teacherId === record.teacherId && r.date === record.date
  );
  if (idx >= 0) {
    const next = [...records];
    next[idx] = record;
    return next;
  }
  return [...records, record];
}

function mapApiRecord(row: StaffAttendanceResponse): TeacherAttendanceRecord {
  const status = (row.status || "Present") as TeacherAttendanceStatus;
  return {
    id: String(row.id),
    teacherId: String(row.teacher_id),
    date: String(row.attendance_date).slice(0, 10),
    statuses: status ? [status] : [],
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time,
    remarks: row.remarks ?? "",
    remarkHistory: [],
    workingHoursMinutes: row.working_hours_minutes,
    overtimeMinutes: row.overtime_minutes,
    isSubmitted: !!row.is_submitted,
    payrollProcessed: false,
    approvalStatus: (row.approval_status as ApprovalStatus) || "Waiting for Approval",
    rejectionReason: row.rejection_reason ?? "",
  };
}

function createEmptyRecord(teacherId: string, date: string): TeacherAttendanceRecord {
  return {
    id: "",
    teacherId,
    date,
    statuses: [],
    checkInTime: null,
    checkOutTime: null,
    remarks: "",
    remarkHistory: [],
    workingHoursMinutes: null,
    overtimeMinutes: null,
    isSubmitted: false,
    payrollProcessed: false,
    approvalStatus: "Waiting for Approval",
    rejectionReason: "",
  };
}

function emptyMarkDraft(): TeacherMarkDraft {
  return { checkInTime: "", checkOutTime: "", remarks: "" };
}

function monthRange(month: Date): { from: string; to: string } {
  const y = month.getFullYear();
  const m = month.getMonth();
  const from = toIsoDate(y, m, 1);
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to = toIsoDate(y, m, lastDay);
  return { from, to };
}

export type TeacherAttendanceMarkingController = ReturnType<
  typeof useTeacherAttendanceMarkingController
>;

export function useTeacherAttendanceMarkingController() {
  const { user } = useAuth();
  const { isTeacher, isAdminLike } = useAttendanceReportRole();
  const today = getTodayIso();

  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [selfTeacherId, setSelfTeacherId] = useState<string>("");

  const [records, setRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  // Holidays state for calendar
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  // Attendance configuration (working days, office timing, grace time)
  const [workingDays, setWorkingDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });
  const [officeTimingConfig, setOfficeTimingConfig] = useState({
    startTime: "09:00",
    endTime: "17:00",
    minimumWorkingHours: 360,
  });
  const [graceTimeConfig, setGraceTimeConfig] = useState({
    enabled: false,
    graceMinutes: 0,
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<TeacherAttendanceTab>(() =>
    resolveDefaultAttendanceTab(isAdminLike)
  );
  const [checkInOutErrors, setCheckInOutErrors] = useState<string[]>([]);
  const [markDate, setMarkDate] = useState(today);
  const [markTeacherId, setMarkTeacherId] = useState("");
  const [markDraft, setMarkDraft] = useState<TeacherMarkDraft>(emptyMarkDraft);
  const [markErrors, setMarkErrors] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "info",
  });
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [detailsFilters, setDetailsFilters] = useState<AttendanceDetailsFilters>({
    teacherId: "",
    approvalStatus: "Waiting for Approval",
    fromDate: today,
    toDate: today,
  });

  const markableTeachers = useMemo(
    () => teachers.filter((t) => t.employmentStatus === "active"),
    [teachers]
  );


  // Load active teachers from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTeachersLoading(true);
      setTeachersError(null);
      try {
        const res = await teacherService.list({ status: "active", limit: 500, skip: 0 });
        if (cancelled) return;
        const mapped: TeacherProfile[] = (res.items || []).map((t) => ({
          id: String(t.id),
          name: t.full_name,
          employmentStatus: t.is_active ? "active" : "inactive",
          shiftId: "shift-1",
        }));
        setTeachers(mapped);

        const linked = (res.items || []).find((t) => t.user_id != null && t.user_id === user?.id);
        const resolvedSelf = linked ? String(linked.id) : "";
        setSelfTeacherId(resolvedSelf);

        if (isTeacher && resolvedSelf) {
          setMarkTeacherId(resolvedSelf);
        } else if (!isTeacher && mapped[0]) {
          setMarkTeacherId((prev) => prev || mapped[0].id);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load teachers")
            : "Failed to load teachers";
        setTeachersError(message);
        setTeachers([]);
      } finally {
        if (!cancelled) setTeachersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isTeacher]);

  const refreshRecords = useCallback(
    async (opts?: { teacherId?: string; month?: Date; fromDate?: string; toDate?: string }) => {
      const teacherId = opts?.teacherId ?? (isAdminLike ? undefined : selfTeacherId || markTeacherId);
      const month = opts?.month ?? calendarMonth;
      const { from, to } = monthRange(month);

      const isDetailsTab = isAdminLike && activeTab === "attendance-details";
      let finalFromDate = isDetailsTab ? opts?.fromDate : from;
      let finalToDate = isDetailsTab ? opts?.toDate : to;

      if (finalFromDate && finalToDate && finalFromDate > finalToDate) {
        finalFromDate = finalToDate;
      }

      setRecordsLoading(true);
      setRecordsError(null);
      try {
        const res = await staffAttendanceService.list({
          teacher_id: teacherId ? Number(teacherId) : undefined,
          from_date: finalFromDate,
          to_date: finalToDate,
        });
        setRecords((res.items || []).map(mapApiRecord));
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Failed to load attendance")
            : "Failed to load attendance";
        setRecordsError(message);
      } finally {
        setRecordsLoading(false);
      }
    },
    [activeTab, calendarMonth, isAdminLike, markTeacherId, selfTeacherId]
  );

  useEffect(() => {
    if (teachersLoading) return;
    if (isTeacher && !selfTeacherId) return;
    if (!isTeacher && !markTeacherId && activeTab === "mark-attendance") return;
    void refreshRecords({
      teacherId:
        activeTab === "mark-attendance"
          ? markTeacherId
          : activeTab === "check-in-out"
            ? selfTeacherId
            : detailsFilters.teacherId || undefined,
      fromDate: activeTab === "attendance-details" ? detailsFilters.fromDate : undefined,
      toDate: activeTab === "attendance-details" ? detailsFilters.toDate : undefined,
    });
  }, [
    teachersLoading,
    selfTeacherId,
    markTeacherId,
    calendarMonth,
    activeTab,
    detailsFilters.teacherId,
    detailsFilters.fromDate,
    detailsFilters.toDate,
    isTeacher,
    refreshRecords,
  ]);

  // Fetch holidays when calendar month changes
  useEffect(() => {
    const fetchHolidays = async () => {
      const { from, to } = monthRange(calendarMonth);
      setHolidaysLoading(true);
      try {
        const holidayList = await getHolidaysForCalendar(from, to);
        const holidayMap: Record<string, string> = {};
        for (const holiday of holidayList) {
          // Store holiday name by date
          holidayMap[holiday.holiday_date] = holiday.name;
        }
        setHolidays(holidayMap);
      } catch (err) {
        console.error("Failed to load holidays:", err);
        setHolidays({});
      } finally {
        setHolidaysLoading(false);
      }
    };

    void fetchHolidays();
  }, [calendarMonth]);

  // Load attendance configuration (working days, office timing, grace time)
  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      try {
        // First get active academic year
        if (!academicYearId) {
          const years = await academicYearService.listActive();
          if (cancelled) return;
          if (years && years.length > 0) {
            setAcademicYearId(Number(years[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to load academic years:", err);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Load attendance configuration once we have academic year ID
  useEffect(() => {
    if (!academicYearId) return;
    
    let cancelled = false;
    (async () => {
      setConfigLoading(true);
      try {
        const config = await attendanceConfigurationService.get(academicYearId);
        if (cancelled) return;
        
        setWorkingDays(config.workingDays);
        setOfficeTimingConfig(config.officeTiming);
        setGraceTimeConfig({
          enabled: config.graceTime.enabled,
          graceMinutes: config.graceTime.graceMinutes,
        });
      } catch (err) {
        console.error("Failed to load attendance configuration:", err);
        // Keep defaults if load fails
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [academicYearId]);


  const todayRecord = useMemo(() => {
    if (!selfTeacherId) return createEmptyRecord("", today);
    const existing = records.find((r) => r.teacherId === selfTeacherId && r.date === today);
    return existing ?? createEmptyRecord(selfTeacherId, today);
  }, [records, selfTeacherId, today]);

  const displayCheckInTime = formatAttendanceTimeDisplay(todayRecord.checkInTime);
  const displayCheckOutTime = formatAttendanceTimeDisplay(todayRecord.checkOutTime);
  const todayAttendanceStatus = primaryCalendarStatus(todayRecord.statuses);

  const showCheckInButton = !!selfTeacherId && !todayRecord.checkInTime;
  const showCheckOutButton =
    !!selfTeacherId && !!todayRecord.checkInTime && !todayRecord.checkOutTime;
  const buttonsDisabled = !selfTeacherId || !!todayRecord.checkOutTime;

  const markRecord = useMemo(
    () => records.find((r) => r.teacherId === markTeacherId && r.date === markDate),
    [records, markTeacherId, markDate]
  );

  const calendarStatusByDate = useMemo(() => {
    const map: Record<string, TeacherAttendanceStatus> = {};
    for (const record of records.filter((r) => r.teacherId === markTeacherId)) {
      const primary = primaryCalendarStatus(record.statuses);
      if (primary) map[record.date] = primary;
      else if (record.checkInTime) map[record.date] = "Present";
    }
    return map;
  }, [records, markTeacherId]);

  const calendarRecordsByDate = useMemo(() => {
    const map: Record<string, { checkInTime: string | null; checkOutTime: string | null }> = {};
    for (const record of records.filter((r) => r.teacherId === markTeacherId)) {
      map[record.date] = { checkInTime: record.checkInTime, checkOutTime: record.checkOutTime };
    }
    return map;
  }, [records, markTeacherId]);

  /** Used by calendar so Rejected ≠ green Present icon */
  const calendarApprovalByDate = useMemo(() => {
    const map: Record<string, ApprovalStatus> = {};
    for (const record of records.filter((r) => r.teacherId === markTeacherId)) {
      if (record.isSubmitted || record.approvalStatus === "Rejected") {
        map[record.date] = record.approvalStatus;
      }
    }
    return map;
  }, [records, markTeacherId]);

  const detailsRecordsInRange = useMemo(() => {
    let items = [...records];
    if (detailsFilters.fromDate) {
      items = items.filter((r) => r.date >= detailsFilters.fromDate);
    }
    if (detailsFilters.toDate) {
      items = items.filter((r) => r.date <= detailsFilters.toDate);
    }
    if (detailsFilters.teacherId) {
      items = items.filter((r) => r.teacherId === detailsFilters.teacherId);
    }
    return items;
  }, [records, detailsFilters.fromDate, detailsFilters.toDate, detailsFilters.teacherId]);

  const attendanceListGridRecords = useMemo(() => {
    const teachers = detailsFilters.teacherId
      ? markableTeachers.filter((t) => t.id === detailsFilters.teacherId)
      : markableTeachers;
    const dates = listDatesInRange(detailsFilters.fromDate, detailsFilters.toDate);
    return buildAttendanceListGrid(teachers, dates, detailsRecordsInRange);
  }, [
    detailsFilters.teacherId,
    detailsFilters.fromDate,
    detailsFilters.toDate,
    markableTeachers,
    detailsRecordsInRange,
  ]);

  const filteredDetailsRecords = useMemo(() => {
    let items = detailsRecordsInRange.filter((r) => r.date < today);
    if (detailsFilters.approvalStatus) {
      items = items.filter((r) => r.approvalStatus === detailsFilters.approvalStatus);
    }
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [detailsRecordsInRange, detailsFilters.approvalStatus, today]);

  const refreshPendingCount = useCallback(async () => {
    if (!isAdminLike) {
      setPendingApprovalCount(0);
      return;
    }
    try {
      const res = await staffAttendanceService.list({
        from_date: getCurrentMonthStartIso(),
        to_date: today,
      });
      const count = (res.items || []).filter((row) => {
        const date = String(row.attendance_date).slice(0, 10);
        return isApprovalQueueRecord(
          { date, isSubmitted: !!row.is_submitted },
          today
        ) && row.approval_status === "Waiting for Approval";
      }).length;
      setPendingApprovalCount(count);
    } catch {
      // Keep the last known badge count if the count request fails.
    }
  }, [isAdminLike, today]);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  const loadMarkDraftForDate = useCallback(
    (date: string, teacherId: string) => {
      const record = records.find((r) => r.teacherId === teacherId && r.date === date);
      setMarkDraft({
        checkInTime: record?.checkInTime ?? "",
        checkOutTime: record?.checkOutTime ?? "",
        remarks: record?.remarks ?? "",
      });
      setMarkErrors([]);
    },
    [records]
  );

  useEffect(() => {
    loadMarkDraftForDate(markDate, markTeacherId);
  }, [markDate, markTeacherId, loadMarkDraftForDate]);

  const persistMark = useCallback(
    async (payload: {
      teacherId: string;
      date: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      remarks: string;
      status?: TeacherAttendanceStatus;
    }) => {
      const saved = await staffAttendanceService.mark({
        teacher_id: Number(payload.teacherId),
        attendance_date: payload.date,
        check_in_time: payload.checkInTime,
        check_out_time: payload.checkOutTime,
        remarks: payload.remarks || null,
        status: payload.status,
      });
      const mapped = mapApiRecord(saved);
      setRecords((prev) => upsertRecord(prev, mapped));
      void refreshPendingCount();
      return mapped;
    },
    [refreshPendingCount]
  );

  const handleCheckIn = useCallback(async () => {
    if (!selfTeacherId || todayRecord.checkInTime || todayRecord.checkOutTime) return;

    const checkInTime = formatCurrentTime();
    const officeStart = officeTimingConfig.startTime;
    const autoStatus: TeacherAttendanceStatus = resolveStatusAfterCheckIn(
      checkInTime,
      officeStart,
      graceTimeConfig.enabled,
      graceTimeConfig.graceMinutes
    );

    setSaving(true);
    setCheckInOutErrors([]);
    try {
      await persistMark({
        teacherId: selfTeacherId,
        date: today,
        checkInTime,
        checkOutTime: null,
        remarks: todayRecord.remarks || "",
        status: autoStatus,
      });
      setSnackbar({
        open: true,
        message: CHECK_IN_SUCCESS_MESSAGE,
        severity: "success",
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Check-in failed")
          : "Check-in failed";
      setCheckInOutErrors([message]);
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [selfTeacherId, todayRecord, persistMark, today]);

  const handleCheckOut = useCallback(async () => {
    if (!selfTeacherId || !todayRecord.checkInTime || todayRecord.checkOutTime) return;

    const checkOutTime = formatCurrentTime();
    if (parseTimeSafe(checkOutTime) < parseTimeSafe(todayRecord.checkInTime)) {
      setCheckInOutErrors(["Check-out cannot happen before check-in."]);
      return;
    }

    setSaving(true);
    setCheckInOutErrors([]);
    try {
      await persistMark({
        teacherId: selfTeacherId,
        date: today,
        checkInTime: todayRecord.checkInTime,
        checkOutTime,
        remarks: todayRecord.remarks || "",
        status: todayRecord.statuses[0],
      });
      setSnackbar({
        open: true,
        message: CHECK_OUT_SUCCESS_MESSAGE,
        severity: "success",
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Check-out failed")
          : "Check-out failed";
      setCheckInOutErrors([message]);
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [selfTeacherId, todayRecord, persistMark, today]);

  const setMarkDateSafe = useCallback((date: string) => {
    if (isFutureDate(date)) return;
    setMarkDate(date);
  }, []);

  const selectCalendarDate = useCallback(
    (date: string) => {
      setMarkDateSafe(date);
      const month = new Date(`${date}T00:00:00`);
      setCalendarMonth(new Date(month.getFullYear(), month.getMonth(), 1));
    },
    [setMarkDateSafe]
  );

  const updateMarkDraft = useCallback(
    <K extends keyof TeacherMarkDraft>(key: K, value: TeacherMarkDraft[K]) => {
      setMarkDraft((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const cancelMarkAttendance = useCallback(() => {
    loadMarkDraftForDate(markDate, markTeacherId);
  }, [loadMarkDraftForDate, markDate, markTeacherId]);

  const saveMarkAttendance = useCallback(async () => {
    const errors: string[] = [];
    if (!markTeacherId) errors.push("Teacher is required.");
    if (!markDate) errors.push("Attendance date is required.");
    if (markDate && isFutureDate(markDate)) errors.push("Future date attendance is not allowed.");
    
    // Check for non-working days and holidays (based on configuration)
    if (markDate) {
      // Check if this specific date is a working day
      const d = new Date(`${markDate}T00:00:00`);
      const dayOfWeek = d.getDay();
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
      const dayName = daysOfWeek[dayOfWeek];
      const isWorkingDayDate = workingDays[dayName as keyof typeof workingDays] ?? false;
      
      if (!isWorkingDayDate) {
        errors.push("non-working-day");
      } else if (isHoliday(markDate, holidays)) {
        errors.push("holidays");
      }
    }
    
    if (!markDraft.checkInTime.trim()) {
      errors.push("Check-in time is required.");
    }
    if (!markDraft.checkOutTime.trim()) {
      errors.push("Check-out time is required.");
    }
    if (markDraft.checkInTime && markDraft.checkOutTime) {
      if (parseTimeSafe(markDraft.checkOutTime) < parseTimeSafe(markDraft.checkInTime)) {
        errors.push("Check-out cannot happen before check-in.");
      }
    }
    if (markDraft.remarks.length > MAX_REMARKS_LENGTH) {
      errors.push(`Remarks cannot exceed ${MAX_REMARKS_LENGTH} characters.`);
    }

    setMarkErrors(errors);
    if (errors.length > 0) {
      // Show validation errors in snackbar
      const errorMsg = errors[0];
      // Simplify weekend/holiday message
      let displayMsg = errorMsg;
      if (errorMsg.includes("non-working")) {
        displayMsg = "Attendance cannot be marked on non-working days.";
      } else if (errorMsg.includes("holidays")) {
        displayMsg = "Attendance cannot be marked on holidays.";
      }
      
      setSnackbar({
        open: true,
        message: displayMsg,
        severity: "error",
      });
      return;
    }

    // Use configured office timing and grace time
    const officeStart = officeTimingConfig.startTime;
    // Always recompute Present/Late from check-in (never keep a sticky Late).
    let status: TeacherAttendanceStatus | undefined;
    if (markDraft.checkInTime) {
      status = resolveStatusAfterCheckIn(
        markDraft.checkInTime,
        officeStart,
        graceTimeConfig.enabled,
        graceTimeConfig.graceMinutes
      );
    } else if (markRecord?.statuses[0]) {
      status = markRecord.statuses[0];
    }

    setSaving(true);
    try {
      await persistMark({
        teacherId: markTeacherId,
        date: markDate,
        checkInTime: markDraft.checkInTime || null,
        checkOutTime: markDraft.checkOutTime || null,
        remarks: markDraft.remarks.slice(0, MAX_REMARKS_LENGTH),
        status,
      });
      setMarkErrors([]);
      setSnackbar({
        open: true,
        message: "Attendance marked successfully!",
        severity: "success",
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "Save failed")
          : "Save failed";
      setMarkErrors([message]);
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [markTeacherId, markDate, markDraft, markRecord, persistMark, holidays, workingDays, officeTimingConfig, graceTimeConfig]);

  const updateDetailsFilter = useCallback(
    <K extends keyof AttendanceDetailsFilters>(key: K, value: AttendanceDetailsFilters[K]) => {
      setDetailsFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateApprovalStatus = useCallback(
    async (recordId: string, approvalStatus: ApprovalStatus, rejectionReason = "") => {
      const numericId = Number(recordId);
      if (!Number.isFinite(numericId) || numericId <= 0) return;
      setSaving(true);
      try {
        const saved = await staffAttendanceService.updateApproval(numericId, {
          approval_status: approvalStatus,
          rejection_reason: rejectionReason || null,
        });
        setRecords((prev) => upsertRecord(prev, mapApiRecord(saved)));
        void refreshPendingCount();
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message || "Approval update failed")
            : "Approval update failed";
        setRecordsError(message);
      } finally {
        setSaving(false);
      }
    },
    [refreshPendingCount]
  );

  return {
    isTeacher,
    isAdminLike,
    activeTab,
    setActiveTab,
    todayRecord,
    displayCheckInTime,
    displayCheckOutTime,
    todayAttendanceStatus,
    officeTimingConfig,
    showCheckInButton,
    showCheckOutButton,
    buttonsDisabled,
    checkInOutErrors,
    handleCheckIn,
    handleCheckOut,
    markDate,
    setMarkDate: setMarkDateSafe,
    markTeacherId,
    setMarkTeacherId,
    markableTeachers,
    markDraft,
    markErrors,
    markRecord,
    calendarMonth,
    setCalendarMonth,
    calendarStatusByDate,
    calendarApprovalByDate,
    calendarRecordsByDate,
    selectCalendarDate,
    updateMarkDraft,
    saveMarkAttendance,
    cancelMarkAttendance,
    today,
    detailsFilters,
    updateDetailsFilter,
    filteredDetailsRecords,
    attendanceListGridRecords,
    pendingApprovalCount,
    updateApprovalStatus,
    teachersLoading,
    teachersError,
    recordsLoading,
    recordsError,
    saving,
    selfTeacherId,
    holidays,
    holidaysLoading,
    snackbar,
    setSnackbar,
  };
}
