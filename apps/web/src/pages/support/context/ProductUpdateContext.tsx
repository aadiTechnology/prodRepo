import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ProductUpdateItem } from "../support.types";

const INITIAL_RELEASE_NOTES: ProductUpdateItem[] = [
  {
    id: "RN-001",
    title: "Attendance configuration improvements",
    version: "2.4.0",
    releaseDate: "2026-08-01",
    description: "Adds multi-status attendance marking and improved configuration validation.",
    status: "Done",
    attachmentName: "release-notes-2.4.0.pdf",
    attachmentType: "pdf",
    attachmentUrl: "#",
    createdBy: "Super Admin",
    modifiedBy: "Super Admin",
    modifiedDate: "2026-08-01",
    showTo: { admin: true, teacher: true, student: false },
  },
  {
    id: "RN-002",
    title: "Parent dashboard attendance visibility",
    version: "2.3.1",
    releaseDate: "2026-07-15",
    description: "Fixes delayed attendance visibility for parent users.",
    status: "Done",
    attachmentName: "release-notes-2.3.1.pdf",
    attachmentType: "pdf",
    attachmentUrl: "#",
    createdBy: "Super Admin",
    modifiedBy: "Admin",
    modifiedDate: "2026-07-15",
    showTo: { admin: true, teacher: false, student: true },
  },
];

type ProductUpdateContextValue = {
  productUpdates: ProductUpdateItem[];
  setProductUpdates: React.Dispatch<React.SetStateAction<ProductUpdateItem[]>>;
  addProductUpdate: (item: ProductUpdateItem) => void;
  updateProductUpdate: (id: string, patch: Partial<ProductUpdateItem>) => void;
  deleteProductUpdate: (id: string) => void;
  getProductUpdateById: (id: string) => ProductUpdateItem | undefined;
};

const ProductUpdateContext = createContext<ProductUpdateContextValue | undefined>(undefined);

export function ProductUpdateProvider({ children }: { children: ReactNode }) {
  const [productUpdates, setProductUpdates] = useState<ProductUpdateItem[]>(INITIAL_RELEASE_NOTES);

  const addProductUpdate = useCallback((item: ProductUpdateItem) => {
    setProductUpdates((prev) => [item, ...prev]);
  }, []);

  const updateProductUpdate = useCallback((id: string, patch: Partial<ProductUpdateItem>) => {
    setProductUpdates((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const deleteProductUpdate = useCallback((id: string) => {
    setProductUpdates((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getProductUpdateById = useCallback(
    (id: string) => productUpdates.find((item) => item.id === id),
    [productUpdates]
  );

  const value = useMemo<ProductUpdateContextValue>(
    () => ({
      productUpdates,
      setProductUpdates,
      addProductUpdate,
      updateProductUpdate,
      deleteProductUpdate,
      getProductUpdateById,
    }),
    [
      productUpdates,
      addProductUpdate,
      updateProductUpdate,
      deleteProductUpdate,
      getProductUpdateById,
    ]
  );

  return <ProductUpdateContext.Provider value={value}>{children}</ProductUpdateContext.Provider>;
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
