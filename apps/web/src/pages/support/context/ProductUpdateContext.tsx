import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ProductUpdateItem } from "../support.types";

type ProductUpdateContextValue = {
  productUpdates: ProductUpdateItem[];
  setProductUpdates: React.Dispatch<React.SetStateAction<ProductUpdateItem[]>>;
};

const ProductUpdateContext = createContext<ProductUpdateContextValue | undefined>(undefined);

export function ProductUpdateProvider({ children }: { children: ReactNode }) {
  const [productUpdates, setProductUpdates] = useState<ProductUpdateItem[]>([]);

  const value = useMemo<ProductUpdateContextValue>(
    () => ({
      productUpdates,
      setProductUpdates,
    }),
    [productUpdates]
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
