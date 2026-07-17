import { Box, Chip } from "@mui/material";
import type { ListConfig } from "../../components/reusable/listFramework.types";
import TableRowActions from "../../components/reusable/TableRowActions";
import type { HomeworkResponse } from "../../api/services/homeworkService";
import { formatHomeworkClassLabel } from "./AddHomework.formConfig";
import { isHomeworkEditDeleteAllowed } from "../../utils/homeworkEditWindow";
import { isDraftHomeworkStatus } from "../../utils/homeworkStatus";

export type HomeworkRow = HomeworkResponse;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function computeDisplayStatus(row: HomeworkRow): {
  label: string;
  color: "default" | "success" | "error" | "warning";
  variant: "filled" | "outlined";
} {
  if (isDraftHomeworkStatus(row.status)) {
    return { label: "Draft", color: "default", variant: "outlined" };
  }
  return { label: "Active", color: "success", variant: "filled" };
}

type HomeworkListConfigArgs = {
  navigate: (path: string) => void;
  onDeleteClick?: (row: HomeworkRow) => void;
  onViewClick?: (row: HomeworkRow) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  emptyMessage?: string;
};

export const createHomeworkListConfig = ({
  navigate,
  onDeleteClick,
  onViewClick,
  canEdit = true,
  canDelete = true,
  emptyMessage = "No homework found. Click 'Assign Homework' to create one.",
}: HomeworkListConfigArgs): ListConfig<HomeworkRow> => ({
  columns: [
    {
      id: "title",
      label: "Title",
      render: (row: HomeworkRow) => (
        <Box sx={{ whiteSpace: "nowrap" }}>{row.title}</Box>
      ),
    },
    {
      id: "subject_name",
      label: "Subject",
      render: (row: HomeworkRow) => row.subject_name ?? "—",
    },
    {
      id: "class_name",
      label: "Class",
      render: (row: HomeworkRow) => {
        const classLabel = row.class_name
          ? formatHomeworkClassLabel(row.class_name)
          : "—";
        const division = row.division_name
          ? ` (${formatHomeworkClassLabel(row.division_name)})`
          : "";
        return `${classLabel}${division}`;
      },
    },
    {
      id: "assigned_date",
      label: "Assigned",
      render: (row: HomeworkRow) => formatDate(row.assigned_date),
    },
    {
      id: "submission_date",
      label: "Submission",
      render: (row: HomeworkRow) => formatDate(row.submission_date),
    },
    {
      id: "status",
      label: "Status",
      align: "center",
      headerAlign: "center",
      render: (row: HomeworkRow) => {
        const { label, color, variant } = computeDisplayStatus(row);
        return (
          <Chip
            label={label}
            size="small"
            color={color}
            variant={variant}
          />
        );
      },
    },
    {
      id: "teacher_name",
      label: "Teacher",
      render: (row: HomeworkRow) => row.teacher_name ?? "—",
    },
  ],

  sortOptions: [
    { id: "title-asc", label: "Title (A–Z)", sortBy: "title", sortOrder: "asc" },
    { id: "title-desc", label: "Title (Z–A)", sortBy: "title", sortOrder: "desc" },
    { id: "submission_date-asc", label: "Submission (earliest)", sortBy: "submission_date", sortOrder: "asc" },
    { id: "submission_date-desc", label: "Submission (latest)", sortBy: "submission_date", sortOrder: "desc" },
  ],

  uiPolicy: {
    emptyMessage,
    errorFallbackMessage: "Failed to load homework list.",
    retryLabel: "Retry",
  },

  actions: {
    rowActions: (row: HomeworkRow) => {
      const withinEditWindow = isHomeworkEditDeleteAllowed(row);
      return {
        onView: onViewClick
          ? () => onViewClick(row)
          : () => navigate(`/homework/${row.id}`),
        onEdit:
          canEdit && withinEditWindow ? () => navigate(`/homework/${row.id}/edit`) : undefined,
        onDelete:
          canDelete && withinEditWindow && onDeleteClick
            ? () => onDeleteClick(row)
            : undefined,
      };
    },
  },
});

export function renderHomeworkRowActions(args: {
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { onView, onEdit, onDelete } = args;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "nowrap",
        whiteSpace: "nowrap",
      }}
    >
      <TableRowActions onView={onView} onEdit={onEdit} onDelete={onDelete} />
    </Box>
  );
}
