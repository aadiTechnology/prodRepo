import { Box, Button, MenuItem, Select, TextField, Typography } from "../primitives";
import type { SprintReportFilters } from "../../types/sprintPerformanceReport";

export interface EmployeeOption {
  id: number;
  label: string;
}

export interface ReportFilterBarProps {
  filters: SprintReportFilters;
  onChange: (patch: Partial<SprintReportFilters>) => void;
  onRunReport: () => void;
  loading: boolean;
  employees: EmployeeOption[];
}

export default function ReportFilterBar({
  filters,
  onChange,
  onRunReport,
  loading,
  employees,
}: ReportFilterBarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        alignItems: "flex-end",
        py: 1,
      }}
    >
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Sprint (#)
        </Typography>
        <TextField
          size="small"
          value={filters.sprint}
          onChange={(e) => onChange({ sprint: e.target.value })}
          placeholder="e.g. 12"
          sx={{ width: 100 }}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Feature / area (team filter)
        </Typography>
        <TextField
          size="small"
          value={filters.team}
          onChange={(e) => onChange({ team: e.target.value })}
          placeholder="FeatureName contains"
          sx={{ minWidth: 180 }}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Employee
        </Typography>
        <Select
          size="small"
          value={filters.employeeId}
          displayEmpty
          onChange={(e) => onChange({ employeeId: e.target.value as string, ownerName: "" })}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All</MenuItem>
          {employees.map((e) => (
            <MenuItem key={e.id} value={String(e.id)}>
              {e.label}
            </MenuItem>
          ))}
        </Select>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Owner name (exact)
        </Typography>
        <TextField
          size="small"
          value={filters.ownerName}
          onChange={(e) => onChange({ ownerName: e.target.value, employeeId: "" })}
          placeholder="If no employee list"
          disabled={Boolean(filters.employeeId)}
          sx={{ minWidth: 180 }}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Activity (TaskType)
        </Typography>
        <TextField
          size="small"
          value={filters.activityType}
          onChange={(e) => onChange({ activityType: e.target.value })}
          placeholder="Contains"
          sx={{ minWidth: 140 }}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          From
        </Typography>
        <TextField
          type="date"
          size="small"
          value={filters.fromDate}
          onChange={(e) => onChange({ fromDate: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          To
        </Typography>
        <TextField
          type="date"
          size="small"
          value={filters.toDate}
          onChange={(e) => onChange({ toDate: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
      </Box>
      <Button variant="contained" onClick={onRunReport} disabled={loading}>
        {loading ? "Loading…" : "Run report"}
      </Button>
    </Box>
  );
}
