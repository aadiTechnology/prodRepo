import { type AcademicYear } from "../../api/services/academicYearService";
import { type ListConfig } from "../../components/reusable/listFramework.types";
import StatusChip from "../../components/roles/StatusChip";

type AcademicYearListConfigArgs = {
  navigate: (path: string) => void;
  onDeleteClick?: (academicYear: AcademicYear) => void;
};

export const createAcademicYearListConfig = ({
  navigate,
  onDeleteClick,
}: AcademicYearListConfigArgs): ListConfig<AcademicYear> => ({
  columns: [
    {
      id: "name",
      label: "Academic Year",
      field: "name",
    },
    {
      id: "code",
      label: "Code",
      align: "center",
      field: "code",
    },
    {
      id: "start_date",
      label: "Start Date",
      align: "center",
      render: (row: AcademicYear) =>
        row.start_date && !isNaN(new Date(row.start_date).getTime())
          ? new Date(row.start_date).toLocaleDateString("en-US")
          : "-",
    },
    {
      id: "end_date",
      label: "End Date",
      align: "center",
      render: (row: AcademicYear) =>
        row.end_date && !isNaN(new Date(row.end_date).getTime())
          ? new Date(row.end_date).toLocaleDateString("en-US")
          : "-",
    },
    {
      id: "status",
      label: "Status",
      align: "center",
      render: (row: AcademicYear) => <StatusChip status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ],
  sortOptions: [
    { id: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" },
    { id: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" },
    { id: "start-desc", label: "Start Date (newest)", sortBy: "start_date", sortOrder: "desc" },
    { id: "start-asc", label: "Start Date (oldest)", sortBy: "start_date", sortOrder: "asc" },
  ],
  uiPolicy: {
    emptyMessage: "No academic years found. Click 'Add Academic Year' to begin.",
    errorFallbackMessage: "Failed to load academic years.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: (academicYear: AcademicYear) => ({
      onEdit: () => navigate(`/academic-years/${academicYear.id}/edit`),
      onDelete: onDeleteClick ? () => onDeleteClick(academicYear) : undefined,
    }),
  },
});
