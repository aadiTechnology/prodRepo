import { Chip, alpha } from "@mui/material";
import { type ListConfig } from "../../components/reusable/listFramework.types";
import StatusChip from "../../components/roles/StatusChip";
import { colorTokens } from "../../tokens/colors";

// Flattened row type for display (one row per academic year - class - subject_type combination)
export interface SubjectClassRow {
  id: string; // unique identifier for this row
  subject_id: number;  // first subject ID (used for edit navigation)
  subject_ids: number[]; // ALL subject IDs in this grouped row (used for delete)
  academic_year_id?: number; // For loading all subjects in edit mode
  class_id?: number; // For loading all subjects in edit mode
  subject_name: string;
  subject_code: string;
  subject_type: string; // Single type for this row
  subject_types: string[]; // array (for compatibility, will have single element)
  academic_year_name: string;
  class_name: string;
  is_active: boolean;
  is_mandatory: boolean;
}

type SubjectListConfigArgs = {
  navigate: (path: string, options?: any) => void;
  onDeleteClick?: (row: SubjectClassRow) => void;
};

export const createSubjectListConfig = ({
  navigate,
  onDeleteClick,
}: SubjectListConfigArgs): ListConfig<SubjectClassRow> => ({
  columns: [
    {
      id: "academic_year_name",
      label: "Academic Year",
      width: "15%",
      render: (row: SubjectClassRow) => row.academic_year_name || "-",
    },
    {
      id: "class_name",
      label: "Class",
      width: "15%",
      render: (row: SubjectClassRow) => row.class_name || "-",
    },
    {
      id: "subject_name",
      label: "Subject",
      width: "20%",
      render: (row: SubjectClassRow) => row.subject_name || "-",
    },
    {
      id: "subject_code",
      label: "Code",
      width: "12%",
      render: (row: SubjectClassRow) => row.subject_code || "-",
    },
    {
      id: "subject_type",
      label: "Type",
      width: "12%",
      align: "center",
      render: (row: SubjectClassRow) => (
        <Chip
          label={row.subject_type}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: "0.75rem",
            bgcolor: alpha(colorTokens.primary.main, 0.1),
            color: colorTokens.primary.main,
            borderRadius: "6px",
          }}
        />
      ),
    },
    {
      id: "status",
      label: "Status",
      width: "12%",
      align: "center",
      render: (row: SubjectClassRow) => <StatusChip status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ],

  sortOptions: [
    { id: "subject_name-asc", label: "Subject (A-Z)", sortBy: "subject_name", sortOrder: "asc" },
    { id: "subject_name-desc", label: "Subject (Z-A)", sortBy: "subject_name", sortOrder: "desc" },
    { id: "class_name-asc", label: "Class (A-Z)", sortBy: "class_name", sortOrder: "asc" },
    { id: "class_name-desc", label: "Class (Z-A)", sortBy: "class_name", sortOrder: "desc" },
  ],
  uiPolicy: {
    emptyMessage: "No subjects found. Click 'Add Subject' to begin.",
    errorFallbackMessage: "Failed to load subjects.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: (row: SubjectClassRow) => ({
      onEdit: () => navigate(`/subjects/${row.subject_id}/edit`, { 
        state: { 
          academic_year_id: row.academic_year_id, 
          class_id: row.class_id,
          subject_type: row.subject_type
        } 
      }),
      onDelete: onDeleteClick ? () => onDeleteClick(row) : undefined,
    }),
  },
});
