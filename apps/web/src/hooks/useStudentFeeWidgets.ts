import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import dashboardService, { type StudentFeeWidgets } from "../api/services/dashboardService";
import feesApi, { type AcademicYearOption } from "../api/services/feesApi";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";

const STUDENT_FEE_REFRESH_MS = 5 * 60 * 1000;

export type UseStudentFeeWidgetsResult = {
  academicYears: AcademicYearOption[];
  academicYearsLoading: boolean;
  academicYearId: number | null;
  setAcademicYearId: (value: number) => void;
  overview: StudentFeeWidgets | null;
  loading: boolean;
  error: boolean;
  refetch: () => void;
};

/** Student dashboard fee widgets. Stays idle for every other role. */
export function useStudentFeeWidgets(enabled: boolean): UseStudentFeeWidgetsResult {
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  const academicYearsQuery = useQuery({
    queryKey: ["student-fee-widgets", "academic-years"],
    queryFn: feesApi.getAcademicYears,
    enabled,
  });
  const academicYears = Array.isArray(academicYearsQuery.data) ? academicYearsQuery.data : [];

  useEffect(() => {
    if (academicYearId == null && academicYears.length > 0) {
      const currentId = resolveCurrentAcademicYearId(academicYears);
      setAcademicYearId(currentId ? Number(currentId) : academicYears[0].id);
    }
  }, [academicYearId, academicYears]);

  const overviewQuery = useQuery({
    queryKey: ["student-fee-widgets", academicYearId],
    queryFn: () => dashboardService.getStudentFeeWidgets(academicYearId ?? undefined),
    enabled: enabled && academicYearId != null,
    placeholderData: keepPreviousData,
    refetchInterval: enabled ? STUDENT_FEE_REFRESH_MS : false,
  });

  return {
    academicYears,
    academicYearsLoading: academicYearsQuery.isLoading,
    academicYearId,
    setAcademicYearId,
    overview: overviewQuery.data ?? null,
    loading: overviewQuery.isLoading || overviewQuery.isPlaceholderData,
    error: overviewQuery.isError,
    refetch: () => {
      if (enabled && academicYearId != null) void overviewQuery.refetch();
    },
  };
}
