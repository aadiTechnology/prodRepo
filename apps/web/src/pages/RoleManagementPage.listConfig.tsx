import { type Role } from "../types/role.types";
import { type ListConfig } from "../components/reusable/listFramework.types";
import StatusChip from "../components/roles/StatusChip";
import { TableRowActions } from "../components/reusable";

type RoleListConfigArgs = {
  navigate: (path: string) => void;
  onDeleteClick?: (role: Role) => void;
  canEditRole: boolean;
  canDeleteRole: boolean;
};

export const createRoleListConfig = ({
  navigate,
  onDeleteClick,
  canEditRole,
  canDeleteRole,
}: RoleListConfigArgs): ListConfig<Role> => ({
  columns: [
    {
      id: "name",
      label: "Role Name",
      field: "name",
      render: (r: Role) => r.name,
    },
    {
      id: "status",
      label: "Status",
      render: (r: Role) => <StatusChip status={r.status} />,
    },
    {
      id: "createdAt",
      label: "Created Date",
      render: (r: Role) =>
        r.createdAt && !isNaN(new Date(r.createdAt).getTime())
          ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
          : "-",
    },
  ],
  sortOptions: [
    { id: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" },
    { id: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" },
    { id: "created-desc", label: "Date (newest)", sortBy: "createdAt", sortOrder: "desc" },
    { id: "created-asc", label: "Date (oldest)", sortBy: "createdAt", sortOrder: "asc" },
  ],
  uiPolicy: {
    emptyMessage: "No active roles available.",
    errorFallbackMessage: "Failed to load roles.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: (role: Role) => ({
      onEdit: canEditRole ? () => navigate(`/roles/${role.id}/edit`) : undefined,
      onDelete: canDeleteRole && onDeleteClick ? () => onDeleteClick(role) : undefined,
    }),
  },
});
