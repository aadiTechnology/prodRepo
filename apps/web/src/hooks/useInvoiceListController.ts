import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import invoiceService from "../api/services/invoiceService";
import schoolClassService, { type SchoolClass } from "../api/services/schoolClassService";
import academicYearService, { type AcademicYear } from "../api/services/academicYearService";
import studentService from "../api/services/studentService";
import type { InvoiceItem, InvoiceStatus } from "../types/invoice";

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

  const statusOptions = useMemo(
    () => invoiceStatuses.map((s) => ({ label: s, value: s })),
    []
  );

  const divisionOptions = useMemo(() => {
    if (!classId) return [];
    const selectedClass = classes.find((c) => String(c.id) === classId);
    if (!selectedClass?.divisions?.length) return [];
    return selectedClass.divisions.map((division) => ({
      value: String(division.id),
      label: division.division_name,
    }));
  }, [classId, classes]);

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
    if (!classId || !divisionId) {
      setStudentOptions([]);
      return;
    }
    try {
      const pageSize = 100;
      let currentPage = 1;
      let total = 0;
      let allItems: StudentOption[] = [];

      do {
        const { items, total: totalCount } = await studentService.list({
          class_id: Number(classId),
          division_id: Number(divisionId),
          limit: pageSize,
          page: currentPage,
          status: "Active",
        });
        total = totalCount || 0;
        const pageOptions = items
          .map((item) => ({
            id: Number(item.id),
            name: String(item.name ?? ""),
          }))
          .filter((item) => Number.isFinite(item.id) && item.name);
        allItems = [...allItems, ...pageOptions];
        currentPage += 1;
      } while (allItems.length < total);

      setStudentOptions(allItems);
    } catch {
      setStudentOptions([]);
    }
  }, [classId, divisionId]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await invoiceService.getInvoices({
        page,
        size: rowsPerPage,
        search: search.trim() || undefined,
        academic_year_id: academicYearId ? Number(academicYearId) : undefined,
        class_id: classId ? Number(classId) : undefined,
        division_id: divisionId ? Number(divisionId) : undefined,
        student_id: studentId ? Number(studentId) : undefined,
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
    } catch (err: any) {
      setSnackbar(err?.message || "Failed to delete invoice");
    } finally {
      setDeleteLoading(false);
      setConfirmDialogOpen(false);
      setInvoiceToDelete(null);
    }
  }, [invoiceToDelete, fetchInvoices]);

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
    classes,
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
