import { useCallback, useMemo, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import type { FaqItem } from "../pages/support/support.types";
import { useFaqData } from "../pages/support/context/FaqDataContext";
import { useSupportPermissions } from "./useSupportPermissions";

const MIN_SUGGESTION_CHARS = 5;

export function useFaqListController() {
  const { faqs, deleteFaq } = useFaqData();
  const perms = useSupportPermissions();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FaqItem | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const tenantScopedFaqs = useMemo(() => {
    if (perms.viewAllTenants) return faqs;
    return faqs.filter((f) => f.tenantId === perms.tenantId);
  }, [faqs, perms.viewAllTenants, perms.tenantId]);

  const matchesSearch = useCallback(
    (faq: FaqItem, query: string) => {
      const q = query.toLowerCase();
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.categoryPath.toLowerCase().includes(q) ||
        faq.module.toLowerCase().includes(q) ||
        faq.status.toLowerCase().includes(q)
      );
    },
    []
  );

  const filteredFaqs = useMemo(() => {
    let result = tenantScopedFaqs;
    if (categoryFilter) {
      result = result.filter(
        (f) => f.categoryId === categoryFilter || f.categoryPath.includes(categoryFilter)
      );
    }
    if (statusFilter) {
      result = result.filter((f) => f.status === statusFilter);
    }
    if (search.trim()) {
      result = result.filter((f) => matchesSearch(f, search.trim()));
    }
    return result;
  }, [tenantScopedFaqs, categoryFilter, statusFilter, search, matchesSearch]);

  const suggestions = useMemo(() => {
    const q = search.trim();
    if (q.length < MIN_SUGGESTION_CHARS) return [];
    return tenantScopedFaqs
      .filter((f) => matchesSearch(f, q))
      .slice(0, 8)
      .map((f) => ({ id: f.id, label: f.question }));
  }, [search, tenantScopedFaqs, matchesSearch]);

  const paginatedFaqs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredFaqs.slice(start, start + rowsPerPage);
  }, [filteredFaqs, page, rowsPerPage]);

  const openDeleteConfirm = useCallback((faq: FaqItem) => {
    setFaqToDelete(faq);
    setConfirmDialogOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setConfirmDialogOpen(false);
    setFaqToDelete(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!faqToDelete) return;
    deleteFaq(faqToDelete.id);
    setSnackbar("FAQ deleted successfully.");
    closeDeleteConfirm();
  }, [faqToDelete, deleteFaq, closeDeleteConfirm]);

  return {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredFaqs,
    paginatedFaqs,
    totalRows: filteredFaqs.length,
    suggestions,
    minSuggestionChars: MIN_SUGGESTION_CHARS,
    confirmDialogOpen,
    faqToDelete,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    snackbar,
    setSnackbar,
    perms,
  };
}
