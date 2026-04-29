import { useCallback, useEffect, useMemo, useState } from "react";
import invoiceService from "../api/services/invoiceService";
import schoolClassService, { type SchoolClass } from "../api/services/schoolClassService";
import academicYearService, { type AcademicYear } from "../api/services/academicYearService";
import type { InvoiceItem, InvoiceStatus } from "../types/invoice";
import invoiceApi from "../api/invoiceApi";

const invoiceStatuses: InvoiceStatus[] = ["Paid", "Partial", "Pending", "Overdue"];

type InvoiceLookupPayload = {
  years: AcademicYear[];
  classes: SchoolClass[];
};

let invoiceLookupCache: InvoiceLookupPayload | null = null;
let invoiceLookupInFlight: Promise<InvoiceLookupPayload> | null = null;

async function getInvoiceLookups(): Promise<InvoiceLookupPayload> {
  if (invoiceLookupCache) return invoiceLookupCache;

  if (!invoiceLookupInFlight) {
    invoiceLookupInFlight = Promise.all([
      academicYearService.getAll(),
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<"invoice_no" | "due_date" | "student_name">("invoice_no");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [installment, setInstallment] = useState("");
  const [status, setStatus] = useState("");
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [installmentOptions, setInstallmentOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const statusOptions = useMemo(
    () => invoiceStatuses.map((s) => ({ label: s, value: s })),
    []
  );

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

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await invoiceService.getInvoices({
        page,
        size: rowsPerPage,
        search: search.trim() || undefined,
        academic_year_id: academicYearId
          ? Number(academicYearId)
          : undefined,
        class_id: classId ? Number(classId) : undefined,
        installment: installment || undefined,
        status: (status || undefined) as InvoiceStatus | undefined,
      });
      const rows = response.items ?? [];
      const sorted = [...rows].sort((a, b) => {
        const dir = sortOrder === "asc" ? 1 : -1;
        if (sortBy === "due_date") {
          return (new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) * dir;
        }
        if (sortBy === "student_name") {
          return a.student_name.localeCompare(b.student_name) * dir;
        }
        return a.invoice_no.localeCompare(b.invoice_no) * dir;
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
    installment,
    page,
    rowsPerPage,
    search,
    sortBy,
    sortOrder,
    status,
  ]);

  const fetchInstallments = useCallback(async () => {
    if (!academicYearId || classes.length === 0) {
      setInstallmentOptions([]);
      return;
    }
    try {
      const optionMap = new Map<string, { label: string; value: string }>();
      const requests = classes.flatMap((schoolClass) => {
        const divisions = schoolClass.divisions ?? [];
        return divisions.map((division) =>
          invoiceApi.getInstallmentOptions({
            academic_year_id: Number(academicYearId),
            class_id: schoolClass.id,
            division_id: division.id,
          })
        );
      });
      const responses = await Promise.all(requests);
      responses.flat().forEach((option) => {
        optionMap.set(option.value, { label: option.label, value: option.value });
      });
      setInstallmentOptions(Array.from(optionMap.values()));
    } catch {
      setInstallmentOptions([]);
    }
  }, [academicYearId, classes]);

  const openInvoiceDetails = useCallback(async (invoiceId: number) => {
    try {
      setDetailsLoading(true);
      setError(null);
      const details = await invoiceService.getInvoiceById(invoiceId);
      setSelectedInvoice(details);
    } catch (err: any) {
      setError(err?.message || "Unable to load invoice details. Please try again.");
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeInvoiceDetails = useCallback(() => {
    setSelectedInvoice(null);
  }, []);

  const handleDeleteClick = useCallback((invoice: InvoiceItem) => {
    setInvoiceToDelete(invoice);
    setConfirmDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setDeleteLoading(false);
    setConfirmDialogOpen(false);
    setInvoiceToDelete(null);
  }, []);

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const onRowsPerPageChange = useCallback((value: number) => {
    setRowsPerPage(value);
    setPage(0);
  }, []);

  const onClassChange = useCallback((value: string) => {
    setClassId(value);
    setPage(0);
  }, []);

  const onInstallmentChange = useCallback((value: string) => {
    setInstallment(value);
    setPage(0);
  }, []);

  useEffect(() => {
    void fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    void fetchInstallments();
  }, [fetchInstallments]);

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
    setAcademicYearId,
    classId,
    setClassId: onClassChange,
    installment,
    setInstallment: onInstallmentChange,
    installmentOptions,
    status,
    setStatus,
    years,
    classes,
    statusOptions,
    fetchInvoices,
    selectedInvoice,
    detailsLoading,
    openInvoiceDetails,
    closeInvoiceDetails,
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
