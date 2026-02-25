import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbarContainer,
} from "@mui/x-data-grid";
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  LinearProgress,
  Button,
  TextField,
} from "@mui/material";
import {
  Lock as LockIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Block as DeactivateIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Role, PaginatedResponse } from "../../types/role.types";
import ConfirmDialog from "../common/ConfirmDialog";
import StatusChip from "./StatusChip";
import ScopeChip from "./ScopeChip";
import dayjs from "dayjs";
import roleService from "../../api/services/roleService";

interface RoleTableProps {
  data: Role[];
  pagination?: PaginatedResponse<Role>["pagination"];
  loading: boolean;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  onAddRole: () => void;
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

export default function RoleTable({ data, ...props }) {
  const rows = Array.isArray(data) ? data : [];

  const {
    loading,
    page,
    pageSize,
    rowCount,
    onPageChange,
    onPageSizeChange,
    pagination,
    search,
    onAddRole,
  } = props;
  const navigate = useNavigate();

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const handleDeactivate = async () => {
    if (!selectedRole) return;
    setDeactivateLoading(true);
    try {
      await roleService.deactivateRole(selectedRole.id);
      setConfirmOpen(false);
      // Optionally refetch roles here
    } finally {
      setDeactivateLoading(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Role Name",
      flex: 1.2,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<Role>) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {params.row.isSystemRole && (
            <Tooltip title="System Role">
              <LockIcon fontSize="small" color="disabled" />
            </Tooltip>
          )}
          <Typography fontWeight={700}>
            {params.row.name}
          </Typography>
          {params.row.isSystemRole && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (System Role)
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: "scope",
      headerName: "Scope",
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<Role>) => (
        <ScopeChip scope={params.row.scope} />
      ),
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1.5,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<Role>) => (
        <Tooltip title={params.row.description}>
          <Typography noWrap>
            {truncate(params.row.description, 40)}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 110,
      renderCell: (params: GridRenderCellParams<Role>) => (
        <StatusChip status={params.row.status} />
      ),
    },
    {
      field: "createdAt",
      headerName: "Created",
      minWidth: 110,
      renderCell: (params: GridRenderCellParams<Role>) => (
        <Typography>
          {dayjs(params.row.createdAt).format("DD-MM-YY")}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 160,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<Role>) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <IconButton
              size="small"
              onClick={() => navigate(`/roles/${params.row.id}`)}
              aria-label="view"
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => navigate(`/roles/${params.row.id}/edit`)}
              aria-label="edit"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              params.row.isSystemRole
                ? "This is a system role and cannot be deactivated."
                : "Deactivate Role"
            }
          >
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={params.row.isSystemRole}
                onClick={() => {
                  setSelectedRole(params.row);
                  setConfirmOpen(true);
                }}
                aria-label="deactivate"
              >
                <DeactivateIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const length = Array.isArray(data) ? data.length : 0;

  return (
    <Box sx={{ width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        page={page}
        pageSize={pageSize}
        rowCount={rowCount}
        pagination
        paginationMode="server"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        rowsPerPageOptions={[10, 25, 50]}
        loading={loading}
        autoHeight
        disableSelectionOnClick
        components={{
          LoadingOverlay: LinearProgress,
          Toolbar: () => (
            <GridToolbarContainer>
              <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  {rowCount > 0
                    ? `Showing ${page * pageSize + 1}–${Math.min(
                        (page + 1) * pageSize,
                        rowCount
                      )} of ${rowCount} roles`
                    : "No roles"}
                </Typography>
                <Button variant="outlined" onClick={onAddRole} sx={{ ml: "auto" }}>
                  + Add Role
                </Button>
              </Box>
            </GridToolbarContainer>
          ),
        }}
        sx={{
          bgcolor: "background.paper",
          "& .MuiDataGrid-columnHeaders": { bgcolor: "background.default" },
        }}
      />

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <img src="/empty-roles.svg" alt="No roles" width={120} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            {search
              ? "No roles found matching your search"
              : "No roles available"}
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={onAddRole}>
            Add Role
          </Button>
        </Box>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate Role"
        message="Are you sure you want to deactivate this role? Users assigned may lose access."
        confirmText="Deactivate"
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmOpen(false)}
        loading={deactivateLoading}
      />
    </Box>
  );
}

// Search input component for header
RoleTable.SearchInput = function SearchInput({
  value,
  onChange,
  loading,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  placeholder?: string;
}) {
  return (
    <TextField
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      InputProps={{
        endAdornment: loading ? <LinearProgress sx={{ width: 24 }} /> : null,
      }}
      sx={{
        bgcolor: "background.default",
        borderRadius: 2,
      }}
      autoFocus
      inputProps={{ "aria-label": "search roles" }}
    />
  );
};