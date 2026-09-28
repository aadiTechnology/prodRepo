import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../utils/listPagination";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import feesApi, {
  type AcademicYearOption,
  type FeeDueListItem,
  type FeeDueStatusFilter,
} from "../api/services/feesApi";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";

export type FeeDueTableRow = FeeDueListItem & { __skeleton?: boolean; __key: string };

const FEE_DUE_STATUS_OPTIONS: { label: string; value: FeeDueStatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Due", value: "DUE" },
  { label: "Overdue", value: "OVERDUE" },
];

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
  setAcademicYearId: (value: number) => void;
  academicYears: AcademicYearOption[];
  classes: Array<{ id: number; name: string }>;
  installmentOptions: string[];
  statusOptions: { label: string; value: FeeDueStatusFilter }[];
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
      status: "ALL",
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
  const [status, setStatusState] = useState<FeeDueStatusFilter>("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [academicYearId, setAcademicYearIdState] = useState<number | null>(null);

  const setClassId = useCallback((value: string) => {
    setClassIdState(value);
    setInstallmentState("");
    setStatusState("ALL");
  }, []);

  const setInstallment = useCallback((value: string) => {
    setInstallmentState(value);
  }, []);

  const setStatus = useCallback((value: FeeDueStatusFilter) => {
    setStatusState(value);
  }, []);

  const setAcademicYearId = useCallback((value: number) => {
    setAcademicYearIdState(value);
    setClassIdState("");
    setInstallmentState("");
    setStatusState("ALL");
  }, []);

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
      if (!academicYearId) return [];
      const rows = await collectDueListRows(academicYearId, classId);
      return Array.from(new Set(rows.map((item) => item.installment).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      );
    },
    enabled: !!academicYearId,
  });

  const statusOptionsQuery = useQuery({
    queryKey: ["fee-due-list-v2", "statuses", academicYearId, classId],
    queryFn: async () => {
      if (!academicYearId) return FEE_DUE_STATUS_OPTIONS;
      const rows = await collectDueListRows(academicYearId, classId);
      const found = new Set<FeeDueStatusFilter>();
      for (const row of rows) {
        if (row.status === "DUE" || row.status === "OVERDUE") {
          found.add(row.status);
        }
      }
      const next = FEE_DUE_STATUS_OPTIONS.filter(
        (option) => option.value === "ALL" || found.has(option.value)
      );
      return next.length ? next : [{ label: "All", value: "ALL" }];
    },
    enabled: !!academicYearId,
  });

  const installmentOptions = installmentQuery.data ?? [];
  const statusOptions = statusOptionsQuery.data ?? FEE_DUE_STATUS_OPTIONS;

  useEffect(() => {
    if (!classId) return;
    if (!classes.some((item) => String(item.id) === classId)) {
      setClassIdState("");
      setInstallmentState("");
      setStatusState("ALL");
    }
  }, [classes, classId]);

  useEffect(() => {
    if (!installment) return;
    if (!installmentOptions.includes(installment)) {
      setInstallmentState("");
    }
  }, [installmentOptions, installment]);

  useEffect(() => {
    if (!statusOptions.some((option) => option.value === status)) {
      setStatusState("ALL");
    }
  }, [statusOptions, status]);

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
    status,
    setStatus,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    academicYearId,
    setAcademicYearId,
    academicYears,
    classes,
    installmentOptions,
    statusOptions,
    total,
    rows,
    loading: dueListQuery.isLoading,
    error,
    refetch: () => {
      void dueListQuery.refetch();
    },
  };
}
