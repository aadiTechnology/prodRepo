import { useCallback, useEffect, useMemo, useState } from "react";
import noticeService from "../api/services/noticeService";
import type { Notice, NoticeDropdownOptionsResponse } from "../types/notice";
import { audienceTypeLabel, noticeStatusLabel, noticeTypeLabel } from "../utils/noticeLabels";

export function useNoticeListController() {
  const [items, setItems] = useState<Notice[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [status, setStatus] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [noticeType, setNoticeType] = useState("");
  const [dropdowns, setDropdowns] = useState<NoticeDropdownOptionsResponse | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void noticeService
      .getDropdownOptions()
      .then((d) => {
        if (!cancelled) setDropdowns(d);
      })
      .catch(() => {
        if (!cancelled) setDropdowns(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await noticeService.list({
        page,
        size: rowsPerPage,
        search: debouncedSearch || undefined,
        status: status || undefined,
        audience_type: audienceType || undefined,
        notice_type: noticeType || undefined,
      });
      setItems(res.items ?? []);
      setTotalRows(res.total ?? 0);
    } catch (err: unknown) {
      setItems([]);
      setTotalRows(0);
      const msg = err instanceof Error ? err.message : "Unable to load notices";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [audienceType, debouncedSearch, noticeType, page, rowsPerPage, status]);

  useEffect(() => {
    void fetchNotices();
  }, [fetchNotices]);

  const statusFilterOptions = useMemo(() => {
    const raw = dropdowns?.status_types ?? [];
    return raw.map((v) => ({ value: v, label: noticeStatusLabel(v) }));
  }, [dropdowns]);

  const audienceFilterOptions = useMemo(() => {
    const raw = dropdowns?.audience_types ?? [];
    return raw.map((v) => ({ value: v, label: audienceTypeLabel(v) }));
  }, [dropdowns]);

  const noticeTypeFilterOptions = useMemo(() => {
    const raw = dropdowns?.notice_types ?? [];
    return raw.map((v) => ({ value: v, label: noticeTypeLabel(v) }));
  }, [dropdowns]);

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const onRowsPerPageChange = useCallback((value: number) => {
    setRowsPerPage(value);
    setPage(0);
  }, []);

  const onStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(0);
  }, []);

  const onAudienceChange = useCallback((value: string) => {
    setAudienceType(value);
    setPage(0);
  }, []);

  const onNoticeTypeChange = useCallback((value: string) => {
    setNoticeType(value);
    setPage(0);
  }, []);

  const openDeleteConfirm = useCallback((row: Notice) => {
    setNoticeToDelete(row);
    setConfirmDialogOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setConfirmDialogOpen(false);
    setNoticeToDelete(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!noticeToDelete) return;
    try {
      setDeleteLoading(true);
      await noticeService.delete(noticeToDelete.id);
      setSnackbar("Notice deleted successfully");
      closeDeleteConfirm();
      await fetchNotices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete notice";
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  }, [closeDeleteConfirm, fetchNotices, noticeToDelete]);

  return {
    items,
    totalRows,
    loading,
    error,
    setError,
    search,
    setSearch: onSearchChange,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage: onRowsPerPageChange,
    status,
    setStatus: onStatusChange,
    audienceType,
    setAudienceType: onAudienceChange,
    noticeType,
    setNoticeType: onNoticeTypeChange,
    statusFilterOptions,
    audienceFilterOptions,
    noticeTypeFilterOptions,
    fetchNotices,
    confirmDialogOpen,
    closeDeleteConfirm,
    noticeToDelete,
    deleteLoading,
    openDeleteConfirm,
    confirmDelete,
    snackbar,
    setSnackbar,
  };
}
