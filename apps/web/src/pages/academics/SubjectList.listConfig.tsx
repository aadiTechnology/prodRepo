import { type SubjectResponse } from "../../api/services/subjectService";
import { type ListConfig } from "../../components/reusable/listFramework.types";
import StatusChip from "../../components/roles/StatusChip";
import { TableRowActions } from "../../components/reusable";

type SubjectListConfigArgs = {
  navigate: (path: string) => void;
  onDeleteClick?: (subject: SubjectResponse) => void;
};

export const createSubjectListConfig = ({
  navigate,
  onDeleteClick,
}: SubjectListConfigArgs): ListConfig<SubjectResponse> => ({
  columns: [
    {
      id: "name",
      label: "Subject Name",
      field: "name",
    },
    {
      id: "code",
      label: "Code",
      field: "code",
    },
    {
      id: "subject_type",
      label: "Type",
      field: "subject_type",
      align: "center",
    },
    {
      id: "applicable_classes",
      label: "Applicable Classes",
      render: (row: SubjectResponse) => {
        if (!row.classes || row.classes.length === 0) return "-";
        return row.classes.map(c => c.class_name).join(", ");
      },
    },
    {
      id: "status",
      label: "Status",
      align: "center",
      render: (row: SubjectResponse) => <StatusChip status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ],
  sortOptions: [
    { id: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" },
    { id: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" },
  ],
  uiPolicy: {
    emptyMessage: "No subjects found. Click 'Add Subject' to begin.",
    errorFallbackMessage: "Failed to load subjects.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: (subject: SubjectResponse) => ({
      onEdit: () => navigate(`/subjects/${subject.id}/edit`),
      onDelete: onDeleteClick ? () => onDeleteClick(subject) : undefined,
    }),
  },
});
