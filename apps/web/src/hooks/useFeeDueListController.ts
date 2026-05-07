import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import feesApi, { type FeeDueListItem, type FeeDueStatusFilter } from "../api/services/feesApi";

export type FeeDueTableRow = FeeDueListItem & { __skeleton?: boolean; __key: string };

type Summary = { total_due: number; overdue_students: number };

export type UseFeeDueListControllerResult = {
  search: string;
  setSearch: (value: string) => void;
  classId: string;
  setClassId: (value: string) => void;
  installment: string;
  setInstallment: (value: string) => void;
  status: FeeDueStatusFilter;
  setStatus: (value: FeeDueStatusFilter) => void;
  page: number;
  setPage: (value: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  academicYearId: number | null;
  classes: Array<{ id: number; name: string }>;
  installmentOptions: string[];
  summary: Summary;
  total: number;
  rows: FeeDueTableRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useFeeDueListController(): UseFeeDueListControllerResult {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [classId, setClassId] = useState<string>("");
  const [installment, setInstallment] = useState<string>("");
  const [status, setStatus] = useState<FeeDueStatusFilter>("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, classId, installment, status, academicYearId]);

  const { data: academicYears = [] } = useQuery({
    queryKey: ["fee-due-list-v2", "academic-years"],
    queryFn: feesApi.getAcademicYears,
  });

  useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      setAcademicYearId(academicYears[0].id);
    }
  }, [academicYearId, academicYears]);

  const { data: classes = [] } = useQuery({
    queryKey: ["fee-due-list-v2", "classes", academicYearId],
    queryFn: () => feesApi.getClasses(academicYearId ?? undefined),
    enabled: !!academicYearId,
  });

  const dueListQuery = useQuery({
    queryKey: [
      "fee-due-list-v2",
      academicYearId,
      classId,
      installment,
      status,
      debouncedSearch,
      page,
      rowsPerPage,
    ],
    queryFn: () =>
      feesApi.getDueListV2({
        academic_year_id: Number(academicYearId),
        class_id: classId ? Number(classId) : undefined,
        installment: installment || undefined,
        search: debouncedSearch || undefined,
        status,
        page: page + 1,
        page_size: rowsPerPage,
      }),
    enabled: !!academicYearId,
    placeholderData: keepPreviousData,
  });

  const installmentQuery = useQuery({
    queryKey: ["fee-due-list-v2", "installments", academicYearId, classId],
    queryFn: async () => {
      const response = await feesApi.getDueListV2({
        academic_year_id: Number(academicYearId),
        class_id: classId ? Number(classId) : undefined,
        page: 1,
        page_size: 100,
      });
      return Array.from(new Set((response.data ?? []).map((item) => item.installment).filter(Boolean)));
    },
    enabled: !!academicYearId,
  });

  const summary = dueListQuery.data?.summary ?? { total_due: 0, overdue_students: 0 };
  const records = dueListQuery.data?.data ?? [];
  const total = dueListQuery.data?.total ?? 0;

  const rows: FeeDueTableRow[] = records.map((row, idx) => ({ ...row, __key: `${row.student_id}-${idx}` }));

  const error = dueListQuery.isError ? "Failed to load data" : null;

  return {
    search,
    setSearch,
    classId,
    setClassId,
    installment,
    setInstallment,
    status,
    setStatus,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    academicYearId,
    classes,
    installmentOptions: installmentQuery.data ?? [],
    summary,
    total,
    rows,
    loading: dueListQuery.isLoading,
    error,
    refetch: () => {
      void dueListQuery.refetch();
    },
  };
}
