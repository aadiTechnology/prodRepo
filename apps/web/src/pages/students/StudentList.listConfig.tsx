import type { NavigateFunction } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import StatusChip from "../../components/roles/StatusChip";
import type { Student } from "../../types/student";
import type { ListConfig } from "../../components/reusable";

export function createStudentListConfig({
  navigate,
  onDeleteClick,
}: {
  navigate: NavigateFunction;
  onDeleteClick: (student: Student) => void;
}): ListConfig<Student, "name" | "created_at"> {
  return {
    columns: [
      {
        id: "roll_no",
        label: "Roll Number",
        field: "roll_no",
        render: (row) => (row as Student)?.roll_no ?? "-",
      },
      {
        id: "name",
        label: "Student Name",
        render: (row) => (
          <Typography variant="body2" sx={{ fontWeight: 400, color: "text.primary", fontSize: "0.9rem" }}>
            {row.name}
          </Typography>
        ),
      },
      {
        id: "gender",
        label: "Gender",
        field: "gender",
      },
      {
        id: "mobile",
        label: "Mobile Number",
        field: "mobile",
      },
      {
        id: "class",
        label: "Class",
        field: "class",
      },
      {
        id: "status",
        label: "Status",
        render: (row) => <StatusChip status={row.status === "Active" ? "ACTIVE" : "INACTIVE"} />,
      },
    ],
    uiPolicy: {
      emptyMessage: "No students available",
      errorFallbackMessage: "Failed to load students. Please try again.",
      retryLabel: "Retry",
    },
    sortOptions: [
      { id: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" },
      { id: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" },
      { id: "created_at-desc", label: "Newest First", sortBy: "created_at", sortOrder: "desc" },
      { id: "created_at-asc", label: "Oldest First", sortBy: "created_at", sortOrder: "asc" },
    ],
    actions: {
      rowActions: (row) => ({
        onEdit: () => navigate(`/admissions/enrollment?studentId=${row.id}&mode=edit`),
        onDelete: () => onDeleteClick(row),
      }),
    },
  };
}

export function renderStudentRowActions({
  row,
  onView,
  onEdit,
  onDelete,
}: {
  row: Student;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Tooltip title="View">
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onView();
          }}
          color="info"
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          color="primary"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          color="error"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
