import { Box, Button, TextField, Typography } from "../primitives";
import type { SprintReportFilters } from "../../types/sprintPerformanceReport";
import type { SprintPerformanceFilterOptionsResponse } from "../../types/sprintPerformanceReport";
import { SearchableSelect } from "../semantic";

export interface ReportFilterBarProps {
  filters: SprintReportFilters;
  onChange: (patch: Partial<SprintReportFilters>) => void;
  onRunReport: () => void;
  loading: boolean;
  options: SprintPerformanceFilterOptionsResponse;
  optionsLoading: boolean;
}

export default function ReportFilterBar({
  filters,
  onChange,
  onRunReport,
  loading,
  options,
  optionsLoading,
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
          Sprint
        </Typography>
        <SearchableSelect
          label=""
          valueId={filters.sprintId}
          options={options.sprints}
          onChangeId={(id) => onChange({ sprintId: id })}
          placeholder={optionsLoading ? "Loading..." : "Select sprint"}
          disabled={optionsLoading}
          fullWidth={false}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Feature
        </Typography>
        <SearchableSelect
          label=""
          valueId={filters.featureId}
          options={options.features}
          onChangeId={(id) => onChange({ featureId: id })}
          placeholder={optionsLoading ? "Loading..." : "Select feature"}
          disabled={optionsLoading}
          fullWidth={false}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Owner
        </Typography>
        <SearchableSelect
          label=""
          valueId={filters.ownerId}
          options={options.owners}
          onChangeId={(id) => onChange({ ownerId: id })}
          placeholder={optionsLoading ? "Loading..." : "Select owner"}
          disabled={optionsLoading}
          fullWidth={false}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Activity (task)
        </Typography>
        <SearchableSelect
          label=""
          valueId={filters.taskId}
          options={options.tasks}
          onChangeId={(id) => onChange({ taskId: id })}
          placeholder={optionsLoading ? "Loading..." : "Select task"}
          disabled={optionsLoading}
          fullWidth={false}
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
