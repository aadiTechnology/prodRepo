import Paper from "@mui/material/Paper";
import { BarChart } from "@mui/x-charts";
import { Typography } from "../primitives";
import { colorTokens } from "../../tokens/colors";
import type { SprintwiseMetricKey, SprintwiseSprintTotals } from "../../types/sprintwisePerformanceReport";
import { metricColumnLabel } from "../../utils/sprintwisePerformanceReportTransform";

export interface SprintwiseEffortBarChartProps {
  sprints: SprintwiseSprintTotals[];
  title?: string;
  compact?: boolean;
  /** Summary: three series. Single: one primary (+ total when metric is billable/productive). */
  variant?: "summary" | "singleMetric";
  metric?: SprintwiseMetricKey;
}

export default function SprintwiseEffortBarChart({
  sprints,
  title,
  compact = false,
  variant = "singleMetric",
  metric = "billable",
}: SprintwiseEffortBarChartProps) {
  const chartHeight = compact ? 240 : 300;
  const paperMin = compact ? 300 : 380;
  const emptyMin = compact ? 280 : 360;

  const defaultTitleSummary = "Billable, productive & total by sprint";
  const defaultTitleSingle =
    metric === "billable"
      ? "Billable vs total by sprint"
      : metric === "productive"
        ? "Productive vs total by sprint"
        : "Total effort by sprint";

  const chartTitle = title ?? (variant === "summary" ? defaultTitleSummary : defaultTitleSingle);

  if (!sprints.length) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          minHeight: emptyMin,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No data to chart.
        </Typography>
      </Paper>
    );
  }

  const labels = sprints.map((s) => s.sprint_label);

  const series =
    variant === "summary"
      ? [
          { data: sprints.map((s) => s.billable_efforts), label: "Billable", color: colorTokens.primary.main },
          {
            data: sprints.map((s) => s.page_efforts),
            label: "Productive",
            color: colorTokens.preschool.turquoise.main,
          },
          {
            data: sprints.map((s) => s.total_efforts),
            label: "Total efforts",
            color: colorTokens.semantic.inactive,
          },
        ]
      : metric === "total"
        ? [
            {
              data: sprints.map((s) => s.total_efforts),
              label: metricColumnLabel(metric),
              color: colorTokens.semantic.inactive,
            },
          ]
        : [
            {
              data:
                metric === "billable"
                  ? sprints.map((s) => s.billable_efforts)
                  : sprints.map((s) => s.page_efforts),
              label: metricColumnLabel(metric),
              color:
                metric === "billable"
                  ? colorTokens.primary.main
                  : colorTokens.preschool.turquoise.main,
            },
            {
              data: sprints.map((s) => s.total_efforts),
              label: "Total efforts",
              color: colorTokens.semantic.inactive,
            },
          ];

  return (
    <Paper variant="outlined" sx={{ p: 2, minHeight: paperMin }}>
      <Typography variant="subtitle2" gutterBottom>
        {chartTitle}
      </Typography>
      <BarChart
        height={chartHeight}
        margin={{ left: 52, right: 12, top: 12, bottom: compact ? 48 : 56 }}
        xAxis={[{ scaleType: "band", data: labels }]}
        series={series}
        grid={{ horizontal: true }}
      />
    </Paper>
  );
}
