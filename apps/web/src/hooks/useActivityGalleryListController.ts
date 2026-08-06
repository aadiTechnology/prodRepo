import { useCallback, useEffect, useRef, useState } from "react";
import activityGalleryService from "../api/services/activityGalleryService";
import type { ActivityGalleryListItem, GalleryType } from "../types/activityGallery";

export const GALLERY_LIST_ROWS_PER_PAGE = 20;
export const GALLERY_LIST_ROWS_PER_PAGE_OPTIONS = [20, 40, 60];

const UNAUTHORIZED_GALLERY_MESSAGE = "You are not authorized for this activity.";

function galleryActionErrorMessage(err: unknown, fallback: string): string {
  const obj = err && typeof err === "object" ? (err as {
    message?: unknown;
    response?: { status?: number; data?: { detail?: unknown } };
  }) : null;
  const detail = obj?.response?.data?.detail;
  const fromDetail = typeof detail === "string" ? detail.trim() : "";
  const fromMessage = typeof obj?.message === "string" ? obj.message.trim() : "";
  const raw = fromDetail || fromMessage;
  if (obj?.response?.status === 403 || /^not authorized$/i.test(raw)) {
    return UNAUTHORIZED_GALLERY_MESSAGE;
  }
  return raw || fallback;
}

export function useActivityGalleryListController(galleryType: GalleryType) {
  const [items, setItems] = useState<ActivityGalleryListItem[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(GALLERY_LIST_ROWS_PER_PAGE);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [galleryToDelete, setGalleryToDelete] = useState<ActivityGalleryListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  const hasLoadedOnceRef = useRef(false);
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [galleryType, debouncedSearch]);

  const fetchGalleries = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    const showBlockingLoader = !hasLoadedOnceRef.current;

    try {
      if (showBlockingLoader) setLoading(true);
      setError(null);

      const res = await activityGalleryService.list({
        page,
        size: rowsPerPage,
        search: debouncedSearch || undefined,
        gallery_type: galleryType,
      });

      if (generation !== fetchGenerationRef.current) return;

      setItems(res.data ?? []);
      setTotalRows(res.total ?? 0);
      hasLoadedOnceRef.current = true;
    } catch (err: unknown) {
      if (generation !== fetchGenerationRef.current) return;
      if (!hasLoadedOnceRef.current) setItems([]);
      const msg = err instanceof Error ? err.message : "Unable to load gallery records.";
      setError(msg);
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, galleryType, page, rowsPerPage]);

  useEffect(() => {
    void fetchGalleries();
  }, [fetchGalleries]);

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

  const openDeleteConfirm = useCallback((row: ActivityGalleryListItem) => {
    setGalleryToDelete(row);
    setConfirmDialogOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setConfirmDialogOpen(false);
    setGalleryToDelete(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!galleryToDelete) return;
    try {
      setDeleteLoading(true);
      await activityGalleryService.delete(galleryToDelete.id);
      setSnackbar({ message: "Gallery deleted successfully.", variant: "success" });
      closeDeleteConfirm();
      await fetchGalleries();
    } catch (err: unknown) {
      setSnackbar({
        message: galleryActionErrorMessage(err, "Failed to delete gallery"),
        variant: "error",
      });
      closeDeleteConfirm();
    } finally {
      setDeleteLoading(false);
    }
  }, [closeDeleteConfirm, fetchGalleries, galleryToDelete]);

  const tableLoading = loading && items.length === 0;

  return {
    items,
    totalRows,
    loading,
    tableLoading,
    error,
    search,
    setSearch: onSearchChange,
    page,
    setPage: handlePageChange,
    rowsPerPage,
    setRowsPerPage: handleRowsPerPageChange,
    fetchGalleries,
    confirmDialogOpen,
    closeDeleteConfirm,
    galleryToDelete,
    deleteLoading,
    openDeleteConfirm,
    confirmDelete,
    snackbar,
    setSnackbar,
  };
}
