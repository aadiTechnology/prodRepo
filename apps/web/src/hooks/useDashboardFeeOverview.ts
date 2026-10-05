import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import dashboardService, { type AdminFeeOverview } from "../api/services/dashboardService";
import feesApi, { type AcademicYearOption } from "../api/services/feesApi";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";

const FEE_OVERVIEW_REFRESH_MS = 5 * 60 * 1000;

export type UseDashboardFeeOverviewResult = {
  academicYears: AcademicYearOption[];
  academicYearsLoading: boolean;
  academicYearId: number | null;
  setAcademicYearId: (value: number) => void;
  overview: AdminFeeOverview | null;
  loading: boolean;
  error: boolean;
  refetch: () => void;
};

/** Admin dashboard fee widgets: academic-year selection + fee overview data. */
export function useDashboardFeeOverview(enabled: boolean): UseDashboardFeeOverviewResult {
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);

  const academicYearsQuery = useQuery({
    queryKey: ["dashboard-fee-overview", "academic-years"],
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
    queryKey: ["dashboard-fee-overview", academicYearId],
    queryFn: () => dashboardService.getFeeOverview(academicYearId ?? undefined),
    enabled: enabled && academicYearId != null,
    placeholderData: keepPreviousData,
    refetchInterval: FEE_OVERVIEW_REFRESH_MS,
  });

  return {
    academicYears,
    academicYearsLoading: academicYearsQuery.isLoading,
    academicYearId,
    setAcademicYearId,
    overview: overviewQuery.data ?? null,
    // Background refreshes keep showing current numbers; only first load / year switch shows a spinner.
    loading: overviewQuery.isLoading || overviewQuery.isPlaceholderData,
    error: overviewQuery.isError,
    refetch: () => {
      // refetch() bypasses `enabled`; non-admins must never hit the endpoint.
      if (enabled && academicYearId != null) void overviewQuery.refetch();
    },
  };
}
