import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import invoiceService from "../api/services/invoiceService";
import {
  approveFeePendingPayment,
  listFeePendingApprovals,
  rejectFeePendingPayment,
} from "../api/services/feeCollectionService";
import schoolClassService, { type SchoolClass } from "../api/services/schoolClassService";
import academicYearService, { type AcademicYear } from "../api/services/academicYearService";
import type { InvoiceItem, InvoiceStatus } from "../types/invoice";
import type { FeeApprovalStatus, FeePaymentApprovalListItem } from "../types/feeCollection";

const invoiceStatuses: InvoiceStatus[] = ["Paid", "Partial", "Pending", "Overdue"];

type InvoiceLookupPayload = {
  years: AcademicYear[];
  classes: SchoolClass[];
};

type StudentOption = {
  id: number;
  name: string;
};

let invoiceLookupCache: InvoiceLookupPayload | null = null;
let invoiceLookupInFlight: Promise<InvoiceLookupPayload> | null = null;

async function getInvoiceLookups(): Promise<InvoiceLookupPayload> {
  if (invoiceLookupCache) return invoiceLookupCache;

  if (!invoiceLookupInFlight) {
    invoiceLookupInFlight = Promise.all([
      academicYearService.listActive(),
      schoolClassService.getAll(),
    ])
      .then(([yearData, classData]) => {
        const payload: InvoiceLookupPayload = {
          years: yearData ?? [],
          classes: classData ?? [],
        };
        invoiceLookupCache = payload;
        return payload;
      })
      .finally(() => {
        invoiceLookupInFlight = null;
      });
  }

  return invoiceLookupInFlight;
}

