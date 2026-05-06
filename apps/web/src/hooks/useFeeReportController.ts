import { useCallback, useEffect, useState } from "react";
import feeReportService from "../api/services/feeReportService";
import type {
  FeeReportFilterOptions,
  FeeReportRow,
  FeeReportSummary,
} from "../types/feeReport";

const DEFAULT_SUMMARY: FeeReportSummary = {
  total_students: 0,
  total_invoiced: 0,
  total_collected: 0,
  total_pending: 0,
  collection_percentage: 0,
};

export function useFeeReportController() {
  // Filter state
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [installment, setInstallment] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Data
  const [summary, setSummary] = useState<FeeReportSummary>(DEFAULT_SUMMARY);
  const [rows, setRows] = useState<FeeReportRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FeeReportFilterOptions>({
    academic_years: [],
    classes: [],
    installments: [],
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load filter dropdowns once
  useEffect(() => {
    feeReportService
      .getFilterOptions()
      .then(setFilterOptions)
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await feeReportService.getReport({
        page,
        size: rowsPerPage,
        academic_year_id: academicYearId || null,
        class_id: classId || null,
        installment: installment || null,
        start_date: startDate || null,
        end_date: endDate || null,
        search: search || null,
      });
      setSummary(data.summary);
      setRows(data.items);
      setTotalRows(data.total);
    } catch {
      setError("Unable to load report data");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, academicYearId, classId, installment, startDate, endDate, search]);

  // Fetch on mount and whenever filters/pagination change
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleReset = () => {
    setAcademicYearId(null);
    setClassId(null);
    setInstallment("");
    setStartDate("");
    setEndDate("");
    setSearch("");
    setPage(0);
  };

  return {
    // filters
    academicYearId,
    setAcademicYearId,
    classId,
    setClassId,
    installment,
    setInstallment,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    search,
    setSearch,
    filterOptions,
    handleReset,
    // pagination
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    // data
    summary,
    rows,
    totalRows,
    // ui
    loading,
    error,
    setError,
    refetch: fetchReport,
  };
}
