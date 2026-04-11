import { type SchoolClass } from "../../api/services/schoolClassService";
import { type ListConfig } from "../../components/reusable/listFramework.types";
import StatusChip from "../../components/roles/StatusChip";
import { TableRowActions } from "../../components/reusable";

type ClassListConfigArgs = {
  navigate: (path: string) => void;
  onDeleteClick?: (schoolClass: SchoolClass) => void;
};

export const createClassListConfig = ({
  navigate,
  onDeleteClick,
}: ClassListConfigArgs): ListConfig<SchoolClass> => ({
  columns: [
    {
      id: "academic_year",
      label: "Academic Year",
      render: (row: SchoolClass) => row.academic_year_name ?? "-",
    },
    {
      id: "name",
      label: "Class",
      field: "name",
    },
    {
      id: "division",
      label: "Division",
      align: "center",
      render: (row: SchoolClass) => {
        const activeDivisions = row.divisions?.filter(d => d.is_active) ?? [];
        return activeDivisions.length > 0 
          ? activeDivisions.map(d => d.division_name).join(", ") 
          : "-";
      },
    },
    {
      id: "capacity",
      label: "Capacity",
      align: "center",
      render: (row: SchoolClass) => {
        const activeDivisions = row.divisions?.filter(d => d.is_active) ?? [];
        if (activeDivisions.length === 0) return "-";
        const totalCapacity = activeDivisions.reduce((sum, d) => sum + (Number(d.capacity) || 0), 0);
        return totalCapacity || "-";
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
    emptyMessage: "No classes found. Click 'Add Class' to begin.",
    errorFallbackMessage: "Failed to load classes.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: (schoolClass: SchoolClass) => ({
      onEdit: () => navigate(`/classes/${schoolClass.id}/edit`),
      onDelete: onDeleteClick ? () => onDeleteClick(schoolClass) : undefined,
    }),
  },
});