export function useInvoiceListController() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [sortBy, setSortBy] = useState<"due_date" | "student_name">("due_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState("");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [statusOptions, setStatusOptions] = useState(() =>
    invoiceStatuses.map((s) => ({ label: s, value: s }))
  );

  const classesForYear = useMemo(() => {
    if (!academicYearId) return classes;
    return classes.filter(
      (c) =>
        c.academic_year_id != null &&
        String(c.academic_year_id) === String(academicYearId)
    );
  }, [classes, academicYearId]);

  const divisionOptions = useMemo(() => {
    if (!classId) return [];
    const selectedClass = classesForYear.find((c) => String(c.id) === classId);
    if (!selectedClass?.divisions?.length) return [];
    return selectedClass.divisions.map((division) => ({
      value: String(division.id),
      label: division.division_name,
    }));
  }, [classId, classesForYear]);

  const fetchLookups = useCallback(async () => {
    try {
      const { years: yearData, classes: classData } = await getInvoiceLookups();
      setYears(yearData);
      setClasses(classData);

      if (!academicYearId && yearData.length > 0) {
        const current = yearData.find((y) => (y as AcademicYear & { is_current?: boolean }).is_current);
        setAcademicYearId(String((current ?? yearData[0]).id));
      }
    } catch {
      // Non-blocking lookup load failure.
    }
  }, [academicYearId]);

  const fetchStudents = useCallback(async () => {
    if (!classId || !divisionId || !academicYearId) {
      setStudentOptions([]);
      return;
    }
    try {
      const pageSize = 100;
      let currentPage = 0;
      let total = 0;
      const studentMap = new Map<number, string>();

      do {
        const response = await invoiceService.getInvoices({
          academic_year_id: Number(academicYearId),
          class_id: Number(classId),
          division_id: Number(divisionId),
          page: currentPage,
          size: pageSize,
        });
        total = response.total ?? 0;
        for (const invoice of response.items ?? []) {
          const id = Number(invoice.student_id);
          const name = String(invoice.student_name ?? "").trim();
          if (Number.isFinite(id) && name) {
            studentMap.set(id, name);
          }
        }
        currentPage += 1;
      } while (currentPage * pageSize < total);

      setStudentOptions(
        Array.from(studentMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      setStudentOptions([]);
    }
  }, [academicYearId, classId, divisionId]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const selectedStudentId = studentId ? Number(studentId) : undefined;
      const response = await invoiceService.getInvoices({
        page,
        size: rowsPerPage,
        search: search.trim() || undefined,
        student_id: selectedStudentId,
        academic_year_id: selectedStudentId
          ? undefined
          : academicYearId
            ? Number(academicYearId)
            : undefined,
        class_id: selectedStudentId ? undefined : classId ? Number(classId) : undefined,
        division_id: selectedStudentId ? undefined : divisionId ? Number(divisionId) : undefined,
        status: (status || undefined) as InvoiceStatus | undefined,
      });
      const rows = response.items ?? [];
      const sorted = [...rows].sort((a, b) => {
        const dir = sortOrder === "asc" ? 1 : -1;
        if (sortBy === "due_date") {
          return (new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) * dir;
        }
        return a.student_name.localeCompare(b.student_name) * dir;
      });
      setInvoices(sorted);
      setTotalRows(response.total ?? 0);
    } catch (err: any) {
      setInvoices([]);
      setTotalRows(0);
      setError(err?.message || "Unable to load invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    academicYearId,
    classId,
    divisionId,
    page,
    rowsPerPage,
    search,
    sortBy,
    sortOrder,
    status,
    studentId,
  ]);

  const handleDeleteClick = useCallback((invoice: InvoiceItem) => {
    setInvoiceToDelete(invoice);
    setConfirmDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!invoiceToDelete) return;
    try {
      setDeleteLoading(true);
      await invoiceService.deleteInvoice(invoiceToDelete.id);
      setSnackbar("Invoice deleted successfully");
      void fetchInvoices();
      void fetchStudents();
    } catch (err: any) {
      setSnackbar(err?.message || "Failed to delete invoice");
    } finally {
      setDeleteLoading(false);
      setConfirmDialogOpen(false);
      setInvoiceToDelete(null);
    }
  }, [invoiceToDelete, fetchInvoices, fetchStudents]);

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const onRowsPerPageChange = useCallback((value: number) => {
    setRowsPerPage(value);
    setPage(0);
  }, []);

  const onAcademicYearChange = useCallback((value: string) => {
    setAcademicYearId(value);
    setClassId("");
    setDivisionId("");
    setStudentId("");
    setStatus("");
    setPage(0);
  }, []);

  const onClassChange = useCallback((value: string) => {
    setClassId(value);
    setDivisionId("");
    setStudentId("");
    setPage(0);
  }, []);

  const onDivisionChange = useCallback((value: string) => {
    setDivisionId(value);
    setStudentId("");
    setPage(0);
  }, []);

  const onStudentChange = useCallback((value: string) => {
    setStudentId(value);
    setPage(0);
  }, []);

  useEffect(() => {
    void fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (!studentId) return;
    if (!studentOptions.some((option) => String(option.id) === studentId)) {
      setStudentId("");
    }
  }, [studentOptions, studentId]);

  useEffect(() => {
    if (!classId) return;
    if (!classesForYear.some((c) => String(c.id) === classId)) {
      setClassId("");
      setDivisionId("");
      setStudentId("");
    }
  }, [classesForYear, classId]);

  useEffect(() => {
    if (!divisionId || !classId) return;
    if (!divisionOptions.some((option) => option.value === divisionId)) {
      setDivisionId("");
      setStudentId("");
    }
  }, [divisionOptions, divisionId, classId]);

  useEffect(() => {
    if (!status) return;
    if (!statusOptions.some((option) => option.value === status)) {
      setStatus("");
    }
  }, [statusOptions, status]);

  useEffect(() => {
    if (!academicYearId) {
      setStatusOptions(invoiceStatuses.map((s) => ({ label: s, value: s })));
      return;
    }

    let cancelled = false;
    const loadStatusesForYear = async () => {
      const found = new Set<InvoiceStatus>();
      const pageSize = 100;
      let currentPage = 0;
      let total = 0;

      try {
        do {
          const response = await invoiceService.getInvoices({
            page: currentPage,
            size: pageSize,
            academic_year_id: Number(academicYearId),
          });
          if (cancelled) return;
          total = response.total ?? 0;
          for (const invoice of response.items ?? []) {
            const invoiceStatus = invoice.status as InvoiceStatus;
            if (invoiceStatus && invoiceStatuses.includes(invoiceStatus)) {
              found.add(invoiceStatus);
            }
          }
          if (found.size === invoiceStatuses.length) break;
          currentPage += 1;
        } while (currentPage * pageSize < total);

        const next = invoiceStatuses
          .filter((s) => found.has(s))
          .map((s) => ({ label: s, value: s }));
        setStatusOptions(next);
      } catch {
        if (!cancelled) {
          setStatusOptions(invoiceStatuses.map((s) => ({ label: s, value: s })));
        }
      }
    };

    void loadStatusesForYear();
    return () => {
      cancelled = true;
    };
  }, [academicYearId]);

  return {
    invoices,
    loading,
    error,
    setError,
    totalRows,
    search,
    setSearch: onSearchChange,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage: onRowsPerPageChange,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    academicYearId,
    setAcademicYearId: onAcademicYearChange,
    classId,
    setClassId: onClassChange,
    divisionId,
    setDivisionId: onDivisionChange,
    divisionOptions,
    studentId,
    setStudentId: onStudentChange,
    studentOptions,
    status,
    setStatus,
    years,
    classes: classesForYear,
    statusOptions,
    fetchInvoices,
    confirmDialogOpen,
    setConfirmDialogOpen,
    invoiceToDelete,
    deleteLoading,
    handleDeleteClick,
    handleConfirmDelete,
    snackbar,
    setSnackbar,
  };
}

