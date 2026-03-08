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
import RoleInfoBox from "./RoleInfoBox";
import {
  Lock as LockIcon,
  Block as DeactivateIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Role, PaginatedResponse } from "../../types/role.types";
import ConfirmDialog from "../common/ConfirmDialog";
import TableRowActions from "../reusable/TableRowActions";
import StatusChip from "./StatusChip";
import ScopeChip from "./ScopeChip";
import dayjs from "dayjs";
import roleService from "../../api/services/roleService";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

interface RoleTableProps {
  data: Role[];
  loading: boolean;
  rowCount: number;
  search: string;
  refetchRoles: () => void;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
}

function truncate(text: string | null | undefined, max: number) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

export default function RoleTable({
  data,
  loading,
  paginationModel,
  onPaginationModelChange,
  rowCount,
  search,
  refetchRoles,
}: RoleTableProps) {
  const rows = Array.isArray(data) ? data : [];
  const navigate = useNavigate();

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Actions menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  // menuRole and setMenuRole removed

  // --- ADD HERE ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [infoBoxOpen, setInfoBoxOpen] = useState(false);
  const [roleDetails, setRoleDetails] = useState<Role | null>(null);

  // Delete menu action: open dialog (no longer needed, handled inline)

  // Confirm delete action: API call
  const handleDeleteConfirm = async () => {
    if (!selectedRole) return;
    setDeleteLoading(true);
    try {
      await roleService.deleteRole(selectedRole.id);
      setDeleteDialogOpen(false);
      setSelectedRole(null);
      refetchRoles();
    } finally {
      setDeleteLoading(false);
    }
  };
  // --- END ADD ---

  const handleDeactivateConfirm = async () => {
    // API call for deactivation
    if (!selectedRole) return;
    setDeactivateLoading(true);
    try {
      await roleService.deactivateRole(selectedRole.id);
      setConfirmOpen(false);
      refetchRoles();
    } finally {
      setDeactivateLoading(false);
    }
  };

  // menuRole, setMenuRole, handleMenuOpen, handleMenuClose, handleView, handleEdit removed
  // Remove unused handleDelete (all delete logic handled by handleDeleteMenu)

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
            {truncate(params.row.description ?? '', 40)}
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
      minWidth: 120,
      sortable: false,
      filterable: false,
      align: "center",
      renderCell: (params: GridRenderCellParams<Role>) => (
        <TableRowActions
          onView={async () => {
            try {
              const details = await roleService.getRoleById(params.row.id);
              setRoleDetails({
                ...details,
                status: details.is_active ? "ACTIVE" : "INACTIVE",
              });
            } catch (e) {
              setRoleDetails(params.row);
            }
            setSelectedRole(params.row);
            setInfoBoxOpen(true);
          }}
          onEdit={() => navigate(`/roles/${params.row.id}/edit`)}
          onDelete={() => {
            setSelectedRole(params.row);
            setDeleteDialogOpen(true);
          }}
        />
      ),
    },
  ];

  const length = Array.isArray(data) ? data.length : 0;

  return (
    <Box sx={{ width: "100%" }}>
      {infoBoxOpen && roleDetails && (
        <RoleInfoBox role={roleDetails} onClose={() => setInfoBoxOpen(false)} />
      )}
      <Box sx={{ height: 400, width: '100%', maxWidth: 1200, mx: 'auto', mt: 2 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[paginationModel.pageSize]}
          rowCount={rowCount}
          pagination
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          getRowId={row => row.id}
          getRowHeight={() => 40}
          disableColumnMenu
          sx={{
            '& .MuiDataGrid-row': { minHeight: 40, maxHeight: 40 },
            '& .MuiDataGrid-cell': { py: 0.5, px: 1 },
            '& .MuiDataGrid-columnHeaders': { minHeight: 40, maxHeight: 40 },
            fontSize: 14,
          }}
        />
      </Box>

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <img src="/empty-roles.svg" alt="No roles" width={120} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            {search
              ? "No roles found matching your search"
              : "No roles available"}
          </Typography>
        </Box>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate Role"
        message="Are you sure you want to deactivate this role? Users assigned may lose access."
        confirmText="Deactivate"
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={deactivateLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteLoading}
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

