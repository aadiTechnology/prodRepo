import { useMemo } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Typography } from "../primitives";
import type { SprintwiseMetricKey, SprintwiseSprintTotals } from "../../types/sprintwisePerformanceReport";
import { buildFullPivotRows, buildPivotRowsForMetric } from "../../utils/sprintwisePerformanceReportTransform";
import { formatHours } from "../../utils/formatters";

export interface SprintwisePivotTableProps {
  title: string;
  sprints: SprintwiseSprintTotals[];
  showTitle?: boolean;
  variant?: "summary" | "singleMetric";
  metric?: SprintwiseMetricKey;
}

export default function SprintwisePivotTable({
  title,
  sprints,
  showTitle = true,
  variant = "singleMetric",
  metric = "billable",
}: SprintwisePivotTableProps) {
  const metricRows = useMemo(
    () => (variant === "summary" ? buildFullPivotRows(sprints) : buildPivotRowsForMetric(sprints, metric)),
    [sprints, variant, metric]
  );

  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
      {showTitle && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      {sprints.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No effort in scope.
        </Typography>
      ) : (
        <TableContainer sx={{ maxWidth: "100%", overflow: "auto" }}>
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
                <TableRow
                  key={row.id}
                  hover
                  sx={row.id === "total" ? { "& td, & th": { fontWeight: 600, bgcolor: "action.hover" } } : undefined}
                >
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
    </Paper>
  );
}
