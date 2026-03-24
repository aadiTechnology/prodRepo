import type { NavigateFunction } from "react-router-dom";
import {
  Login as LoginIcon,
} from "@mui/icons-material";
import {
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
  Button,
  alpha,
} from "@mui/material";
import type { Tenant } from "../../types/tenant";
import type { ListConfig } from "../../components/reusable";
import TableRowActions from "../../components/reusable/TableRowActions";
import StatusChip from "../../components/roles/StatusChip";
import { colorTokens } from "../../tokens/colors";
import { formatShortDate } from "../../utils/formatters";
import type { TenantListSortBy } from "../../hooks/useTenantListController";

type TenantListConfigFactoryArgs = {
  navigate: NavigateFunction;
  onDeleteClick: (tenant: Tenant) => void;
  onLoginAsTenant: (tenantId: number) => Promise<void>;
  isSystemAdmin: boolean;
  impersonationLoading: number | null;
};

export function createTenantListConfig({
  navigate,
  onDeleteClick,
  onLoginAsTenant,
  isSystemAdmin,
  impersonationLoading,
}: TenantListConfigFactoryArgs): ListConfig<Tenant, TenantListSortBy> {
  return {
    columns: [
      {
        id: "logo",
        label: "Logo",
        render: (row) =>
          row.logo_url ? (
            <img
              src={row.logo_url}
              alt={row.name}
              style={{ height: 32, width: "auto", maxWidth: 90, objectFit: "contain" }}
            />
          ) : (
            "-"
          ),
      },
      { id: "name", label: "Tenant Name", field: "name" },
      { id: "owner_name", label: "Owner", field: "owner_name" },
      { id: "email", label: "Email", field: "email" },
      {
        id: "status",
        label: "Status",
        render: (row) => <StatusChip status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
      {
        id: "created_at",
        label: "Created Date",
        render: (row) => formatShortDate(row.created_at),
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
            No tenants available.
          </Typography>
          <Button variant="contained" color="primary" onClick={() => navigate("/tenants/add")}>
            Add Tenant
          </Button>
        </Box>
      ),
      errorFallbackMessage: "Failed to fetch tenants.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (row) => ({
        onEdit: () => navigate(`/tenants/${row.id}/edit`),
        onDelete: () => onDeleteClick(row),
        onView:
          isSystemAdmin
            ? () => {
                void onLoginAsTenant(row.id);
              }
            : undefined,
      }),
    },
  };
}

export function renderTenantRowActions(args: {
  row: Tenant;
  isSystemAdmin: boolean;
  impersonationLoading: number | null;
  onEdit: () => void;
  onDelete: () => void;
  onLoginAsTenant: (tenantId: number) => Promise<void>;
}) {
  const {
    row,
    isSystemAdmin,
    impersonationLoading,
    onEdit,
    onDelete,
    onLoginAsTenant,
  } = args;
  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <TableRowActions onEdit={onEdit} onDelete={onDelete} />
      {isSystemAdmin && (
        <Tooltip title="Login as this tenant">
          <IconButton
            size="small"
            onClick={() => void onLoginAsTenant(row.id)}
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
