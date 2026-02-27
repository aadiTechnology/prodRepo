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
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Role, PaginatedResponse } from "../../types/role.types";
import ConfirmDialog from "../common/ConfirmDialog";
import StatusChip from "./StatusChip";
import ScopeChip from "./ScopeChip";
import dayjs from "dayjs";
import roleService from "../../api/services/roleService";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

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

function truncate(text: string | null | undefined, max: number) {
  if (!text) return "";
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
  onAddRole,
}: {
  data: Role[];
  loading: boolean;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  rowCount: number;
  search: string;
  onAddRole: () => void;
}) {
  const rows = Array.isArray(data) ? data : [];
  const navigate = useNavigate();

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Actions menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRole, setMenuRole] = useState<Role | null>(null);

  // --- ADD HERE ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Delete menu action: open dialog
  const handleDeleteMenu = () => {
    if (menuRole) {
      setSelectedRole(menuRole);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  // Confirm delete action: API call
  const handleDeleteConfirm = async () => {
    if (!selectedRole) return;
    setDeleteLoading(true);
    try {
      await roleService.deleteRole(selectedRole.id); // Implement this API if not present
      setDeleteDialogOpen(false);
      setSelectedRole(null);
      // Optionally refetch roles here
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
      // Optionally refetch roles here
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleDeactivateMenu = () => {
    // Menu action, opens dialog
    if (menuRole) {
      setSelectedRole(menuRole);
      setConfirmOpen(true);
    }
    handleMenuClose();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, role: Role) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuRole(role);
  };
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuRole(null);
  };

  const handleView = () => {
    if (menuRole) navigate(`/roles/${menuRole.id}`);
    handleMenuClose();
  };
  const handleEdit = () => {
    if (menuRole) navigate(`/roles/${menuRole.id}/edit`);
    handleMenuClose();
  };
  const handleDeactivate = () => {
    handleDeactivateMenu();
  };
  const handleDelete = () => {
    // Implement delete logic here (e.g. open confirm dialog)
    if (menuRole) {
      // setSelectedRole(menuRole);
      // setDeleteDialogOpen(true);
      alert(`Delete role: ${menuRole.name}`);
    }
    handleMenuClose();
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
      minWidth: 80,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<Role>) => (
        <>
          <IconButton
            size="small"
            aria-label="more"
            onClick={(e) => handleMenuOpen(e, params.row)}
          >
            <MoreVertIcon />
          </IconButton>
        </>
      ),
    },
  ];

  const length = Array.isArray(data) ? data.length : 0;

  return (
    <Box sx={{ width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        pageSizeOptions={[10, 25, 50, 100]}
        pageSize={paginationModel.pageSize}
        rowCount={rowCount}
        loading={loading}
        autoHeight
        disableSelectionOnClick
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

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleView}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} />
          View
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={handleDeactivate}
          disabled={menuRole?.isSystemRole}
          sx={{ color: menuRole?.isSystemRole ? "text.disabled" : "error.main" }}
        >
          <DeactivateIcon fontSize="small" sx={{ mr: 1 }} />
          Deactivate
        </MenuItem>
        <MenuItem onClick={handleDeleteMenu} sx={{ color: "error.main" }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

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

