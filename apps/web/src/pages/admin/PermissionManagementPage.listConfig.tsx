/**
 * PermissionManagementPage.listConfig.tsx
 *
 * Column definitions and row actions for the permission matrix table.
 */

import { Box, Typography, Checkbox, IconButton, alpha } from "@mui/material";
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import type { NavigateFunction } from "react-router-dom";
import type { ListConfig } from "../../components/reusable/listFramework.types";
import { colorTokens } from "../../tokens/colors";
import type { PermissionTableRow } from "../../hooks/usePermissionListController";

export type { PermissionTableRow };

type PermissionListConfigArgs = {
  navigate: NavigateFunction;
  canEdit: boolean;
  isSystemAdmin: boolean;
  selectedRole: unknown;
  allRows: PermissionTableRow[];
  expandedModuleIds: Set<number>;
  onPermChange: (menuId: number, key: string, checked: boolean) => void;
  onMasterToggle: (moduleId: number, checked: boolean) => void;
  onToggleModule: (moduleId: number) => void;
  onSelectAllModules: (checked: boolean) => void;
  onDeleteClick: (row: PermissionTableRow) => void;
};

const checkboxSx = {
  color: alpha(colorTokens.preschool.turquoise.main, 0.4),
  "&.Mui-checked": { color: colorTokens.preschool.turquoise.main },
};

function rowAllChecked(row: PermissionTableRow) {
  return row.can_view && row.can_create && row.can_edit && row.can_delete;
}

function rowSomeChecked(row: PermissionTableRow) {
  return row.can_view || row.can_create || row.can_edit || row.can_delete;
}

export const createPermissionListConfig = ({
  navigate,
  canEdit,
  isSystemAdmin,
  selectedRole,
  allRows,
  expandedModuleIds,
  onPermChange,
  onMasterToggle,
  onToggleModule,
  onSelectAllModules,
  onDeleteClick,
}: PermissionListConfigArgs): ListConfig<PermissionTableRow> => ({
  columns: [
    {
      id: "selectAll",
      label: "",
      width: 52,
      headerAlign: "center",
      render: () => null,
      renderHeader: () => {
        const modules = allRows.filter((r) => r.level === 1);
        const allSelected = modules.length > 0 && modules.every((m) => rowAllChecked(m));
        const someSelected = modules.some((m) => rowSomeChecked(m));

        return (
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={(e) => onSelectAllModules(e.target.checked)}
            disabled={!canEdit || !selectedRole}
            sx={checkboxSx}
          />
        );
      },
    },
    {
      id: "name",
      label: "Module / Page",
      field: "name",
      width: "40%",
      render: (row) => {
        const isModule = row.level === 1;
        const isExpanded = expandedModuleIds.has(row.id);
        const allChecked = rowAllChecked(row);
        const someChecked = rowSomeChecked(row);

        if (isModule) {
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 200 }}>
              <Checkbox
                size="small"
                checked={allChecked}
                indeterminate={someChecked && !allChecked}
                onChange={(e) => onMasterToggle(row.id, e.target.checked)}
                disabled={!canEdit || !selectedRole}
                onClick={(e) => e.stopPropagation()}
                sx={{ ...checkboxSx, p: 0.25 }}
              />
              <IconButton
                size="small"
                onClick={() => onToggleModule(row.id)}
                sx={{
                  p: 0.5,
                  color: colorTokens.preschool.turquoise.main,
                  "&:hover": { bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.1) },
                }}
              >
                {isExpanded ? (
                  <ExpandMoreIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
              <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: "break-word" }}>
                {row.name}
              </Typography>
            </Box>
          );
        }

        return (
          <Box sx={{ pl: 4, display: "flex", alignItems: "center", gap: 0.5, minWidth: 180 }}>
            <Checkbox
              size="small"
              checked={allChecked}
              indeterminate={someChecked && !allChecked}
              onChange={(e) => onMasterToggle(row.id, e.target.checked)}
              disabled={!canEdit || !selectedRole}
              onClick={(e) => e.stopPropagation()}
              sx={{ ...checkboxSx, p: 0.25 }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
              {row.name}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: "can_view",
      label: "View",
      headerAlign: "center",
      width: 88,
      render: (row) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Checkbox
            checked={row.can_view}
            onChange={(e) => onPermChange(row.id, "can_view", e.target.checked)}
            disabled={!canEdit || !selectedRole}
            size="small"
            sx={checkboxSx}
          />
        </Box>
      ),
    },
    {
      id: "can_create",
      label: "Create",
      headerAlign: "center",
      width: 88,
      render: (row) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Checkbox
            checked={row.can_create}
            onChange={(e) => onPermChange(row.id, "can_create", e.target.checked)}
            disabled={!canEdit || !row.can_view || !selectedRole}
            size="small"
            sx={checkboxSx}
          />
        </Box>
      ),
    },
    {
      id: "can_edit",
      label: "Edit",
      headerAlign: "center",
      width: 88,
      render: (row) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Checkbox
            checked={row.can_edit}
            onChange={(e) => onPermChange(row.id, "can_edit", e.target.checked)}
            disabled={!canEdit || !row.can_view || !selectedRole}
            size="small"
            sx={checkboxSx}
          />
        </Box>
      ),
    },
    {
      id: "can_delete",
      label: "Delete",
      headerAlign: "center",
      width: 88,
      render: (row) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Checkbox
            checked={row.can_delete}
            onChange={(e) => onPermChange(row.id, "can_delete", e.target.checked)}
            disabled={!canEdit || !row.can_view || !selectedRole}
            size="small"
            sx={checkboxSx}
          />
        </Box>
      ),
    },
  ],
  sortOptions: [],
  uiPolicy: {
    emptyMessage: "No modules found for this role.",
    errorFallbackMessage: "Failed to load permissions.",
    retryLabel: "Retry",
  },
  actions: {
    rowActions: (row) => {
      if (!isSystemAdmin) return undefined;
      return {
        onEdit: () => navigate(`/admin/menus/${row.id}/edit`),
        onDelete: () => onDeleteClick(row),
      };
    },
  },
});
