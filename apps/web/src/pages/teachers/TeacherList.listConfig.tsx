import type { TeacherResponse } from "../../api/services/teacherService";
import type { NavigateFunction } from "react-router-dom";
import type { ListConfig } from "../../components/reusable";
import StatusChip from "../../components/roles/StatusChip";
import { formatClassDisplayLabel, formatShortDate } from "../../utils/formatters";

type TeacherSortBy = "name" | "created_at";

function formatTeacherClassName(t: TeacherResponse): string {
  const fromAssignments = (t.assignment_rows ?? [])
    .map((row) => row.class_name)
    .filter(Boolean);
  if (fromAssignments.length) {
    return [...new Set(fromAssignments)]
      .map((name) => formatClassDisplayLabel(name) || name)
      .join(", ");
  }
  if (t.class_name) return formatClassDisplayLabel(t.class_name) || t.class_name;
  return "-";
}

function formatTeacherDivisionName(t: TeacherResponse): string {
  const fromAssignments = (t.assignment_rows ?? []).flatMap((row) => row.division_names ?? []);
  if (fromAssignments.length) {
    return [...new Set(fromAssignments)]
      .map((name) => formatClassDisplayLabel(name) || name)
      .join(", ");
  }
  if (t.division_name) return formatClassDisplayLabel(t.division_name) || t.division_name;
  return "-";
}

type TeacherListConfigFactoryArgs = {
  navigate: NavigateFunction;
  onDeleteClick: (teacher: TeacherResponse) => void;
};

export function createTeacherListConfig({
  navigate,
  onDeleteClick,
}: TeacherListConfigFactoryArgs): ListConfig<TeacherResponse, TeacherSortBy> {
  return {
    columns: [
      { id: "full_name", label: "Name", field: "full_name" },
      { id: "mobile_number", label: "Contact", field: "mobile_number" },
      {
        id: "class",
        label: "Class",
        render: (t: TeacherResponse) => formatTeacherClassName(t),
      },
      {
        id: "division",
        label: "Division",
        align: "center",
        render: (t: TeacherResponse) => formatTeacherDivisionName(t),
      },
      {
        id: "status",
        label: "Status",
        align: "center",
        render: (t: TeacherResponse) => <StatusChip status={t.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
      {
        id: "created_at",
        label: "Created Date",
        align: "center",
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
      emptyMessage: "No teachers found. Click 'Add Teacher' to begin.",
      errorFallbackMessage: "Failed to load teachers.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (teacher: TeacherResponse) => ({
        onView: () => navigate(`/teachers/${teacher.id}`),
        onEdit: () => navigate(`/teachers/${teacher.id}/edit`),
        onDelete: () => onDeleteClick(teacher),
      }),
    },
  };
}
