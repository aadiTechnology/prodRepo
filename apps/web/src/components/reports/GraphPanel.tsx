import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid2";
import { BarChart, LineChart } from "@mui/x-charts";
import { Typography } from "../primitives";
import { colorTokens } from "../../tokens/colors";
import type { TimesheetEntryRow } from "../../types/sprintPerformanceReport";
import {
  aggregateBySprint,
  aggregateHoursByFeature,
  individualProductivityTrend,
} from "../../utils/sprintPerformanceChartData";

export interface GraphPanelProps {
  rows: TimesheetEntryRow[];
}

const chartColors = [
  colorTokens.primary.main,
  colorTokens.preschool.turquoise.main,
  "#c77852",
  "#5c6bc0",
  "#43a047",
];

export default function GraphPanel({ rows }: GraphPanelProps) {
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        Run a report to see charts.
      </Typography>
    );
  }

  const bySprint = aggregateBySprint(rows);
  const byFeature = aggregateHoursByFeature(rows);
  const trend = individualProductivityTrend(rows);

  const sprintLabels = bySprint.map((d) => d.sprint);
  const sprintHours = bySprint.map((d) => d.hours);
  const sprintPages = bySprint.map((d) => d.distinctPages);

  const featureLabels = byFeature.map((d) => d.feature);
  const featureHours = byFeature.map((d) => d.hours);

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper variant="outlined" sx={{ p: 2, height: 360 }}>
          <Typography variant="subtitle2" gutterBottom>
            Sprint vs distinct page names
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Count of unique PageName values per sprint in this dataset (not a completion status).
          </Typography>
          <BarChart
            height={280}
            xAxis={[{ scaleType: "band", data: sprintLabels }]}
            series={[{ data: sprintPages, label: "Distinct pages", color: chartColors[0] }]}
            grid={{ horizontal: true }}
          />
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper variant="outlined" sx={{ p: 2, height: 360 }}>
          <Typography variant="subtitle2" gutterBottom>
            Sprint vs hours spent
          </Typography>
          <BarChart
            height={300}
            xAxis={[{ scaleType: "band", data: sprintLabels }]}
            series={[{ data: sprintHours, label: "Hours", color: chartColors[1] }]}
            grid={{ horizontal: true }}
          />
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper variant="outlined" sx={{ p: 2, height: 360 }}>
          <Typography variant="subtitle2" gutterBottom>
            Feature / area comparison (hours)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Top features by logged hours (team proxy until a Team column exists).
          </Typography>
          <BarChart
            height={280}
            xAxis={[{ scaleType: "band", data: featureLabels }]}
            series={[{ data: featureHours, label: "Hours", color: chartColors[2] }]}
            grid={{ horizontal: true }}
            margin={{ left: 48, right: 12, top: 32, bottom: 72 }}
            sx={{
              "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": {
                fontSize: 11,
              },
            }}
          />
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper variant="outlined" sx={{ p: 2, height: 360 }}>
          <Typography variant="subtitle2" gutterBottom>
            Individual hours by month
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Top contributors; effort hours from timesheet entries.
          </Typography>
          <LineChart
            height={280}
            xAxis={[{ scaleType: "band", data: trend.months }]}
            series={trend.series.map((s, i) => ({
              type: "line" as const,
              data: s.data,
              label: s.owner,
              color: chartColors[i % chartColors.length],
            }))}
            grid={{ horizontal: true }}
            margin={{ left: 48, right: 12, top: 32, bottom: 48 }}
          />
        </Paper>
      </Grid>
    </Grid>
  );
}
