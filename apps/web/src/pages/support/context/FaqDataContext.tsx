import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import supportService from "../../../api/services/supportService";
import type {
  FaqItem,
  SupportCategory,
  SupportCategoryStatus,
  SupportQueryItem,
  SupportQueryStatus,
} from "../support.types";
import {
  getSupportApiErrorMessage,
  loadSupportCategoriesFromStorage,
  nextSupportCategoryId,
  normalizeSupportCategoryName,
  notifySupportUnreadChanged,
  saveSupportCategoriesToStorage,
  SUPPORT_ALL_FILTER_VALUE,
  type SupportFilterOption,
} from "../support.types";

type FaqDataContextValue = {
  faqs: FaqItem[];
  setFaqs: React.Dispatch<React.SetStateAction<FaqItem[]>>;
  deleteFaq: (id: string) => void;
  queries: SupportQueryItem[];
  queriesLoading: boolean;
  queriesError: string | null;
  refreshQueries: () => Promise<void>;
  createQuery: (payload: {
    category: string;
    subject: string;
    description: string;
  }) => Promise<SupportQueryItem>;
  updateQuery: (
    id: string,
    patch: {
      category?: string;
      subject?: string;
      description?: string;
      status?: SupportQueryStatus;
    }
  ) => Promise<SupportQueryItem>;
  deleteQuery: (id: string) => Promise<void>;
  getQueryById: (id: string) => SupportQueryItem | undefined;
  fetchQueryById: (id: string) => Promise<SupportQueryItem>;
  appendQueryMessage: (
    id: string,
    body: string,
    nextStatus?: SupportQueryStatus
  ) => Promise<SupportQueryItem>;
  updateQueryMessage: (queryId: string, messageId: string, body: string) => Promise<SupportQueryItem>;
  deleteQueryMessage: (queryId: string, messageId: string) => Promise<SupportQueryItem>;
  setQueryViewedLocal: (id: string) => void;
  forwardQueryToSuperAdmin: (id: string) => Promise<SupportQueryItem>;
  uploadQueryAttachment: (id: string, file: File) => Promise<SupportQueryItem>;
  categories: SupportCategory[];
  activeCategories: SupportCategory[];
  activeCategoryNames: string[];
  categoryFilterOptions: SupportFilterOption[];
  addSupportCategory: (name: string) => { ok: true } | { ok: false; error: string };
  updateSupportCategory: (
    id: string,
    name: string
  ) => { ok: true } | { ok: false; error: string };
  setSupportCategoryStatus: (id: string, status: SupportCategoryStatus) => void;
  deleteSupportCategory: (id: string) => void;
};

const FaqDataContext = createContext<FaqDataContextValue | undefined>(undefined);

function upsertQuery(list: SupportQueryItem[], item: SupportQueryItem): SupportQueryItem[] {
  const index = list.findIndex((q) => q.id === item.id);
  if (index === -1) return [item, ...list];
  const next = [...list];
  next[index] = item;
  return next;
}

function hasDuplicateCategoryName(
  categories: SupportCategory[],
  name: string,
  excludeId?: string
): boolean {
  const normalized = name.trim().toLowerCase();
  return categories.some(
    (category) =>
      category.id !== excludeId && category.name.trim().toLowerCase() === normalized
  );
}

