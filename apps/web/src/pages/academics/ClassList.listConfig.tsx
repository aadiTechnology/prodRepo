import { type SchoolClass } from "../../api/services/schoolClassService";
import { type ListConfig } from "../../components/reusable/listFramework.types";
import StatusChip from "../../components/roles/StatusChip";
import { formatClassDisplayLabel } from "../../utils/formatters";

type ClassListConfigArgs = {
  navigate: (path: string) => void;
  onDeleteClick?: (schoolClass: SchoolClass) => void;
};

function getActiveDivisions(row: SchoolClass) {
  return row.divisions?.filter((d) => d.is_active) ?? [];
}

export const createClassListConfig = ({
  navigate,
  onDeleteClick,
}: ClassListConfigArgs): ListConfig<SchoolClass> => ({
  columns: [
    {
      id: "name",
      label: "Class",
      render: (row: SchoolClass) => formatClassDisplayLabel(row.name) || "-",
    },
    {
      id: "division",
      label: "Division",
      align: "center",
      render: (row: SchoolClass) => {
        const activeDivisions = getActiveDivisions(row);
        if (activeDivisions.length === 0) return "-";
        return activeDivisions
          .map((d) => formatClassDisplayLabel(d.division_name))
          .join(", ");
      },
    },
    {
      id: "students",
      label: "Students",
      align: "center",
      render: (row: SchoolClass) => {
        const activeDivisions = getActiveDivisions(row);
        if (activeDivisions.length === 0) return "-";
        return activeDivisions
          .map((d) => `${formatClassDisplayLabel(d.division_name)}: ${d.student_count ?? 0}`)
          .join(", ");
      },
    },
    {
      id: "capacity",
      label: "Seat Capacity",
      align: "center",
      render: (row: SchoolClass) => {
        const activeDivisions = getActiveDivisions(row);
        if (activeDivisions.length === 0) return "-";
        return activeDivisions
          .map((d) => `${formatClassDisplayLabel(d.division_name)}: ${d.capacity ?? "-"}`)
          .join(", ");
      },
    },
    {
      id: "status",
      label: "Status",
      align: "center",
      render: (row: SchoolClass) => <StatusChip status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ],
  sortOptions: [
    { id: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" },
    { id: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" },
  ],
  uiPolicy: {
    emptyMessage: "No class divisions found. Click 'Add Class - Division' to begin.",
    errorFallbackMessage: "Failed to load class divisions.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: (schoolClass: SchoolClass) => ({
      onEdit: () => navigate(`/classes/${schoolClass.id}/edit`),
      onDelete: onDeleteClick ? () => onDeleteClick(schoolClass) : undefined,
    }),
  },
});
