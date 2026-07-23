import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import noticeService from "../api/services/noticeService";
import type {
  Notice,
  NoticeAudienceType,
  NoticeDropdownOptionsResponse,
  NoticeStatus,
  NoticeType,
} from "../types/notice";
import { audienceTypeLabel, noticeStatusLabel, noticeTypeLabel } from "../utils/noticeLabels";
import { useNoticePermissions } from "./useNoticePermissions";
import { notifyNoticeCountChanged } from "../utils/noticeCountEvents";

const STATIC_STATUS_VALUES = ["DRAFT", "PUBLISHED", "UNPUBLISHED", "EXPIRED"] as const satisfies readonly NoticeStatus[];

const STATIC_AUDIENCE_VALUES = ["ALL", "STUDENT", "TEACHER", "ADMIN"] as const satisfies readonly NoticeAudienceType[];

const STATIC_NOTICE_TYPE_VALUES = ["GENERAL", "FEE", "EVENT", "HOLIDAY", "EXAM"] as const satisfies readonly NoticeType[];

const FETCH_PAGE_SIZE = 100;

export function useNoticeListController() {
  const { readOnlyAudience, canEdit, canCreate, isTeacherUser } = useNoticePermissions();
  const canUseAdminFilters = canEdit || canCreate;

  const [allItems, setAllItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [status, setStatus] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [noticeType, setNoticeType] = useState("");
  const [dropdowns, setDropdowns] = useState<NoticeDropdownOptionsResponse | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const hasLoadedOnceRef = useRef(false);
  const fetchGenerationRef = useRef(0);

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

  const listQueryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: canUseAdminFilters && status ? status : undefined,
      audience_type: canUseAdminFilters && !readOnlyAudience && audienceType ? audienceType : undefined,
      notice_type: noticeType || undefined,
    }),
    [audienceType, canUseAdminFilters, debouncedSearch, noticeType, readOnlyAudience, status]
  );

  const fetchNotices = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    const showBlockingLoader = !hasLoadedOnceRef.current;

    try {
      if (showBlockingLoader) setLoading(true);
      setError(null);

      let pageIndex = 0;
      let fetched: Notice[] = [];
      let total = 0;

      do {
        const res = await noticeService.list({
          ...listQueryParams,
          page: pageIndex,
          size: FETCH_PAGE_SIZE,
        });
        if (generation !== fetchGenerationRef.current) return;

        fetched = [...fetched, ...(res.items ?? [])];
        total = res.total ?? fetched.length;
        pageIndex += 1;
      } while (fetched.length < total);

      setAllItems(fetched);
      hasLoadedOnceRef.current = true;
    } catch (err: unknown) {
      if (generation !== fetchGenerationRef.current) return;

      if (!hasLoadedOnceRef.current) {
        setAllItems([]);
      }
      const msg = err instanceof Error ? err.message : "Unable to load notices";
      setError(msg);
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [listQueryParams]);

  useEffect(() => {
    void fetchNotices();
  }, [fetchNotices]);

  // Keep Communication sidebar badge aligned with list filters (instant).
  useEffect(() => {
    notifyNoticeCountChanged({
      audienceType: audienceType || null,
      noticeType: noticeType || null,
      status: status || null,
    });
  }, [audienceType, noticeType, status]);

  // Leaving Notice List restores full role-scoped badge.
  useEffect(() => {
    return () => {
      notifyNoticeCountChanged({});
    };
  }, []);

  const statusFilterOptions = useMemo(() => {
    const raw = dropdowns?.status_types ?? [];
    const source: readonly NoticeStatus[] = raw.length > 0 ? raw : STATIC_STATUS_VALUES;
    return source.map((v) => ({ value: v, label: noticeStatusLabel(v) }));
  }, [dropdowns]);

  const audienceFilterOptions = useMemo(() => {
    const raw = dropdowns?.audience_types ?? [];
    const source: readonly NoticeAudienceType[] = raw.length > 0 ? raw : STATIC_AUDIENCE_VALUES;
    const visibleSource = isTeacherUser
      ? source.filter((v) => v === "TEACHER" || v === "STUDENT")
      : source;
    return visibleSource.map((v) => ({ value: v, label: audienceTypeLabel(v) }));
  }, [dropdowns, isTeacherUser]);

  const noticeTypeFilterOptions = useMemo(() => {
    const raw = dropdowns?.notice_types ?? [];
    const source: readonly NoticeType[] = raw.length > 0 ? raw : STATIC_NOTICE_TYPE_VALUES;
    return source.map((v) => ({ value: v, label: noticeTypeLabel(v) }));
  }, [dropdowns]);

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  const filteredItems = useMemo(() => {
    if (!canUseAdminFilters || !status) {
      return allItems;
    }
    const normalizedStatus = status.toUpperCase() as NoticeStatus;
    return allItems.filter((item) => item.status === normalizedStatus);
  }, [allItems, canUseAdminFilters, status]);

  const totalRows = filteredItems.length;

  const paginatedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredItems.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredItems.length, page, rowsPerPage]);

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
      notifyNoticeCountChanged({
        audienceType: audienceType || null,
        noticeType: noticeType || null,
        status: status || null,
      });
      setSnackbar("Notice deleted successfully.");
      closeDeleteConfirm();
      await fetchNotices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete notice";
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  }, [audienceType, closeDeleteConfirm, fetchNotices, noticeToDelete, noticeType, status]);

  const tableLoading = loading && allItems.length === 0;

  return {
    items: paginatedItems,
    totalRows,
    loading,
    tableLoading,
    error,
    setError,
    search,
    setSearch: onSearchChange,
    page,
    setPage: handlePageChange,
    rowsPerPage,
    setRowsPerPage: handleRowsPerPageChange,
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
    readOnlyAudience,
    canUseAdminFilters,
  };
}
