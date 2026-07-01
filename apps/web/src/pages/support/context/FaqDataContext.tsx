import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { FaqItem } from "../support.types";

type FaqDataContextValue = {
  faqs: FaqItem[];
  setFaqs: React.Dispatch<React.SetStateAction<FaqItem[]>>;
  deleteFaq: (id: string) => void;
};

const FaqDataContext = createContext<FaqDataContextValue | undefined>(undefined);

export function FaqDataProvider({ children }: { children: ReactNode }) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  const value = useMemo<FaqDataContextValue>(
    () => ({
      faqs,
      setFaqs,
      deleteFaq: (id: string) => {
        setFaqs((prev) => prev.filter((faq) => faq.id !== id));
      },
    }),
    [faqs]
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
