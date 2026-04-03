/**
 * Sprintwise performance — summary (all metrics) vs detail (member × sprint for selected metric).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Grid from "@mui/material/Grid2";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { BarChart } from "@mui/x-charts";
import { colorTokens } from "../../tokens/colors";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Select,
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
import type {
  MemberSprintMetrics,
  SprintMemberDetailBlock,
  SprintwiseMetricKey,
  SprintwiseReportSlice,
} from "../../types/sprintwisePerformanceReport";
import {
  memberMetricValue,
  metricColumnLabel,
} from "../../utils/sprintwisePerformanceReportTransform";
import { formatHours } from "../../utils/formatters";

const detailChartColors = [
  colorTokens.primary.main,
  colorTokens.preschool.turquoise.main,
  "#c77852",
  "#5c6bc0",
  "#43a047",
  "#8d6e63",
  "#00897b",
];

function MemberSprintMatrix({
  detailBySprint,
  metric,
}: {
  detailBySprint: SprintMemberDetailBlock[];
  metric: SprintwiseMetricKey;
}) {
  const colLabel = metricColumnLabel(metric);

  const { sprintCols, memberRows, colTotals, grand } = useMemo(() => {
    const sprintCols = detailBySprint.map((b) => ({ id: b.sprint_id, label: b.sprint_label }));
    const cellMap = new Map<number, Map<number, number>>();
    const nameMap = new Map<number, string>();
    for (const block of detailBySprint) {
      for (const m of block.members) {
        nameMap.set(m.owner_id, m.owner_label);
        if (!cellMap.has(m.owner_id)) cellMap.set(m.owner_id, new Map());
        cellMap.get(m.owner_id)!.set(block.sprint_id, memberMetricValue(m, metric));
      }
    }
    const memberIds = Array.from(cellMap.keys()).sort((a, b) =>
      (nameMap.get(a) || "").localeCompare(nameMap.get(b) || "", undefined, { sensitivity: "base" })
    );
    const colTotals = sprintCols.map((sc) =>
      memberIds.reduce((s, oid) => s + (cellMap.get(oid)?.get(sc.id) ?? 0), 0)
    );
    const memberRows = memberIds.map((oid) => {
      const byS = cellMap.get(oid)!;
      const values = sprintCols.map((sc) => byS.get(sc.id) ?? 0);
      const rowSum = values.reduce((a, b) => a + b, 0);
      return { oid, label: nameMap.get(oid) || "", values, rowSum };
    });
    const grand = colTotals.reduce((a, b) => a + b, 0);
    return { sprintCols, memberRows, colTotals, grand };
  }, [detailBySprint, metric]);

  if (!detailBySprint.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        No member detail rows for this filter. Apply with data in scope.
      </Typography>
    );
  }

  const sprintLabels = sprintCols.map((c) => c.label);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mt: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Members × sprints ({colLabel})
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        By sprint (grouped by member)
      </Typography>
      <Box sx={{ mb: 2, width: "100%", overflow: "auto" }}>
        <BarChart
          height={Math.min(360, 220 + memberRows.length * 12)}
          margin={{ left: 52, right: 12, top: 8, bottom: 52 }}
          xAxis={[{ scaleType: "band", data: sprintLabels }]}
          series={memberRows.map((row, i) => ({
            data: row.values,
            label: row.label,
            color: detailChartColors[i % detailChartColors.length],
          }))}
          grid={{ horizontal: true }}
        />
      </Box>
      <TableContainer sx={{ overflow: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Member</TableCell>
              {sprintCols.map((c) => (
                <TableCell key={c.id} align="right" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {c.label}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {memberRows.map((row) => (
              <TableRow key={row.oid} hover>
                <TableCell component="th" scope="row">
                  {row.label}
                </TableCell>
                {row.values.map((v, i) => (
                  <TableCell key={sprintCols[i].id} align="right">
                    {formatHours(v)}
                  </TableCell>
                ))}
                <TableCell align="right">{formatHours(row.rowSum)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ "& td, & th": { fontWeight: 600, bgcolor: "action.hover" } }}>
              <TableCell component="th" scope="row">
                Total
              </TableCell>
              {colTotals.map((v, i) => (
                <TableCell key={sprintCols[i].id} align="right">
                  {formatHours(v)}
                </TableCell>
              ))}
              <TableCell align="right">{formatHours(grand)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function OverallSummaryTableSummary({ members }: { members: MemberSprintMetrics[] }) {
  if (!members.length) return null;
  const sumB = members.reduce((a, m) => a + m.billable_efforts, 0);
  const sumP = members.reduce((a, m) => a + m.productive_efforts, 0);
  const sumT = members.reduce((a, m) => a + m.total_efforts, 0);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mt: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Total across selected sprints
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Member</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Billable Efforts
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Productive Efforts
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Total efforts
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.owner_id} hover>
                <TableCell>{m.owner_label}</TableCell>
                <TableCell align="right">{formatHours(m.billable_efforts)}</TableCell>
                <TableCell align="right">{formatHours(m.productive_efforts)}</TableCell>
                <TableCell align="right">{formatHours(m.total_efforts)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ "& td": { fontWeight: 600, bgcolor: "action.hover" } }}>
              <TableCell>Grand total</TableCell>
              <TableCell align="right">{formatHours(sumB)}</TableCell>
              <TableCell align="right">{formatHours(sumP)}</TableCell>
              <TableCell align="right">{formatHours(sumT)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

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
  const [selectedSprints, setSelectedSprints] = useState<ReportOption[]>([]);
  const [slices, setSlices] = useState<SprintwiseReportSlice[]>([]);
  const [detailBySprint, setDetailBySprint] = useState<SprintMemberDetailBlock[]>([]);
  const [overallMembers, setOverallMembers] = useState<MemberSprintMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedOnce, setAppliedOnce] = useState(false);
  const [detailMetric, setDetailMetric] = useState<SprintwiseMetricKey>("productive");
  const [showDetails, setShowDetails] = useState(false);

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
  const allSprintsSelected = selectedSprints.length === 0;

  const applyReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const memberIds = allMembersSelected ? null : selectedOwners.map((o) => o.id);
      const sprintIds = allSprintsSelected ? null : selectedSprints.map((s) => s.id);
      const res = await sprintwisePerformanceReportService.fetchReport({
        memberIds,
        sprintIds,
        includeDetail: true,
      });
      setSlices(res.slices ?? []);
      setDetailBySprint(res.detail_by_sprint ?? []);
      setOverallMembers(res.overall_summary?.members ?? []);
      setAppliedOnce(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Unable to load report.");
      setSlices([]);
      setDetailBySprint([]);
      setOverallMembers([]);
      setAppliedOnce(true);
    } finally {
      setLoading(false);
    }
  }, [allMembersSelected, selectedOwners, allSprintsSelected, selectedSprints]);

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
            <Box sx={{ minWidth: 260 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Sprints
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allSprintsSelected}
                    onChange={(_, c) => {
                      if (c) setSelectedSprints([]);
                    }}
                  />
                }
                label="All sprints"
              />
              <Autocomplete<ReportOption, true, false, false>
                multiple
                disableCloseOnSelect
                disabled={optionsLoading}
                options={options.sprints}
                value={selectedSprints}
                onChange={(_e, v) => setSelectedSprints(v)}
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.id}>
                    <Checkbox sx={{ mr: 1 }} size="small" checked={selected} />
                    {option.label}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} placeholder={optionsLoading ? "Loading…" : "Sprints"} size="small" />
                )}
                sx={{ minWidth: 260 }}
              />
            </Box>
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
            {showDetails && (
              <Box sx={{ minWidth: 200 }}>
                <Select
                  label="Metric"
                  size="small"
                  value={detailMetric}
                  onChange={(e) => setDetailMetric(e.target.value as SprintwiseMetricKey)}
                >
                  <MenuItem value="billable">Billable Efforts</MenuItem>
                  <MenuItem value="productive">Productive Efforts</MenuItem>
                  <MenuItem value="total">Total Efforts</MenuItem>
                </Select>
              </Box>
            )}
            <FormControlLabel
              control={<Switch checked={showDetails} onChange={(_, v) => setShowDetails(v)} size="small" />}
              label="Show details"
            />
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
            Apply filters to load sprintwise performance.
          </Typography>
        )}

        {!loading && appliedOnce && !hasData && !error && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No data for the current filters.
          </Typography>
        )}

        {hasData && primaryTableSlice && showDetails && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Detail view — members (rows) by sprint (columns). Change metric above to compare billable, productive, or
              total hours.
            </Typography>
            <MemberSprintMatrix detailBySprint={detailBySprint} metric={detailMetric} />
          </Box>
        )}

        {hasData && primaryTableSlice && !showDetails && (
          <>
            <Grid container spacing={2} alignItems="stretch">
              <Grid size={{ xs: 12, md: 5 }}>
                <SprintwiseEffortBarChart sprints={chartSprints} variant="summary" />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <SprintwisePivotTable title={primaryTableSlice.title} sprints={primaryTableSlice.sprints} variant="summary" />
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
                          <SprintwiseEffortBarChart sprints={sl.sprints} variant="summary" compact />
                        </Grid>
                        <Grid size={{ xs: 12, md: 7 }}>
                          <SprintwisePivotTable
                            title={sl.label}
                            sprints={sl.sprints}
                            showTitle={false}
                            variant="summary"
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            <OverallSummaryTableSummary members={overallMembers} />
          </>
        )}
      </Box>
    </ListPageLayout>
  );
}
