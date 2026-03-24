import type { User as AuthUser } from "../types/auth";
import { type ListConfig } from "../components/reusable";
import StatusChip from "../components/roles/StatusChip";
import { Box, Typography, Button } from "../components/primitives";
import type { UsersSortBy } from "../hooks";
import { formatShortDate, toRoleLabel } from "../utils/formatters";

type CreateUsersListConfigArgs = {
  onAddUser: () => void;
  onEditUser: (user: AuthUser) => void;
  onDeleteUser: (user: AuthUser) => void;
};

export function createUsersListConfig({
  onAddUser,
  onEditUser,
  onDeleteUser,
}: CreateUsersListConfigArgs): ListConfig<AuthUser, UsersSortBy> {
  return {
    columns: [
      { id: "full_name", label: "Full Name", field: "full_name", render: (u) => u.full_name },
      { id: "email", label: "Email", field: "email" },
      { id: "phone_number", label: "Phone Number", render: (u) => u.phone_number || "-" },
      { id: "role", label: "Role", render: (u) => toRoleLabel(u.role) },
      {
        id: "status",
        label: "Status",
        render: (u) => <StatusChip status={u.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
      {
        id: "created_at",
        label: "Created Date",
        render: (u) => formatShortDate(u.created_at),
      },
    ],
    sortOptions: [
      { id: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" },
      { id: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" },
      { id: "created-desc", label: "Date (newest)", sortBy: "created_at", sortOrder: "desc" },
      { id: "created-asc", label: "Date (oldest)", sortBy: "created_at", sortOrder: "asc" },
    ],
    uiPolicy: {
      emptyMessage: (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No users available.
          </Typography>
          <Button variant="contained" color="primary" onClick={onAddUser}>
            Add User
          </Button>
        </Box>
      ),
      errorFallbackMessage: "Failed to fetch users.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (tableUser) => ({
        onEdit: () => onEditUser(tableUser),
        onDelete: () => onDeleteUser(tableUser),
      }),
    },
  };
}
