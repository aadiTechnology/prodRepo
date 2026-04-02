/**
 * Sprint performance report — metadata-driven filters, full dataset table, charts.
 * Dataset is kept in React state until a full page reload.
 */

import { useState } from "react";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid2";
import { Box, Button, Typography } from "../../components/primitives";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import ReportFilterBar from "../../components/reports/ReportFilterBar";
import ReportTable from "../../components/reports/ReportTable";
import ColumnVisibilityMenu from "../../components/reports/ColumnVisibilityMenu";
import GraphPanel from "../../components/reports/GraphPanel";
import { useSprintPerformanceReportController } from "../../hooks/useSprintPerformanceReportController";
import type { TimesheetEntryRow } from "../../types/sprintPerformanceReport";
import { formatHours } from "../../utils/formatters";

export default function SprintPerformanceReportPage() {
  const {
    listConfig,
    filters,
    patchFilters,
    runReport,
    rows,
    aggregations,
    loading,
    error,
    visibleColumnIds,
    setVisibleColumnIds,
    visibleColumns,
    columnVisibilityOptions,
    options,
    optionsLoading,
  } = useSprintPerformanceReportController();

  const [showDataTable, setShowDataTable] = useState(false);

  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[
              { title: "Reports", path: "#" },
              { title: "Sprint performance", path: "/reports/sprint-performance" },
            ]}
            homePath="/"
            actions={null}
          />
          <Box sx={{ px: 2, pb: 1 }}>
            <ReportFilterBar
              filters={filters}
              onChange={patchFilters}
              onRunReport={runReport}
              loading={loading}
              options={options}
              optionsLoading={optionsLoading}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Results stay in memory until you refresh the browser.
            </Typography>
          </Box>
          {error && (
            <Box sx={{ px: 2, pb: 1, display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
              <Button variant="outlined" color="error" size="small" onClick={runReport} disabled={loading}>
                {listConfig.uiPolicy.retryLabel}
              </Button>
            </Box>
          )}
        </>
      }
    >
      <Box sx={{ px: 2, pb: 2 }}>
        {aggregations != null && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Report summary
            </Typography>
            <Grid container spacing={1}>
              {listConfig.aggregationMeta.map((m) => {
                const raw = aggregations[m.field];
                const display =
                  m.field === "pages_per_hour"
                    ? raw == null
                      ? "—"
                      : formatHours(raw, { fractionDigits: 3 })
                    : m.field === "total_hours"
                      ? formatHours(raw as number)
                      : String(raw ?? "—");
                return (
                  <Grid key={m.id}>
                    <Chip label={`${m.label}: ${display}`} variant="outlined" size="small" />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        <GraphPanel rows={rows} />

        <Box sx={{ mt: 2, mb: showDataTable ? 2 : 0 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowDataTable((v) => !v)}
            disabled={aggregations == null}
          >
            {showDataTable ? "Hide detail data" : "Show detail data"}
          </Button>
          {!rows.length && !loading && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              Run a report to load rows.
            </Typography>
          )}
        </Box>

        {showDataTable && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1 }}>
              <ColumnVisibilityMenu
                options={columnVisibilityOptions}
                visibleIds={visibleColumnIds}
                onChange={setVisibleColumnIds}
              />
            </Box>
            <ReportTable<TimesheetEntryRow>
              label="Timesheet entries"
              columns={visibleColumns}
              data={rows}
              loading={loading}
              emptyMessage={listConfig.uiPolicy.emptyMessage}
            />
          </Box>
        )}
      </Box>
    </ListPageLayout>
  );
}
