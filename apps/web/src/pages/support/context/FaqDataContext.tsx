import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { FaqItem, SupportQueryItem, SupportQueryStatus } from "../support.types";

const INITIAL_QUERIES: SupportQueryItem[] = [
  {
    id: "QRY-001",
    category: "Technical Issue",
    subject: "Attendance configuration issue",
    description:
      "Unable to save attendance configuration changes for Nursery section. The Save button remains disabled after selecting statuses.",
    attachmentName: "attendance-config-screenshot.png",
    createdBy: "Super Admin",
    createdByRole: "SUPER_ADMIN",
    createdAt: "2026-08-01T09:15:00",
    status: "Open",
    messages: [
      {
        id: "msg-001-1",
        author: "Super Admin",
        authorRole: "SUPER_ADMIN",
        body: "Raised after noticing Save is disabled on Attendance Configuration.",
        createdAt: "2026-08-01T09:15:00",
      },
    ],
  },
  {
    id: "QRY-002",
    category: "Student Related",
    subject: "Student attendance issue",
    description:
      "Student roll numbers are missing for Class A when generating the weekly attendance summary.",
    createdBy: "Admin",
    createdByRole: "ADMIN",
    createdAt: "2026-08-02T11:30:00",
    status: "In Progress",
    messages: [
      {
        id: "msg-002-1",
        author: "Admin",
        authorRole: "ADMIN",
        body: "Parents reported blank roll numbers on the weekly summary PDF.",
        createdAt: "2026-08-02T11:30:00",
      },
    ],
  },
  {
    id: "QRY-003",
    category: "Attendance",
    subject: "Unable to mark attendance",
    description:
      "Teacher attendance marking page shows an empty student list for Grade 1 - Section B.",
    createdBy: "Teacher",
    createdByRole: "TEACHER",
    createdAt: "2026-08-03T08:45:00",
    status: "Resolved",
    messages: [
      {
        id: "msg-003-1",
        author: "Teacher",
        authorRole: "TEACHER",
        body: "No students appear when I open Teacher Attendance for Grade 1B.",
        createdAt: "2026-08-03T08:45:00",
      },
    ],
  },
  {
    id: "QRY-004",
    category: "Fees",
    subject: "Term fee balance clarification",
    description:
      "Student needs clarification on the outstanding Term 2 fee balance shown on the portal.",
    createdBy: "Student",
    createdByRole: "STUDENT",
    createdAt: "2026-08-04T17:10:00",
    status: "Open",
    messages: [
      {
        id: "msg-004-1",
        author: "Student",
        authorRole: "STUDENT",
        body: "The portal shows a different balance than the receipt I received.",
        createdAt: "2026-08-04T17:10:00",
      },
    ],
  },
  {
    id: "QRY-005",
    category: "Fees",
    subject: "Fee receipt not downloading",
    description:
      "Student portal shows an error when downloading the latest fee receipt for Term 1.",
    createdBy: "Student",
    createdByRole: "STUDENT",
    createdAt: "2026-08-06T10:20:00",
    status: "Open",
    messages: [
      {
        id: "msg-005-1",
        author: "Student",
        authorRole: "STUDENT",
        body: "Clicking Download Receipt fails with a blank page.",
        createdAt: "2026-08-06T10:20:00",
      },
    ],
  },
];

type FaqDataContextValue = {
  faqs: FaqItem[];
  setFaqs: React.Dispatch<React.SetStateAction<FaqItem[]>>;
  deleteFaq: (id: string) => void;
  queries: SupportQueryItem[];
  addQuery: (query: SupportQueryItem) => void;
  updateQuery: (id: string, patch: Partial<SupportQueryItem>) => void;
  deleteQuery: (id: string) => void;
  getQueryById: (id: string) => SupportQueryItem | undefined;
  appendQueryMessage: (
    id: string,
    message: SupportQueryItem["messages"][number],
    nextStatus?: SupportQueryStatus
  ) => void;
  forwardQueryToSuperAdmin: (id: string, forwardedBy: string) => void;
};

const FaqDataContext = createContext<FaqDataContextValue | undefined>(undefined);

export function FaqDataProvider({ children }: { children: ReactNode }) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [queries, setQueries] = useState<SupportQueryItem[]>(INITIAL_QUERIES);

  const deleteFaq = useCallback((id: string) => {
    setFaqs((prev) => prev.filter((faq) => faq.id !== id));
  }, []);

  const addQuery = useCallback((query: SupportQueryItem) => {
    setQueries((prev) => [query, ...prev]);
  }, []);

  const updateQuery = useCallback((id: string, patch: Partial<SupportQueryItem>) => {
    setQueries((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const deleteQuery = useCallback((id: string) => {
    setQueries((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const getQueryById = useCallback(
    (id: string) => queries.find((q) => q.id === id),
    [queries]
  );

  const appendQueryMessage = useCallback(
    (
      id: string,
      message: SupportQueryItem["messages"][number],
      nextStatus?: SupportQueryStatus
    ) => {
      setQueries((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                messages: [...q.messages, message],
                status: nextStatus ?? q.status,
              }
            : q
        )
      );
    },
    []
  );

  const forwardQueryToSuperAdmin = useCallback((id: string, forwardedBy: string) => {
    const forwardedAt = new Date().toISOString();
    setQueries((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              forwardedToSuperAdmin: true,
              forwardedBy,
              forwardedAt,
              status: q.status === "Closed" ? q.status : "In Progress",
              messages: [
                ...q.messages,
                {
                  id: `${id}-fwd-${Date.now()}`,
                  author: forwardedBy,
                  authorRole: "ADMIN",
                  body: "Forwarded this Student query to Super Admin for further assistance.",
                  createdAt: forwardedAt,
                },
              ],
            }
          : q
      )
    );
  }, []);

  const value = useMemo<FaqDataContextValue>(
    () => ({
      faqs,
      setFaqs,
      deleteFaq,
      queries,
      addQuery,
      updateQuery,
      deleteQuery,
      getQueryById,
      appendQueryMessage,
      forwardQueryToSuperAdmin,
    }),
    [
      faqs,
      deleteFaq,
      queries,
      addQuery,
      updateQuery,
      deleteQuery,
      getQueryById,
      appendQueryMessage,
      forwardQueryToSuperAdmin,
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
