import type { User as AuthUser } from "../types/auth";
import type { NavigateFunction } from "react-router-dom";
import type { ListConfig } from "../components/reusable";
import type { UsersSortBy } from "../hooks";
import StatusChip from "../components/roles/StatusChip";
import { Box, Typography, Button } from "../components/primitives";
import { formatShortDate, toRoleLabel } from "../utils/formatters";
import {
  Login as LoginIcon,
} from "@mui/icons-material";
import {
  IconButton,
  Tooltip,
  CircularProgress,
  alpha,
} from "@mui/material";
import TableRowActions from "../components/reusable/TableRowActions";
import { colorTokens } from "../tokens/colors";

type UsersListConfigFactoryArgs = {
  navigate: NavigateFunction;
  onDeleteClick: (user: AuthUser) => void;
  onLoginAsUser: (userId: number) => Promise<void>;
  canLoginAsUser: boolean;
  impersonationLoading: number | null;
};

export function createUsersListConfig({
  navigate,
  onDeleteClick,
  onLoginAsUser,
  canLoginAsUser,
  impersonationLoading,
}: UsersListConfigFactoryArgs): ListConfig<AuthUser, UsersSortBy> {
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
          <Button variant="contained" color="primary" onClick={() => navigate("/user/create")}>
            Add User
          </Button>
        </Box>
      ),
      errorFallbackMessage: "Failed to fetch users.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (tableUser) => ({
        onEdit: () => navigate("/user/create", { state: { user: tableUser, isEdit: true } }),
        onDelete: () => onDeleteClick(tableUser),
        onView:
          canLoginAsUser
            ? () => {
                void onLoginAsUser(tableUser.id);
              }
            : undefined,
        disabled: impersonationLoading === tableUser.id || !tableUser.is_active,
      }),
    },
  };
}

export function renderUserRowActions(args: {
  row: AuthUser;
  canLoginAsUser: boolean;
  impersonationLoading: number | null;
  onEdit: () => void;
  onDelete: () => void;
  onLoginAsUser: (userId: number) => Promise<void>;
}) {
  const {
    row,
    canLoginAsUser,
    impersonationLoading,
    onEdit,
    onDelete,
    onLoginAsUser,
  } = args;

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <TableRowActions onEdit={onEdit} onDelete={onDelete} />
      {canLoginAsUser && (
        <Tooltip title="Login as this user">
          <IconButton
            size="small"
            onClick={() => void onLoginAsUser(row.id)}
            disabled={impersonationLoading === row.id || !row.is_active}
            sx={{
              color: colorTokens.menuColors.staff,
              ml: 1,
              "&:hover": {
                bgcolor: alpha(colorTokens.menuColors.staff, 0.1),
                transform: "scale(1.15)",
              },
              transition: "all 0.2s",
            }}
          >
            {impersonationLoading === row.id ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <LoginIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
