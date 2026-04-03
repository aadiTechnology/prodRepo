import Paper from "@mui/material/Paper";
import { BarChart } from "@mui/x-charts";
import { Typography } from "../primitives";
import { colorTokens } from "../../tokens/colors";
import type { SprintwiseSprintTotals } from "../../types/sprintwisePerformanceReport";

export interface SprintwiseEffortBarChartProps {
  sprints: SprintwiseSprintTotals[];
  title?: string;
  /** Smaller chart for per-member rows */
  compact?: boolean;
}

export default function SprintwiseEffortBarChart({
  sprints,
  title = "Billable vs page effort by sprint",
  compact = false,
}: SprintwiseEffortBarChartProps) {
  const chartHeight = compact ? 240 : 300;
  const paperMin = compact ? 300 : 380;
  const emptyMin = compact ? 280 : 360;

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

  return (
    <Paper variant="outlined" sx={{ p: 2, minHeight: paperMin }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <BarChart
        height={chartHeight}
        margin={{ left: 52, right: 12, top: 12, bottom: compact ? 48 : 56 }}
        xAxis={[{ scaleType: "band", data: labels }]}
        series={[
          {
            data: sprints.map((s) => s.billable_efforts),
            label: "Billable",
            color: colorTokens.primary.main,
          },
          {
            data: sprints.map((s) => s.page_efforts),
            label: "Page efforts",
            color: colorTokens.preschool.turquoise.main,
          },
          {
            data: sprints.map((s) => s.total_efforts),
            label: "Total efforts",
            color: colorTokens.semantic.inactive,
          },
        ]}
        grid={{ horizontal: true }}
      />
    </Paper>
  );
}
