import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import feesApi, {
  type AcademicYearOption,
  type FeeDueListItem,
} from "../api/services/feesApi";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";

export type FeeDueTableRow = FeeDueListItem & { __skeleton?: boolean; __key: string };

export type UseFeeDueListControllerResult = {
  search: string;
  setSearch: (value: string) => void;
  classId: string;
  setClassId: (value: string) => void;
  installment: string;
  setInstallment: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  academicYearId: number | null;
  setAcademicYearId: (value: number) => void;
  academicYears: AcademicYearOption[];
  classes: Array<{ id: number; name: string }>;
  installmentOptions: string[];
  total: number;
  rows: FeeDueTableRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

async function collectDueListRows(
  academicYearId: number,
  classId: string,
  pageSize = 100
) {
  const rows: FeeDueListItem[] = [];
  let page = 1;
  let total = 0;

  do {
    const response = await feesApi.getDueListV2({
      academic_year_id: academicYearId,
      class_id: classId ? Number(classId) : undefined,
      page,
      page_size: pageSize,
    });
    total = response.total ?? 0;
    rows.push(...(response.data ?? []));
    page += 1;
  } while (rows.length < total && page <= Math.max(1, Math.ceil(total / pageSize)));

  return rows;
}

export function useFeeDueListController(): UseFeeDueListControllerResult {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [classId, setClassIdState] = useState<string>("");
  const [installment, setInstallmentState] = useState<string>("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [academicYearId, setAcademicYearIdState] = useState<number | null>(null);

  const setClassId = useCallback((value: string) => {
    setClassIdState(value);
    setInstallmentState("");
  }, []);

  const setInstallment = useCallback((value: string) => {
    setInstallmentState(value);
  }, []);

  const setAcademicYearId = useCallback((value: number) => {
    setAcademicYearIdState(value);
    setClassIdState("");
    setInstallmentState("");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, classId, installment, academicYearId]);

  const { data: academicYears = [] } = useQuery({
    queryKey: ["fee-due-list-v2", "academic-years"],
    queryFn: feesApi.getAcademicYears,
  });

  useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      const currentYearId = resolveCurrentAcademicYearId(academicYears);
      setAcademicYearIdState(currentYearId ? Number(currentYearId) : academicYears[0].id);
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
        page: page + 1,
        page_size: rowsPerPage,
      }),
    enabled: !!academicYearId,
    placeholderData: keepPreviousData,
  });

  const installmentQuery = useQuery({
    queryKey: ["fee-due-list-v2", "installments", academicYearId, classId],
    queryFn: async () => {
      if (!academicYearId) return [];
      const rows = await collectDueListRows(academicYearId, classId);
      return Array.from(new Set(rows.map((item) => item.installment).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      );
    },
    enabled: !!academicYearId,
  });

  const installmentOptions = installmentQuery.data ?? [];

  useEffect(() => {
    if (!classId) return;
    if (!classes.some((item) => String(item.id) === classId)) {
      setClassIdState("");
      setInstallmentState("");
    }
  }, [classes, classId]);

  useEffect(() => {
    if (!installment) return;
    if (!installmentOptions.includes(installment)) {
      setInstallmentState("");
    }
  }, [installmentOptions, installment]);

  const records = dueListQuery.data?.data ?? [];
  const total = dueListQuery.data?.total ?? 0;

  const rows: FeeDueTableRow[] = records.map((row, idx) => ({
    ...row,
    __key: `${row.student_id}-${idx}`,
  }));

  const error = dueListQuery.isError ? "Failed to load data" : null;

  return {
    search,
    setSearch,
    classId,
    setClassId,
    installment,
    setInstallment,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    academicYearId,
    setAcademicYearId,
    academicYears,
    classes,
    installmentOptions,
    total,
    rows,
    loading: dueListQuery.isLoading,
    error,
    refetch: () => {
      void dueListQuery.refetch();
    },
  };
}
