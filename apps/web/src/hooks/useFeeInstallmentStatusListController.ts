import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface FeeInstallmentStatusValue {
  fee_installment_id: number;
  installment: string;
  category: string;
  due_date: string;
  amount: number;
  paid: number;
  balance: number;
  status: "Paid" | "Partial" | "Pending" | "Overdue";
}

export interface FeeInstallmentStatusSummary {
  total_due: number;
  total_paid: number;
  outstanding_balance: number;
}

export interface FeeInstallmentStatusResponse {
  summary: FeeInstallmentStatusSummary;
  installments: FeeInstallmentStatusValue[];
}

export interface StudentSearchItem {
  id: number;
  student_name: string;
  student_code?: string | null;
  admission_no?: string | null;
  roll_no?: string | null;
  class_id?: number | null;
  class_name?: string | null;
}

export interface ClassOption {
  id: number;
  name: string;
}

export interface AcademicYearOption {
  id: number;
  name: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CONTROLLER HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useFeeInstallmentStatusListController() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenant_id || 1;

  // ─── DATA STATE ─────────────────────────────────────────────────────
  const [installments, setInstallments] = useState<FeeInstallmentStatusValue[]>([]);
  const [summary, setSummary] = useState<FeeInstallmentStatusSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── FILTER STATE ───────────────────────────────────────────────────
  const [classId, setClassId] = useState<number | "">("");
  const [academicYearId, setAcademicYearId] = useState<number | "">("");
  const [student, setStudent] = useState<StudentSearchItem | null>(null);

  // ─── LOOKUP STATE ───────────────────────────────────────────────────
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentSearchItem[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchItem[] | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const studentSearchTimer = useRef<number | null>(null);

  // ─── PAGINATION STATE ───────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const studentOptions =
    studentQuery.trim().length >= 1 ? (searchResults ?? []) : allStudents;

  // ─── FETCH LOOKUPS (CLASS, ACADEMIC YEAR) ──────────────────────────
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        if (tenantId == null) {
          setError("Tenant is missing.");
          return;
        }
        setError(null);

        // Fetch from feeService or API client
        const [classRes, yearRes] = await Promise.all([
          fetch(`/api/classes?tenant_id=${tenantId}`).then((r) => r.json()),
          fetch(`/api/academic-years?tenant_id=${tenantId}`).then((r) => r.json()),
        ]);

        const classData = (Array.isArray(classRes) ? classRes : classRes.data || []) as ClassOption[];
        const yearData = (Array.isArray(yearRes) ? yearRes : yearRes.data || []) as AcademicYearOption[];

        // Deduplicate classes by name
        const uniqueClasses = Array.from(
          new Map(classData.map((c) => [c.name, c])).values()
        );

        setClasses(uniqueClasses);
        setAcademicYears(yearData ?? []);

        // Auto-select first academic year if available
        if (academicYearId === "" && yearData?.length) {
          setAcademicYearId(yearData[0].id);
        }
      } catch (err) {
        console.error("Error fetching lookups:", err);
        setError("Failed to load classes and academic years");
      }
    };

    fetchLookups();
  }, [tenantId]);

  // ─── FETCH STUDENTS BY CLASS ───────────────────────────────────────
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setStudentLoading(true);
        const selectedClass = classes.find((c) => c.id === classId);

        const params = new URLSearchParams({
          ...(selectedClass?.name && { class_name: selectedClass.name }),
          tenant_id: String(tenantId),
          limit: "50",
        });

        const res = await fetch(
          `/fees/installment-tracking/students?${params}`,
        ).then((r) => r.json());

        setAllStudents((res as StudentSearchItem[]) ?? []);
      } catch (err) {
        console.error("Error fetching students:", err);
        setAllStudents([]);
      } finally {
        setStudentLoading(false);
      }
    };

    fetchStudents();
  }, [classId, tenantId]);

  // ─── SEARCH STUDENTS ───────────────────────────────────────────────
  useEffect(() => {
    if (!studentQuery || studentQuery.trim().length < 1) {
      setSearchResults(null);
      return;
    }

    if (studentSearchTimer.current) {
      window.clearTimeout(studentSearchTimer.current);
    }

    studentSearchTimer.current = window.setTimeout(async () => {
      try {
        setStudentLoading(true);

        const params = new URLSearchParams({
          search: studentQuery.trim(),
          ...(typeof classId === "number" && { class_id: String(classId) }),
          tenant_id: String(tenantId),
          limit: "50",
        });

        const res = await fetch(
          `/fees/installment-tracking/students?${params}`,
        ).then((r) => r.json());

        setSearchResults((res as StudentSearchItem[]) ?? []);
      } catch (err) {
        console.error("Error searching students:", err);
        setSearchResults([]);
      } finally {
        setStudentLoading(false);
      }
    }, 250);

    return () => {
      if (studentSearchTimer.current) {
        window.clearTimeout(studentSearchTimer.current);
      }
    };
  }, [studentQuery, classId, tenantId]);

  // ─── FETCH INSTALLMENT STATUS ──────────────────────────────────────
  const canFetch = Boolean(student?.id) && typeof academicYearId === "number";

  const fetchInstallmentStatus = useCallback(async () => {
    if (!canFetch) {
      setInstallments([]);
      setSummary(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        student_id: String(student!.id),
        academic_year_id: String(academicYearId),
        ...(tenantId && { tenant_id: String(tenantId) }),
      });

      const res = await fetch(
        `/api/fees/installment-status?${params}`,
      ).then((r) => r.json());

      setInstallments((res as FeeInstallmentStatusResponse).installments ?? []);
      setSummary((res as FeeInstallmentStatusResponse).summary ?? null);
    } catch (e: any) {
      console.error("Error fetching installment status:", e);
      setInstallments([]);
      setSummary(null);
      setError(e?.message || "Failed to load installment status.");
    } finally {
      setLoading(false);
    }
  }, [canFetch, student, academicYearId, tenantId]);

  // ─── TRIGGER FETCH ON FILTER CHANGE ────────────────────────────────
  useEffect(() => {
    fetchInstallmentStatus();
  }, [fetchInstallmentStatus]);

  // ─── HANDLE COLLECT PAYMENT ────────────────────────────────────────
  const handleCollectPayment = useCallback(
    (row: FeeInstallmentStatusValue) => {
      if (student && typeof academicYearId === "number") {
        navigate("/fees/collect-payment", {
          state: {
            student,
            installment: row,
            academicYearId,
          },
        });
      }
    },
    [navigate, student, academicYearId]
  );

  return {
    // Data & state
    installments,
    summary,
    loading,
    error,
    setError,
    successMessage,
    setSuccessMessage,

    // Pagination
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    totalInstallments: installments.length,

    // Filters
    classId,
    setClassId,
    academicYearId,
    setAcademicYearId,
    student,
    setStudent,

    // Lookups
    classes,
    academicYears,
    allStudents,
    studentOptions,
    studentQuery,
    setStudentQuery,
    studentLoading,

    // Methods
    fetchInstallmentStatus,
    handleCollectPayment,
  };
}
