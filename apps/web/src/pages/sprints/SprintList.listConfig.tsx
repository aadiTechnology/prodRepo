import type { NavigateFunction } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import type { Sprint } from "../../types/sprint";
import type { ListConfig } from "../../components/reusable";
import TableRowActions from "../../components/reusable/TableRowActions";
import StatusChip from "../../components/roles/StatusChip";
import { formatShortDate } from "../../utils/formatters";
import type { SprintListSortBy } from "../../hooks/useSprintListController";

type SprintListConfigFactoryArgs = {
  navigate: NavigateFunction;
  onDeleteClick: (sprint: Sprint) => void;
};

export function createSprintListConfig({
  navigate,
  onDeleteClick,
}: SprintListConfigFactoryArgs): ListConfig<Sprint, SprintListSortBy> {
  return {
    columns: [
      { id: "sprint_id", label: "ID", field: "sprint_id" },
      { id: "sprint_name", label: "Sprint Name", render: (r) => r.sprint_name || "—" },
      { id: "start_date", label: "Start", render: (r) => (r.start_date ? formatShortDate(r.start_date) : "—") },
      { id: "end_date", label: "End", render: (r) => (r.end_date ? formatShortDate(r.end_date) : "—") },
      {
        id: "status",
        label: "Status",
        render: (r) => (
          <StatusChip status={r.is_completed ? "COMPLETED" : r.is_active ? "ACTIVE" : "INACTIVE"} />
        ),
      },
    ],
    sortOptions: [
      { id: "id-asc", label: "ID (ascending)", sortBy: "sprint_id", sortOrder: "asc" },
      { id: "id-desc", label: "ID (descending)", sortBy: "sprint_id", sortOrder: "desc" },
      { id: "name-asc", label: "Name (A-Z)", sortBy: "sprint_name", sortOrder: "asc" },
      { id: "name-desc", label: "Name (Z-A)", sortBy: "sprint_name", sortOrder: "desc" },
    ],
    uiPolicy: {
      emptyMessage: (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No sprints found.
          </Typography>
          <Button variant="contained" color="primary" onClick={() => navigate("/sprints/add")}>
            Add Sprint
          </Button>
        </Box>
      ),
      errorFallbackMessage: "Failed to fetch sprints.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (row) => ({
        onEdit: () => navigate(`/sprints/${row.sprint_id}/edit`),
        onDelete: () => onDeleteClick(row),
      }),
    },
  };
}

export function renderSprintRowActions(args: {
  row: Sprint;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { onEdit, onDelete } = args;
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <TableRowActions onEdit={onEdit} onDelete={onDelete} />
    </Box>
  );
}

