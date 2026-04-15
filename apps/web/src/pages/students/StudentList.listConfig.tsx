import type { NavigateFunction } from "react-router-dom";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {row.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </Avatar>
            <Typography variant="body2">{row.name}</Typography>
          </Box>
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
        onEdit: () => navigate(`/students/${row.id}/edit`),
        onDelete: () => onDeleteClick(row),
      }),
    },
  };
}

export function renderStudentRowActions({
  row,
  onEdit,
  onDelete,
}: {
  row: Student;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={onEdit} color="primary">
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" onClick={onDelete} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
