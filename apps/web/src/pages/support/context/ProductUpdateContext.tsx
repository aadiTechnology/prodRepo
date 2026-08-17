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
import type { ProductUpdateItem, ReleaseNoteShowTo } from "../support.types";

type ProductUpdateContextValue = {
  productUpdates: ProductUpdateItem[];
  releaseNotesLoading: boolean;
  refreshReleaseNotes: () => Promise<void>;
  createReleaseNote: (payload: {
    version: string;
    releaseDate: string;
    description: string;
    showTo: ReleaseNoteShowTo;
  }) => Promise<ProductUpdateItem>;
  updateReleaseNote: (
    id: string,
    patch: {
      version?: string;
      releaseDate?: string;
      description?: string;
      showTo?: ReleaseNoteShowTo;
    }
  ) => Promise<ProductUpdateItem>;
  deleteReleaseNote: (id: string) => Promise<void>;
  getProductUpdateById: (id: string) => ProductUpdateItem | undefined;
  fetchReleaseNoteById: (id: string) => Promise<ProductUpdateItem>;
  uploadReleaseNoteAttachment: (id: string, file: File) => Promise<ProductUpdateItem>;
};

const ProductUpdateContext = createContext<ProductUpdateContextValue | undefined>(undefined);

function upsertReleaseNote(
  list: ProductUpdateItem[],
  item: ProductUpdateItem
): ProductUpdateItem[] {
  const index = list.findIndex((note) => note.id === item.id);
  if (index === -1) return [item, ...list];
  const next = [...list];
  next[index] = item;
  return next;
}

export function ProductUpdateProvider({ children }: { children: ReactNode }) {
  const [productUpdates, setProductUpdates] = useState<ProductUpdateItem[]>([]);
  const [releaseNotesLoading, setReleaseNotesLoading] = useState(true);

  const refreshReleaseNotes = useCallback(async () => {
    setReleaseNotesLoading(true);
    try {
      const items = await supportService.listReleaseNotes({ page: 0, size: 100 });
      setProductUpdates(items);
    } finally {
      setReleaseNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshReleaseNotes();
  }, [refreshReleaseNotes]);

  const createReleaseNote = useCallback(
    async (payload: {
      version: string;
      releaseDate: string;
      description: string;
      showTo: ReleaseNoteShowTo;
    }) => {
      const created = await supportService.createReleaseNote({
        version: payload.version,
        release_date: payload.releaseDate,
        description: payload.description,
        show_to: payload.showTo,
      });
      setProductUpdates((prev) => upsertReleaseNote(prev, created));
      return created;
    },
    []
  );

  const updateReleaseNote = useCallback(
    async (
      id: string,
      patch: {
        version?: string;
        releaseDate?: string;
        description?: string;
        showTo?: ReleaseNoteShowTo;
      }
    ) => {
      const updated = await supportService.updateReleaseNote(id, {
        version: patch.version,
        release_date: patch.releaseDate,
        description: patch.description,
        show_to: patch.showTo,
      });
      setProductUpdates((prev) => upsertReleaseNote(prev, updated));
      return updated;
    },
    []
  );

  const deleteReleaseNote = useCallback(async (id: string) => {
    await supportService.deleteReleaseNote(id);
    setProductUpdates((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getProductUpdateById = useCallback(
    (id: string) => productUpdates.find((item) => item.id === id),
    [productUpdates]
  );

  const fetchReleaseNoteById = useCallback(async (id: string) => {
    const item = await supportService.getReleaseNote(id);
    setProductUpdates((prev) => upsertReleaseNote(prev, item));
    return item;
  }, []);

  const uploadReleaseNoteAttachment = useCallback(async (id: string, file: File) => {
    const updated = await supportService.uploadReleaseNoteAttachment(id, file);
    setProductUpdates((prev) => upsertReleaseNote(prev, updated));
    return updated;
  }, []);

  const value = useMemo<ProductUpdateContextValue>(
    () => ({
      productUpdates,
      releaseNotesLoading,
      refreshReleaseNotes,
      createReleaseNote,
      updateReleaseNote,
      deleteReleaseNote,
      getProductUpdateById,
      fetchReleaseNoteById,
      uploadReleaseNoteAttachment,
    }),
    [
      productUpdates,
      releaseNotesLoading,
      refreshReleaseNotes,
      createReleaseNote,
      updateReleaseNote,
      deleteReleaseNote,
      getProductUpdateById,
      fetchReleaseNoteById,
      uploadReleaseNoteAttachment,
    ]
  );

  return (
    <ProductUpdateContext.Provider value={value}>{children}</ProductUpdateContext.Provider>
  );
}

export function useProductUpdates() {
  const ctx = useContext(ProductUpdateContext);
  if (!ctx) {
    throw new Error("useProductUpdates must be used within ProductUpdateProvider");
  }
  return ctx;
}

export function downloadReleaseAttachment(fileName: string, url?: string) {
  if (url && url !== "#") {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
    return;
  }

  const blob = new Blob([`Release note attachment: ${fileName}`], { type: "text/plain" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
