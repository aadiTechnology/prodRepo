import { useState, useCallback, useEffect } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import leadService from "../api/services/leadService";
import academicYearService from "../api/services/academicYearService";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";
import type { Lead, LeadSource, LeadStatus } from "../types/lead";

export function useLeadListController() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [totalLeads, setTotalLeads] = useState(0);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("");

  // Dropdown options
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [academicYearFilterOptions, setAcademicYearFilterOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [academicYearReady, setAcademicYearReady] = useState(false);

  // Delete confirm
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load dropdown options once
  useEffect(() => {
    leadService.getStatuses().then(setStatuses).catch(() => {});
    leadService.getSources().then(setSources).catch(() => {});
    academicYearService
      .listActive()
      .then((years) => {
        setAcademicYearFilterOptions(
          years.map((y) => ({ label: y.name, value: String(y.id) }))
        );
        const currentYearId = resolveCurrentAcademicYearId(years);
        setAcademicYearFilter((prev) => prev || currentYearId);
        setAcademicYearReady(true);
      })
      .catch(() => {
        setAcademicYearFilterOptions([]);
        setAcademicYearReady(true);
      });
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leadService.list({
        search: search || undefined,
        status_id: statusFilter ? Number(statusFilter) : undefined,
        source_id: sourceFilter ? Number(sourceFilter) : undefined,
        academic_year_id: academicYearFilter ? Number(academicYearFilter) : undefined,
        page: page + 1,
        page_size: rowsPerPage,
      });
      setLeads(data.data || []);
      setTotalLeads(data.total);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch leads.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sourceFilter, academicYearFilter, page, rowsPerPage]);

  useEffect(() => {
    if (!academicYearReady) return;
    const timer = setTimeout(() => {
      fetchLeads();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchLeads, academicYearReady]);

  const handleDeleteClick = (lead: Lead) => {
    setLeadToDelete(lead);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    try {
      setDeleteLoading(true);
      await leadService.delete(leadToDelete.id);
      setConfirmDialogOpen(false);
      setLeadToDelete(null);
      setSnackbar("Lead deleted successfully");
      fetchLeads();
    } catch (err: any) {
      setError(err?.message || "Failed to delete lead.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusFilterOptions = statuses.map((s) => ({
    label: s.name,
    value: String(s.id),
  }));

  const sourceFilterOptions = sources.map((s) => ({
    label: s.name,
    value: String(s.id),
  }));

  return {
    leads,
    loading,
    error,
    totalLeads,
    page,
    rowsPerPage,
    search,
    setSearch,
    setPage,
    setRowsPerPage,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    academicYearFilter,
    setAcademicYearFilter,
    academicYearFilterOptions,
    statuses,
    sources,
    statusFilterOptions,
    sourceFilterOptions,
    snackbar,
    setSnackbar,
    confirmDialogOpen,
    leadToDelete,
    deleteLoading,
    setConfirmDialogOpen,
    handleDeleteClick,
    handleConfirmDelete,
    fetchLeads,
  };
}
