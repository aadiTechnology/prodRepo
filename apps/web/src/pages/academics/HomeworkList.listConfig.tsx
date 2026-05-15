import { Chip, alpha } from "@mui/material";
import { colorTokens } from "../../tokens/colors";
import type { ListConfig } from "../../components/reusable/listFramework.types";
import type { HomeworkResponse } from "../../api/services/homeworkService";

export type HomeworkRow = HomeworkResponse;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function computeDisplayStatus(row: HomeworkRow): { label: string; color: string } {
  if (row.status === "Draft") {
    return { label: "Draft", color: colorTokens.text.secondary };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const submission = new Date(row.submission_date);
  if (submission < today) {
    return { label: "Overdue", color: colorTokens.preschool.coral.main };
  }
  return { label: "Active", color: colorTokens.preschool.mint.main };
}

type HomeworkListConfigArgs = {
  navigate: (path: string) => void;
  onDeleteClick?: (row: HomeworkRow) => void;
  onViewClick?: (row: HomeworkRow) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

export const createHomeworkListConfig = ({
  navigate,
  onDeleteClick,
  onViewClick,
  canEdit = true,
  canDelete = true,
}: HomeworkListConfigArgs): ListConfig<HomeworkRow> => ({
  columns: [
    {
      id: "title",
      label: "Title",
      width: "22%",
      render: (row: HomeworkRow) => (
        <span style={{ fontWeight: 600, color: colorTokens.text.primary }}>{row.title}</span>
      ),
    },
    {
      id: "subject_name",
      label: "Subject",
      width: "13%",
      render: (row: HomeworkRow) => row.subject_name ?? "—",
    },
    {
      id: "class_name",
      label: "Class",
      width: "10%",
      render: (row: HomeworkRow) => {
        const division = row.division_name ? ` (${row.division_name})` : "";
        return `${row.class_name ?? "—"}${division}`;
      },
    },
    {
      id: "assigned_date",
      label: "Assigned",
      width: "11%",
      render: (row: HomeworkRow) => formatDate(row.assigned_date),
    },
    {
      id: "submission_date",
      label: "Submission",
      width: "11%",
      render: (row: HomeworkRow) => formatDate(row.submission_date),
    },
    {
      id: "status",
      label: "Status",
      width: "10%",
      align: "center",
      render: (row: HomeworkRow) => {
        const { label, color } = computeDisplayStatus(row);
        return (
          <Chip
            label={label}
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              bgcolor: alpha(color, 0.1),
              color: color,
              border: `1px solid ${alpha(color, 0.2)}`,
              borderRadius: "6px",
              height: "22px",
            }}
          />
        );
      },
    },
    {
      id: "teacher_name",
      label: "Teacher",
      width: "13%",
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
    emptyMessage: "No homework found. Click 'Assign Homework' to create one.",
    errorFallbackMessage: "Failed to load homework list.",
    retryLabel: "Retry",
  },

  actions: {
    rowActions: (row: HomeworkRow) => ({
      onView: onViewClick
        ? () => onViewClick(row)
        : () => navigate(`/homework/${row.id}`),
      onEdit: canEdit ? () => navigate(`/homework/${row.id}/edit`) : undefined,
      onDelete: canDelete && onDeleteClick ? () => onDeleteClick(row) : undefined,
    }),
  },
});
