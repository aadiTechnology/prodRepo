/**
 * Sprintwise performance — billable vs page-development effort by sprint (pivot-style table).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
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
import sprintPerformanceReportService from "../../api/services/sprintPerformanceReportService";
import sprintwisePerformanceReportService from "../../api/services/sprintwisePerformanceReportService";
import type { ReportOption, SprintPerformanceFilterOptionsResponse } from "../../types/sprintPerformanceReport";
import type { SprintwiseSprintTotals } from "../../types/sprintwisePerformanceReport";
import { buildSprintwiseMetricRows } from "../../utils/sprintwisePerformanceReportTransform";
import { formatHours } from "../../utils/formatters";

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
  const [sprints, setSprints] = useState<SprintwiseSprintTotals[]>([]);
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
      setSprints(res.sprints);
      setAppliedOnce(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Unable to load report.");
      setSprints([]);
      setAppliedOnce(true);
    } finally {
      setLoading(false);
    }
  }, [allMembersSelected, selectedOwners]);

  const metricRows = useMemo(() => buildSprintwiseMetricRows(sprints), [sprints]);

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

        {!loading && appliedOnce && sprints.length === 0 && !error && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No data for the current filters (no matching effort in Billable or PageDevelopment categories).
          </Typography>
        )}

        {sprints.length > 0 && (
          <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: "100%", overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Metric</TableCell>
                  {sprints.map((s) => (
                    <TableCell key={s.sprint_id} align="right" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      {s.sprint_label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {metricRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell component="th" scope="row">
                      {row.label}
                    </TableCell>
                    {row.values.map((v, i) => (
                      <TableCell key={sprints[i].sprint_id} align="right">
                        {formatHours(v)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </ListPageLayout>
  );
}
