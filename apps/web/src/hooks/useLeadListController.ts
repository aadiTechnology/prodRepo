import { useState, useCallback, useEffect } from "react";
import leadService from "../api/services/leadService";
import type { Lead, LeadSource, LeadStatus } from "../types/lead";

export function useLeadListController() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLeads, setTotalLeads] = useState(0);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");

  // Dropdown options
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);

  // Delete confirm
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load dropdown options once
  useEffect(() => {
    leadService.getStatuses().then(setStatuses).catch(() => {});
    leadService.getSources().then(setSources).catch(() => {});
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leadService.list({
        search: search || undefined,
        status_id: statusFilter ? Number(statusFilter) : undefined,
        source_id: sourceFilter ? Number(sourceFilter) : undefined,
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
  }, [search, statusFilter, sourceFilter, page, rowsPerPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

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
