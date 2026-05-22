import { useState, useCallback, useEffect, useMemo } from "react";
import feeService from "../api/services/feeService";
import { type FeeStructure, type AcademicYear, type ClassEntity } from "../types/fee";
import { useListManager } from "./useListManager";

export function useFeeStructureListController() {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const listState = useListManager<{ academicYearId: string; className: string }, "name">({
    initialFilters: { academicYearId: "", className: "" },
    initialSortBy: "name",
    initialSortOrder: "asc",
    initialRowsPerPage: 10,
    initialPage: 0,
    initialSearch: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await feeService.getFeeStructures(
        listState.page,
        listState.rowsPerPage,
        listState.search,
        undefined,
        listState.filters.academicYearId ? Number(listState.filters.academicYearId) : undefined,
        listState.filters.className || undefined
      );
      setStructures(res.items);
      setTotalRecords(res.total);
    } catch (err: any) {
      setError(err?.message || "Failed to load fee structures.");
    } finally {
      setLoading(false);
    }
  }, [listState.page, listState.rowsPerPage, listState.search, listState.filters.academicYearId, listState.filters.className]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const loadAcademicYears = async () => {
      try {
        const years = await feeService.getAcademicYears();
        setAcademicYears(years);
        if (!listState.filters.academicYearId && years.length > 0) {
          const current = years.find((y) => y.is_current) ?? years[0];
          listState.setFilter("academicYearId", String(current.id));
        }
      } catch (err) {
        console.error("Failed to load academic years", err);
      }
    };
    void loadAcademicYears();
  }, [listState.filters.academicYearId, listState.setFilter]);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const classList = await feeService.getClasses(
          listState.filters.academicYearId ? Number(listState.filters.academicYearId) : undefined
        );
        setClasses(classList);
      } catch (err) {
        console.error("Failed to load classes", err);
      }
    };
    loadClasses();
  }, [listState.filters.academicYearId]);

  const handleDeleteClick = (id: number) => {
    setStructureToDelete(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!structureToDelete) return;
    try {
      setDeleteLoading(true);
      await feeService.deleteFeeStructure(structureToDelete);
      setConfirmOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete structure.");
    } finally {
      setDeleteLoading(false);
      setStructureToDelete(null);
    }
  };

  const uniqueClasses = useMemo(() => {
    const seen = new Set();
    return classes.filter(cls => {
      if (!cls.name || seen.has(cls.name)) return false;
      seen.add(cls.name);
      return true;
    });
  }, [classes]);

  return {
    listState,
    structures,
    loading,
    error,
    setError,
    totalRecords,
    academicYears,
    uniqueClasses,
    confirmOpen,
    setConfirmOpen,
    deleteLoading,
    handleDeleteClick,
    handleConfirmDelete,
    fetchData,
  };
}
