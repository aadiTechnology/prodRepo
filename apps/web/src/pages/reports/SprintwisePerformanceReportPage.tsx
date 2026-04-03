/**
 * Sprintwise performance — billable vs page-development effort by sprint (pivot tables + bar chart).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Grid from "@mui/material/Grid2";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  TextField,
  Typography,
} from "../../components/primitives";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import SprintwiseEffortBarChart from "../../components/reports/SprintwiseEffortBarChart";
import SprintwisePivotTable from "../../components/reports/SprintwisePivotTable";
import sprintPerformanceReportService from "../../api/services/sprintPerformanceReportService";
import sprintwisePerformanceReportService from "../../api/services/sprintwisePerformanceReportService";
import type { ReportOption, SprintPerformanceFilterOptionsResponse } from "../../types/sprintPerformanceReport";
import type { SprintwiseReportSlice } from "../../types/sprintwisePerformanceReport";

export default function SprintwisePerformanceReportPage() {
  const [options, setOptions] = useState<SprintPerformanceFilterOptionsResponse>({
    sprints: [],
    owners: [],
    features: [],
    categories: [],
    tasks: [],
  });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedOwners, setSelectedOwners] = useState<ReportOption[]>([]);
  const [slices, setSlices] = useState<SprintwiseReportSlice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedOnce, setAppliedOnce] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOptionsLoading(true);
      try {
        const res = await sprintPerformanceReportService.fetchOptions();
        if (!cancelled) setOptions(res);
      } catch {
        if (!cancelled) {
          setOptions({ sprints: [], owners: [], features: [], categories: [], tasks: [] });
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allMembersSelected = selectedOwners.length === 0;

  const applyReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const memberIds = allMembersSelected ? null : selectedOwners.map((o) => o.id);
      const res = await sprintwisePerformanceReportService.fetchReport(memberIds);
      setSlices(res.slices ?? []);
      setAppliedOnce(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Unable to load report.");
      setSlices([]);
      setAppliedOnce(true);
    } finally {
      setLoading(false);
    }
  }, [allMembersSelected, selectedOwners]);

  const hasData = useMemo(() => slices.some((s) => s.sprints.length > 0), [slices]);
  const isMultiMember = useMemo(() => slices.some((s) => s.slice_key === "total"), [slices]);
  const totalSlice = useMemo(() => slices.find((s) => s.slice_key === "total"), [slices]);
  const memberOnlySlices = useMemo(() => slices.filter((s) => s.slice_key !== "total"), [slices]);

  const chartSprints = useMemo(() => {
    if (totalSlice?.sprints.length) return totalSlice.sprints;
    return memberOnlySlices[0]?.sprints ?? [];
  }, [totalSlice, memberOnlySlices]);

  const primaryTableSlice = useMemo(() => {
    if (isMultiMember && totalSlice) return { title: "Total", sprints: totalSlice.sprints };
    const first = memberOnlySlices[0];
    if (first) return { title: first.label, sprints: first.sprints };
    return null;
  }, [isMultiMember, totalSlice, memberOnlySlices]);

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[
              { title: "Reports", path: "#" },
              { title: "Sprintwise performance", path: "/reports/sprintwise-performance" },
            ]}
            homePath="/"
            actions={null}
          />
          <Box
            sx={{
              px: 2,
              py: 1,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "flex-end",
            }}
          >
            <Box sx={{ minWidth: 280 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Members
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allMembersSelected}
                    onChange={(_, c) => {
                      if (c) setSelectedOwners([]);
                    }}
                  />
                }
                label="All members"
              />
              <Autocomplete<ReportOption, true, false, false>
                multiple
                disableCloseOnSelect
                disabled={optionsLoading}
                options={options.owners}
                value={selectedOwners}
                onChange={(_e, v) => setSelectedOwners(v)}
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.id}>
                    <Checkbox sx={{ mr: 1 }} size="small" checked={selected} />
                    {option.label}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={optionsLoading ? "Loading…" : "Select members (empty = all)"}
                    size="small"
                  />
                )}
                sx={{ minWidth: 280 }}
              />
            </Box>
            <Button variant="contained" onClick={applyReport} disabled={loading}>
              {loading ? "Loading…" : "Apply"}
            </Button>
          </Box>
          {error && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            </Box>
          )}
        </>
      }
    >
      <Box sx={{ px: 2, pb: 3 }}>
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          </Box>
        )}

        {!loading && !appliedOnce && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Apply filters to load sprintwise billable and page-development effort.
          </Typography>
        )}

        {!loading && appliedOnce && !hasData && !error && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No data for the current filters (no matching effort in Billable or PageDevelopment categories).
          </Typography>
        )}

        {hasData && primaryTableSlice && (
          <>
            <Grid container spacing={2} alignItems="stretch">
              <Grid size={{ xs: 12, md: 5 }}>
                <SprintwiseEffortBarChart sprints={chartSprints} />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <SprintwisePivotTable title={primaryTableSlice.title} sprints={primaryTableSlice.sprints} />
              </Grid>
            </Grid>

            {isMultiMember && memberOnlySlices.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  By member
                </Typography>
                <Grid container spacing={3}>
                  {memberOnlySlices.map((sl) => (
                    <Grid key={sl.slice_key} size={{ xs: 12 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        {sl.label}
                      </Typography>
                      <Grid container spacing={2} alignItems="stretch">
                        <Grid size={{ xs: 12, md: 5 }}>
                          <SprintwiseEffortBarChart
                            sprints={sl.sprints}
                            title="Billable vs page effort by sprint"
                            compact
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 7 }}>
                          <SprintwisePivotTable title={sl.label} sprints={sl.sprints} showTitle={false} />
                        </Grid>
                      </Grid>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </>
        )}
      </Box>
    </ListPageLayout>
  );
}
