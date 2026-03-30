/**
 * Sprint performance report — metadata-driven filters, full dataset table, charts.
 * Dataset is kept in React state until a full page reload.
 */

import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
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
    employees,
  } = useSprintPerformanceReportController();

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
              employees={employees}
            />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mt: 1 }}>
              <ColumnVisibilityMenu
                options={columnVisibilityOptions}
                visibleIds={visibleColumnIds}
                onChange={setVisibleColumnIds}
              />
              <Typography variant="caption" color="text.secondary">
                Results stay in memory until you refresh the browser.
              </Typography>
            </Box>
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
        {aggregations && (
          <Grid container spacing={1} sx={{ mb: 2 }}>
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
                <Grid item key={m.id}>
                  <Chip label={`${m.label}: ${display}`} variant="outlined" size="small" />
                </Grid>
              );
            })}
          </Grid>
        )}

        <ReportTable<TimesheetEntryRow>
          label="Timesheet entries"
          columns={visibleColumns}
          data={rows}
          loading={loading}
          emptyMessage={listConfig.uiPolicy.emptyMessage}
        />

        <GraphPanel rows={rows} />
      </Box>
    </ListPageLayout>
  );
}
