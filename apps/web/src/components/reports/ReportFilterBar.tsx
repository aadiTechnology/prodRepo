import { Autocomplete, Box, Button, TextField, Typography } from "../primitives";
import type { ReportOption } from "../../types/sprintPerformanceReport";
import type { SprintReportFilters } from "../../types/sprintPerformanceReport";
import type { SprintPerformanceFilterOptionsResponse } from "../../types/sprintPerformanceReport";
import type { ReportProjectOption } from "../../api/services/reportProjectService";
import { SearchableSelect } from "../semantic";

export interface ReportFilterBarProps {
  projectId: number | null;
  projects: ReportProjectOption[];
  projectsLoading: boolean;
  onProjectIdChange: (id: number | null) => void;
  filters: SprintReportFilters;
  onChange: (patch: Partial<SprintReportFilters>) => void;
  onRunReport: () => void;
  loading: boolean;
  options: SprintPerformanceFilterOptionsResponse;
  optionsLoading: boolean;
}

export default function ReportFilterBar({
  projectId,
  projects,
  projectsLoading,
  onProjectIdChange,
  filters,
  onChange,
  onRunReport,
  loading,
  options,
  optionsLoading,
}: ReportFilterBarProps) {
  const categoryValue = options.categories.filter((c) => filters.categoryIds.includes(c.id));
  const filtersDisabled = projectId == null || optionsLoading;

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
      <Box sx={{ minWidth: 240 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Project
        </Typography>
        <SearchableSelect
          label=""
          valueId={projectId}
          options={projects}
          onChangeId={(id) => onProjectIdChange(id)}
          placeholder={projectsLoading ? "Loading…" : "Select project"}
          disabled={projectsLoading}
          fullWidth={false}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          Sprint
        </Typography>
        <SearchableSelect
          label=""
          valueId={filters.sprintId}
          options={options.sprints}
          onChangeId={(id) => onChange({ sprintId: id })}
          placeholder={optionsLoading ? "Loading…" : "Select sprint"}
          disabled={filtersDisabled}
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
          placeholder={optionsLoading ? "Loading…" : "Select feature"}
          disabled={filtersDisabled}
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
          placeholder={optionsLoading ? "Loading…" : "Select owner"}
          disabled={filtersDisabled}
          fullWidth={false}
        />
      </Box>
      <Box sx={{ minWidth: 220 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          Task categories
        </Typography>
        <Autocomplete<ReportOption, true, false, false>
          multiple
          disableCloseOnSelect
          options={options.categories}
          value={categoryValue}
          disabled={filtersDisabled}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_e, v) => onChange({ categoryIds: v.map((x) => x.id) })}
          renderInput={(params) => (
            <TextField {...params} placeholder={optionsLoading ? "Loading…" : "Categories"} size="small" />
          )}
          sx={{ minWidth: 220 }}
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
          placeholder={optionsLoading ? "Loading…" : "Select task"}
          disabled={filtersDisabled}
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
      <Button variant="contained" onClick={onRunReport} disabled={loading || projectId == null}>
        {loading ? "Loading…" : "Run report"}
      </Button>
    </Box>
  );
}
