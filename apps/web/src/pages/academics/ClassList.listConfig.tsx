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
      id: "name",
      label: "Class Name",
      field: "name",
    },
    {
      id: "section",
      label: "Section",
      align: "center",
      render: (row: SchoolClass) => 
        row.divisions && row.divisions.length > 0 
          ? row.divisions.map(d => d.division_name).join(", ") 
          : "-",
    },
    {
      id: "capacity",
      label: "Capacity",
      align: "center",
      render: (row: SchoolClass) => row.capacity ?? "-",
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
