import { useCallback, useEffect, useRef, useState } from "react";
import activityGalleryService from "../api/services/activityGalleryService";
import type { ActivityGalleryListItem, GalleryType } from "../types/activityGallery";

/** Gallery list starts at 21 (defect: page initiation should not default to ≤20). */
export const GALLERY_LIST_ROWS_PER_PAGE = 21;
export const GALLERY_LIST_ROWS_PER_PAGE_OPTIONS = [21, 25, 50];

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
  const [snackbar, setSnackbar] = useState<string | null>(null);

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
      setSnackbar("Gallery deleted successfully.");
      closeDeleteConfirm();
      await fetchGalleries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete gallery";
      setError(msg);
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