const feeApprovalStatusOptions: { label: string; value: FeeApprovalStatus }[] = [
  { label: "Pending Approval", value: "Pending Approval" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
  { label: "All Statuses", value: "ALL" },
];

export function useFeePendingApprovalController() {
  const [items, setItems] = useState<FeePaymentApprovalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<FeeApprovalStatus>("Pending Approval");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [studentOptions, setStudentOptions] = useState<{ id: number; name: string }[]>([]);
  const [statusOptions, setStatusOptions] = useState(feeApprovalStatusOptions);

  const classesForYear = useMemo(() => {
    if (!academicYearId) return classes;
    return classes.filter(
      (c) =>
        c.academic_year_id != null &&
        String(c.academic_year_id) === String(academicYearId)
    );
  }, [classes, academicYearId]);

  const divisionOptions = useMemo(() => {
    if (!classId) return [];
    const selectedClass = classesForYear.find((c) => String(c.id) === classId);
    if (!selectedClass?.divisions?.length) return [];
    return selectedClass.divisions.map((division) => ({
      value: String(division.id),
      label: division.division_name,
    }));
  }, [classId, classesForYear]);

  const fetchLookups = useCallback(async () => {
    try {
      const { years: yearData, classes: classData } = await getInvoiceLookups();
      setYears(yearData);
      setClasses(classData);

      if (!academicYearId && yearData.length > 0) {
        const current = yearData.find(
          (y) => (y as AcademicYear & { is_current?: boolean }).is_current
        );
        setAcademicYearId(String((current ?? yearData[0]).id));
      }
    } catch {
      // non-blocking
    }
  }, [academicYearId]);

  const fetchStudents = useCallback(async () => {
    if (!classId || !divisionId || !academicYearId) {
      setStudentOptions([]);
      return;
    }
    try {
      const response = await invoiceService.getInvoices({
        academic_year_id: Number(academicYearId),
        class_id: Number(classId),
        division_id: Number(divisionId),
        page: 0,
        size: 100,
      });
      const studentMap = new Map<number, string>();
      for (const invoice of response.items ?? []) {
        const id = Number(invoice.student_id);
        const name = String(invoice.student_name ?? "").trim();
        if (Number.isFinite(id) && name) studentMap.set(id, name);
      }
      setStudentOptions(
        Array.from(studentMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      setStudentOptions([]);
    }
  }, [academicYearId, classId, divisionId]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listFeePendingApprovals({
        page,
        size: rowsPerPage,
        academic_year_id: academicYearId ? Number(academicYearId) : undefined,
        class_id: classId ? Number(classId) : undefined,
        division_id: divisionId ? Number(divisionId) : undefined,
        student_id: studentId ? Number(studentId) : undefined,
        status,
        search: search.trim() || undefined,
      });
      setItems(response.items ?? []);
      setTotalRows(response.total ?? 0);
    } catch (err: any) {
      setItems([]);
      setTotalRows(0);
      setError(err?.message || "Unable to load pending approvals.");
    } finally {
      setLoading(false);
    }
  }, [
    academicYearId,
    classId,
    divisionId,
    page,
    rowsPerPage,
    search,
    status,
    studentId,
  ]);

  useEffect(() => {
    void fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!studentId) return;
    if (!studentOptions.some((option) => String(option.id) === studentId)) {
      setStudentId("");
    }
  }, [studentOptions, studentId]);

  useEffect(() => {
    if (!classId) return;
    if (!classesForYear.some((c) => String(c.id) === classId)) {
      setClassId("");
      setDivisionId("");
      setStudentId("");
    }
  }, [classesForYear, classId]);

  useEffect(() => {
    if (!divisionId || !classId) return;
    if (!divisionOptions.some((option) => option.value === divisionId)) {
      setDivisionId("");
      setStudentId("");
    }
  }, [divisionOptions, divisionId, classId]);

  useEffect(() => {
    if (!status) return;
    if (!statusOptions.some((option) => option.value === status)) {
      setStatus("Pending Approval");
    }
  }, [statusOptions, status]);

  useEffect(() => {
    if (!academicYearId) {
      setStatusOptions(feeApprovalStatusOptions);
      return;
    }

    let cancelled = false;
    const loadStatusesForYear = async () => {
      const found = new Set<FeeApprovalStatus>();
      const pageSize = 100;
      let currentPage = 0;
      let total = 0;

      try {
        do {
          const response = await listFeePendingApprovals({
            page: currentPage,
            size: pageSize,
            academic_year_id: Number(academicYearId),
            status: "ALL",
          });
          if (cancelled) return;
          total = response.total ?? 0;
          for (const item of response.items ?? []) {
            if (item.status) found.add(item.status);
          }
          if (found.size >= feeApprovalStatusOptions.length - 1) break;
          currentPage += 1;
        } while (currentPage * pageSize < total);

        const next = feeApprovalStatusOptions.filter(
          (option) => option.value === "ALL" || found.has(option.value)
        );
        setStatusOptions(next.length ? next : feeApprovalStatusOptions);
      } catch {
        if (!cancelled) setStatusOptions(feeApprovalStatusOptions);
      }
    };

    void loadStatusesForYear();
    return () => {
      cancelled = true;
    };
  }, [academicYearId]);

  return {
    items,
    loading,
    error,
    setError,
    totalRows,
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
    classId,
    setClassId: (value: string) => {
      setClassId(value);
      setDivisionId("");
      setStudentId("");
      setPage(0);
    },
    divisionId,
    setDivisionId: (value: string) => {
      setDivisionId(value);
      setStudentId("");
      setPage(0);
    },
    studentId,
    setStudentId: (value: string) => {
      setStudentId(value);
      setPage(0);
    },
    status,
    setStatus: (value: FeeApprovalStatus) => {
      setStatus(value);
      setPage(0);
    },
    academicYearId,
    setAcademicYearId: (value: string) => {
      setAcademicYearId(value);
      setClassId("");
      setDivisionId("");
      setStudentId("");
      setStatus("Pending Approval");
      setPage(0);
    },
    years,
    classes: classesForYear,
    divisionOptions,
    studentOptions,
    statusOptions,
    refetch: fetchItems,
    approve: approveFeePendingPayment,
    reject: rejectFeePendingPayment,
  };
}
