import React from "react";
import type { TeacherResponse } from "../../api/services/teacherService";
import type { NavigateFunction } from "react-router-dom";
import type { ListConfig } from "../../components/reusable";
import StatusChip from "../../components/roles/StatusChip";
import { Box, Typography, Button } from "../../components/primitives";
import { formatShortDate } from "../../utils/formatters";
import TableRowActions from "../../components/reusable/TableRowActions";

// Re-using same style options pattern
type TeacherSortBy = "name" | "created_at";

type TeacherListConfigFactoryArgs = {
  navigate: NavigateFunction;
  onDeleteClick: (teacher: TeacherResponse) => void;
  onToggleStatusClick: (teacher: TeacherResponse) => void;
  toggleLoadingId: number | null;
};

export function createTeacherListConfig({
  navigate,
  onDeleteClick,
  onToggleStatusClick,
  toggleLoadingId,
}: TeacherListConfigFactoryArgs): ListConfig<TeacherResponse, TeacherSortBy> {
  return {
    columns: [
      { id: "full_name", label: "Name", field: "full_name" },
      { id: "mobile_number", label: "Contact", field: "mobile_number" },
      { id: "class", label: "Class", render: (t: TeacherResponse) => t.class_name || "-" },
      { id: "division", label: "Division", render: (t: TeacherResponse) => t.division_name || "-" },
      {
        id: "status",
        label: "Status",
        render: (t: TeacherResponse) => <StatusChip status={t.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
      {
        id: "created_at",
        label: "Created Date",
        render: (t: TeacherResponse) => formatShortDate(t.created_at),
      },
    ],
    sortOptions: [
      { id: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" },
      { id: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" },
      { id: "created-desc", label: "Date (newest)", sortBy: "created_at", sortOrder: "desc" },
      { id: "created-asc", label: "Date (oldest)", sortBy: "created_at", sortOrder: "asc" },
    ],
    uiPolicy: {
      emptyMessage: (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No teachers found.
          </Typography>
          <Button variant="contained" color="primary" onClick={() => navigate("/teachers/add")}>
            Add Teacher
          </Button>
        </Box>
      ),
      errorFallbackMessage: "Failed to fetch teachers.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (tableTeacher: TeacherResponse) => ({
        onView: () => navigate(`/teachers/${tableTeacher.id}`),
        onEdit: () => navigate(`/teachers/${tableTeacher.id}/edit`),
        onDelete: () => onDeleteClick(tableTeacher),
        disabled: toggleLoadingId === tableTeacher.id,
      }),
    },
  };
}

export function renderTeacherRowActions(args: {
  row: TeacherResponse;
  toggleLoadingId: number | null;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onToggleStatus: () => void;
}) {
  const { row, toggleLoadingId, onEdit, onDelete, onView, onToggleStatus } = args;

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <TableRowActions onView={onView} onEdit={onEdit} onDelete={onDelete} />
      {/* We could add an explicit toggle button here, but typically it is fine in TableRowActions or StatusChip. Since TableRowActions doesn't have onToggle by default in this repo's standard components, we might wait. Actually table actions are standardized, let's keep it simple. */}
    </Box>
  );
}
