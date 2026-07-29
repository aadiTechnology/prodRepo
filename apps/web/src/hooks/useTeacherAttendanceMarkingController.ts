import { useCallback, useEffect, useMemo, useState } from "react";

import { useAttendanceReportRole } from "./useAttendanceReportRole";
import {
  createInitialTeacherAttendanceRecords,
  getActiveTeachers,
  getShiftById,
  getTeacherById,
  MOCK_GRACE_TIME,
  MOCK_LOGGED_IN_ADMIN_ID,
  MOCK_LOGGED_IN_TEACHER_ID,
  MOCK_OFFICE_TIMING,
} from "../pages/Attendance/teacher-marking/teacherAttendanceMarking.mock";
import type {
  ApprovalStatus,
  RemarkHistoryEntry,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
} from "../pages/Attendance/teacher-marking/teacherAttendanceMarking.types";
import { MAX_REMARKS_LENGTH } from "../pages/Attendance/teacher-marking/teacherAttendanceMarking.types";
import {
  calculateOvertime,
  calculateWorkingHours,
  formatCurrentTime,
  getTodayIso,
  isFutureDate,
  primaryCalendarStatus,
  resolveStatusAfterCheckIn,
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
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyRecord(teacherId: string, date: string): TeacherAttendanceRecord {
  return {
    id: createId("tar"),
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

function getMarkableTeachers() {
  return getActiveTeachers().filter((t) => t.id !== MOCK_LOGGED_IN_ADMIN_ID);
}

export type TeacherAttendanceMarkingController = ReturnType<
  typeof useTeacherAttendanceMarkingController
>;

export function useTeacherAttendanceMarkingController() {
  const { isTeacher, isAdminLike } = useAttendanceReportRole();
  const selfTeacherId = isTeacher ? MOCK_LOGGED_IN_TEACHER_ID : MOCK_LOGGED_IN_ADMIN_ID;
  const markableTeachers = useMemo(() => getMarkableTeachers(), []);
  const today = getTodayIso();

  const [records, setRecords] = useState<TeacherAttendanceRecord[]>(
    createInitialTeacherAttendanceRecords
  );
  const [activeTab, setActiveTab] = useState<TeacherAttendanceTab>("check-in-out");
  const [checkInOutErrors, setCheckInOutErrors] = useState<string[]>([]);
  const [markDate, setMarkDate] = useState(today);
  const [markTeacherId, setMarkTeacherId] = useState(
    isTeacher ? MOCK_LOGGED_IN_TEACHER_ID : markableTeachers[0]?.id ?? MOCK_LOGGED_IN_TEACHER_ID
  );
  const [markDraft, setMarkDraft] = useState<TeacherMarkDraft>(emptyMarkDraft);
  const [markErrors, setMarkErrors] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [currentTime, setCurrentTime] = useState(formatCurrentTime);
  const [detailsFilters, setDetailsFilters] = useState<AttendanceDetailsFilters>({
    teacherId: "",
    approvalStatus: "",
  });

  const selfTeacher = useMemo(() => getTeacherById(selfTeacherId), [selfTeacherId]);
  const markTeacher = useMemo(() => getTeacherById(markTeacherId), [markTeacherId]);
  const selfShift = useMemo(
    () => (selfTeacher ? getShiftById(selfTeacher.shiftId) : undefined),
    [selfTeacher]
  );
  const markShift = useMemo(
    () => (markTeacher ? getShiftById(markTeacher.shiftId) : undefined),
    [markTeacher]
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatCurrentTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayRecord = useMemo(() => {
    const existing = records.find((r) => r.teacherId === selfTeacherId && r.date === today);
    return existing ?? createEmptyRecord(selfTeacherId, today);
  }, [records, selfTeacherId, today]);

  const displayCheckInTime = todayRecord.checkInTime ?? currentTime;
  const displayCheckOutTime = todayRecord.checkOutTime
    ? todayRecord.checkOutTime
    : todayRecord.checkInTime
      ? currentTime
      : "—";

  const showCheckInButton = !todayRecord.checkInTime;
  const showCheckOutButton = !!todayRecord.checkInTime && !todayRecord.checkOutTime;
  const buttonsDisabled = !!todayRecord.checkOutTime;

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

  const filteredDetailsRecords = useMemo(() => {
    let items = records.filter((r) => r.teacherId !== MOCK_LOGGED_IN_ADMIN_ID);

    if (detailsFilters.teacherId) {
      items = items.filter((r) => r.teacherId === detailsFilters.teacherId);
    }
    if (detailsFilters.approvalStatus) {
      items = items.filter((r) => r.approvalStatus === detailsFilters.approvalStatus);
    }

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [records, detailsFilters]);

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

  const handleCheckIn = useCallback(() => {
    if (todayRecord.checkInTime || todayRecord.checkOutTime) return;

    const checkInTime = formatCurrentTime();
    const shiftStart = selfShift?.startTime ?? MOCK_OFFICE_TIMING.startTime;
    const autoStatus: TeacherAttendanceStatus = resolveStatusAfterCheckIn(
      checkInTime,
      shiftStart,
      MOCK_GRACE_TIME.enabled,
      MOCK_GRACE_TIME.graceMinutes
    );

    const updated: TeacherAttendanceRecord = {
      ...todayRecord,
      id: todayRecord.id || createId("tar"),
      checkInTime,
      statuses: [autoStatus],
      approvalStatus: "Waiting for Approval",
    };

    setRecords((prev) => upsertRecord(prev, updated));
    setCheckInOutErrors([]);
  }, [todayRecord, selfShift]);

  const handleCheckOut = useCallback(() => {
    if (!todayRecord.checkInTime || todayRecord.checkOutTime) return;

    const checkOutTime = formatCurrentTime();
    if (parseTimeSafe(checkOutTime) < parseTimeSafe(todayRecord.checkInTime)) {
      setCheckInOutErrors(["Check-out cannot happen before check-in."]);
      return;
    }

    const workingMinutes = calculateWorkingHours(todayRecord.checkInTime, checkOutTime);
    const shiftEnd = selfShift?.endTime ?? MOCK_OFFICE_TIMING.endTime;
    const overtimeMinutes = calculateOvertime(
      workingMinutes,
      todayRecord.checkInTime,
      shiftEnd
    );

    const updated: TeacherAttendanceRecord = {
      ...todayRecord,
      checkOutTime,
      workingHoursMinutes: workingMinutes,
      overtimeMinutes,
      isSubmitted: true,
      approvalStatus: "Waiting for Approval",
    };

    setRecords((prev) => upsertRecord(prev, updated));
    setCheckInOutErrors([]);
  }, [todayRecord, selfShift]);

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

  const saveMarkAttendance = useCallback(() => {
    const errors: string[] = [];
    if (!markDate) {
      errors.push("Attendance date is required.");
    }
    if (markDate && isFutureDate(markDate)) {
      errors.push("Future date attendance is not allowed.");
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
    if (errors.length > 0) return;

    const existing = markRecord ?? createEmptyRecord(markTeacherId, markDate);
    const workingMinutes =
      markDraft.checkInTime && markDraft.checkOutTime
        ? calculateWorkingHours(markDraft.checkInTime, markDraft.checkOutTime)
        : null;
    const shiftEnd = markShift?.endTime ?? MOCK_OFFICE_TIMING.endTime;
    const overtimeMinutes =
      workingMinutes != null && markDraft.checkInTime
        ? calculateOvertime(workingMinutes, markDraft.checkInTime, shiftEnd)
        : null;

    const shiftStart = markShift?.startTime ?? MOCK_OFFICE_TIMING.startTime;
    let statuses: TeacherAttendanceStatus[] = existing.statuses;
    if (markDraft.checkInTime && statuses.length === 0) {
      statuses = [
        resolveStatusAfterCheckIn(
          markDraft.checkInTime,
          shiftStart,
          MOCK_GRACE_TIME.enabled,
          MOCK_GRACE_TIME.graceMinutes
        ),
      ];
    }

    const remarkHistory: RemarkHistoryEntry[] = [...existing.remarkHistory];
    const updatedBy = isAdminLike
      ? selfTeacher?.name ?? "School Admin"
      : markTeacher?.name ?? "Teacher";
    if (markDraft.remarks.trim() && markDraft.remarks !== existing.remarks) {
      remarkHistory.push({
        id: createId("rh"),
        text: markDraft.remarks,
        updatedBy,
        updatedAt: new Date().toISOString(),
      });
    }

    const updated: TeacherAttendanceRecord = {
      ...existing,
      teacherId: markTeacherId,
      date: markDate,
      checkInTime: markDraft.checkInTime || null,
      checkOutTime: markDraft.checkOutTime || null,
      remarks: markDraft.remarks.slice(0, MAX_REMARKS_LENGTH),
      workingHoursMinutes: workingMinutes,
      overtimeMinutes,
      statuses,
      remarkHistory,
      isSubmitted: !!(markDraft.checkInTime && markDraft.checkOutTime),
      approvalStatus: "Waiting for Approval",
      rejectionReason: "",
    };

    setRecords((prev) => upsertRecord(prev, updated));
    setMarkErrors([]);
  }, [
    markDate,
    markDraft,
    markRecord,
    markShift,
    markTeacher?.name,
    markTeacherId,
    isAdminLike,
    selfTeacher?.name,
  ]);

  const updateDetailsFilter = useCallback(
    <K extends keyof AttendanceDetailsFilters>(key: K, value: AttendanceDetailsFilters[K]) => {
      setDetailsFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateApprovalStatus = useCallback(
    (recordId: string, approvalStatus: ApprovalStatus, rejectionReason = "") => {
      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId
            ? {
                ...record,
                approvalStatus,
                rejectionReason:
                  approvalStatus === "Rejected" ? rejectionReason : "",
              }
            : record
        )
      );
    },
    []
  );

  return {
    isTeacher,
    isAdminLike,
    activeTab,
    setActiveTab,
    todayRecord,
    displayCheckInTime,
    displayCheckOutTime,
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
    selectCalendarDate,
    updateMarkDraft,
    saveMarkAttendance,
    cancelMarkAttendance,
    today,
    detailsFilters,
    updateDetailsFilter,
    filteredDetailsRecords,
    updateApprovalStatus,
  };
}