export function FaqDataProvider({ children }: { children: ReactNode }) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [queries, setQueries] = useState<SupportQueryItem[]>([]);
  const [queriesLoading, setQueriesLoading] = useState(true);
  const [queriesError, setQueriesError] = useState<string | null>(null);
  const [categories, setCategories] = useState<SupportCategory[]>(() =>
    loadSupportCategoriesFromStorage()
  );

  useEffect(() => {
    saveSupportCategoriesToStorage(categories);
  }, [categories]);

  const activeCategories = useMemo(
    () =>
      categories
        .filter((category) => category.status === "Active")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  const activeCategoryNames = useMemo(
    () => activeCategories.map((category) => category.name),
    [activeCategories]
  );

  const categoryFilterOptions = useMemo<SupportFilterOption[]>(
    () => [
      {
        label: "All Categories",
        value: SUPPORT_ALL_FILTER_VALUE,
        testId: "support-query-category-filter-option-all",
      },
      ...activeCategories.map((category) => ({
        label: category.name,
        value: category.name,
        testId: `support-query-category-filter-option-${category.id}`,
      })),
    ],
    [activeCategories]
  );

  const addSupportCategory = useCallback((name: string) => {
    const normalized = normalizeSupportCategoryName(name);
    if (!normalized) {
      return { ok: false as const, error: "Please enter category name." };
    }
    let duplicate = false;
    setCategories((prev) => {
      if (hasDuplicateCategoryName(prev, normalized)) {
        duplicate = true;
        return prev;
      }
      return [
        ...prev,
        {
          id: nextSupportCategoryId(prev),
          name: normalized,
          status: "Active",
        },
      ];
    });
    if (duplicate) {
      return { ok: false as const, error: "Category already exists." };
    }
    return { ok: true as const };
  }, []);

  const updateSupportCategory = useCallback((id: string, name: string) => {
    const normalized = normalizeSupportCategoryName(name);
    if (!normalized) {
      return { ok: false as const, error: "Please enter category name." };
    }
    let duplicate = false;
    setCategories((prev) => {
      if (hasDuplicateCategoryName(prev, normalized, id)) {
        duplicate = true;
        return prev;
      }
      return prev.map((category) =>
        category.id === id ? { ...category, name: normalized } : category
      );
    });
    if (duplicate) {
      return { ok: false as const, error: "Category already exists." };
    }
    return { ok: true as const };
  }, []);

  const setSupportCategoryStatus = useCallback((id: string, status: SupportCategoryStatus) => {
    setCategories((prev) =>
      prev.map((category) => (category.id === id ? { ...category, status } : category))
    );
  }, []);

  const deleteSupportCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((category) => category.id !== id));
  }, []);

  const refreshQueries = useCallback(async () => {
    setQueriesLoading(true);
    setQueriesError(null);
    try {
      const items = await supportService.listQueries({ page: 0, size: 100 });
      setQueries(items);
    } catch (error) {
      setQueriesError(getSupportApiErrorMessage(error, "Failed to load queries."));
    } finally {
      setQueriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshQueries();
  }, [refreshQueries]);

  const deleteFaq = useCallback((id: string) => {
    setFaqs((prev) => prev.filter((faq) => faq.id !== id));
  }, []);

  const createQuery = useCallback(
    async (payload: { category: string; subject: string; description: string }) => {
      const created = await supportService.createQuery(payload);
      setQueries((prev) => upsertQuery(prev, created));
      notifySupportUnreadChanged();
      return created;
    },
    []
  );

  const updateQuery = useCallback(
    async (
      id: string,
      patch: {
        category?: string;
        subject?: string;
        description?: string;
        status?: SupportQueryStatus;
      }
    ) => {
      const updated = await supportService.updateQuery(id, patch);
      setQueries((prev) => upsertQuery(prev, updated));
      notifySupportUnreadChanged();
      return updated;
    },
    []
  );

  const deleteQuery = useCallback(async (id: string) => {
    await supportService.deleteQuery(id);
    setQueries((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const getQueryById = useCallback(
    (id: string) => queries.find((q) => q.id === id),
    [queries]
  );

  const fetchQueryById = useCallback(async (id: string) => {
    const item = await supportService.getQuery(id);
    setQueries((prev) => upsertQuery(prev, item));
    return item;
  }, []);

  const appendQueryMessage = useCallback(
    async (id: string, body: string, nextStatus?: SupportQueryStatus) => {
      const updated = await supportService.addQueryMessage(id, body, nextStatus);
      setQueries((prev) => upsertQuery(prev, updated));
      notifySupportUnreadChanged();
      return updated;
    },
    []
  );

  const updateQueryMessage = useCallback(
    async (queryId: string, messageId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) {
        throw new Error("Message body is required.");
      }
      const updated = await supportService.updateQueryMessage(queryId, messageId, trimmed);
      setQueries((prev) => upsertQuery(prev, updated));
      notifySupportUnreadChanged();
      return updated;
    },
    []
  );

  const deleteQueryMessage = useCallback(async (queryId: string, messageId: string) => {
    const updated = await supportService.deleteQueryMessage(queryId, messageId);
    setQueries((prev) => upsertQuery(prev, updated));
    notifySupportUnreadChanged();
    return updated;
  }, []);

  const setQueryViewedLocal = useCallback((id: string) => {
    setQueries((prev) =>
      prev.map((query) => (query.id === id ? { ...query, isViewed: true } : query))
    );
  }, []);

  const forwardQueryToSuperAdmin = useCallback(async (id: string) => {
    const updated = await supportService.forwardQuery(id);
    setQueries((prev) => upsertQuery(prev, updated));
    notifySupportUnreadChanged();
    return updated;
  }, []);

  const uploadQueryAttachment = useCallback(async (id: string, file: File) => {
    const updated = await supportService.uploadQueryAttachment(id, file);
    setQueries((prev) => upsertQuery(prev, updated));
    return updated;
  }, []);

  const value = useMemo<FaqDataContextValue>(
    () => ({
      faqs,
      setFaqs,
      deleteFaq,
      queries,
      queriesLoading,
      queriesError,
      refreshQueries,
      createQuery,
      updateQuery,
      deleteQuery,
      getQueryById,
      fetchQueryById,
      appendQueryMessage,
      updateQueryMessage,
      deleteQueryMessage,
      setQueryViewedLocal,
      forwardQueryToSuperAdmin,
      uploadQueryAttachment,
      categories,
      activeCategories,
      activeCategoryNames,
      categoryFilterOptions,
      addSupportCategory,
      updateSupportCategory,
      setSupportCategoryStatus,
      deleteSupportCategory,
    }),
    [
      faqs,
      deleteFaq,
      queries,
      queriesLoading,
      queriesError,
      refreshQueries,
      createQuery,
      updateQuery,
      deleteQuery,
      getQueryById,
      fetchQueryById,
      appendQueryMessage,
      updateQueryMessage,
      deleteQueryMessage,
      setQueryViewedLocal,
      forwardQueryToSuperAdmin,
      uploadQueryAttachment,
      categories,
      activeCategories,
      activeCategoryNames,
      categoryFilterOptions,
      addSupportCategory,
      updateSupportCategory,
      setSupportCategoryStatus,
      deleteSupportCategory,
    ]
  );

  return <FaqDataContext.Provider value={value}>{children}</FaqDataContext.Provider>;
}

export function useFaqData() {
  const ctx = useContext(FaqDataContext);
  if (!ctx) {
    throw new Error("useFaqData must be used within FaqDataProvider");
  }
  return ctx;
}
