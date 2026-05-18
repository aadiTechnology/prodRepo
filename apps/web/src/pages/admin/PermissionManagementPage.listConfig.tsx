/**
 * PermissionManagementPage.listConfig.ts
 * Column definitions and table configuration for permission management
 */

import React from "react";
import { Box, Typography, Checkbox, IconButton, alpha } from "@mui/material";
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { colorTokens } from "../../tokens/colors";
import { PermissionTableRow } from "../../hooks/usePermissionListController";

export interface CreatePermissionListConfigOptions {
  canEdit: boolean;
  selectedRole: any;
  allRows: PermissionTableRow[];
  expandedModuleIds: Set<number>;
  permissions: Map<number, any>;
  onPermChange: (
    menuId: number,
    key: string,
    checked: boolean
  ) => void;
  onMasterToggle: (moduleId: number, checked: boolean) => void;
  onToggleModule: (moduleId: number) => void;
  onSelectAllModules: (checked: boolean) => void;
}

export const createPermissionListConfig = ({
  canEdit,
  selectedRole,
  allRows,
  expandedModuleIds,
  permissions,
  onPermChange,
  onMasterToggle,
  onToggleModule,
  onSelectAllModules,
}: CreatePermissionListConfigOptions): { columns: any[] } => {
  const columns = [
    {
      id: "selectAll",
      label: "",
      width: "6%",
      headerAlign: "center" as const,
      render: () => null,
      renderHeader: () => {
        const allModules = allRows.filter((r) => r.level === 1);
        const allModulesSelected =
          allModules.length > 0 &&
          allModules.every(
            (m) =>
              m.can_view &&
              m.can_create &&
              m.can_edit &&
              m.can_delete
          );
        const someModulesSelected = allModules.some(
          (m) =>
            m.can_view ||
            m.can_create ||
            m.can_edit ||
            m.can_delete
        );

        return (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <Checkbox
              size="small"
              checked={allModulesSelected}
              indeterminate={
                someModulesSelected && !allModulesSelected
              }
              onChange={(e) => onSelectAllModules(e.target.checked)}
              disabled={!canEdit || !selectedRole}
              sx={{
                color: alpha(
                  colorTokens.preschool.turquoise.main,
                  0.4
                ),
                "&.Mui-checked": {
                  color: colorTokens.preschool.turquoise.main,
                },
              }}
            />
          </Box>
        );
      },
    },
    {
      id: "name",
      label: "Module / Page",
      field: "name" as const,
      width: "55%",
      render: (row: PermissionTableRow) => {
        const isModule = row.level === 1;
        const isExpanded = expandedModuleIds.has(row.id);

        if (isModule) {
          return (
            <Box
              sx={{
                pl: 0,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
                userSelect: "none",
                py: 0.5,
              }}
            >
              <Checkbox
                size="small"
                checked={
                  row.can_view &&
                  row.can_create &&
                  row.can_edit &&
                  row.can_delete
                }
                indeterminate={
                  (row.can_view ||
                    row.can_create ||
                    row.can_edit ||
                    row.can_delete) &&
                  !(
                    row.can_view &&
                    row.can_create &&
                    row.can_edit &&
                    row.can_delete
                  )
                }
                onChange={(e) =>
                  onMasterToggle(row.id, e.target.checked)
                }
                disabled={!canEdit || !selectedRole}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  p: 0.25,
                  color: alpha(
                    colorTokens.preschool.turquoise.main,
                    0.4
                  ),
                  "&.Mui-checked": {
                    color: colorTokens.preschool.turquoise.main,
                  },
                }}
              />

              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleModule(row.id);
                }}
                sx={{
                  p: 0.5,
                  color: colorTokens.preschool.turquoise.main,
                  "&:hover": {
                    bgcolor: alpha(
                      colorTokens.preschool.turquoise.main,
                      0.1
                    ),
                  },
                }}
              >
                {isExpanded ? (
                  <ExpandMoreIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>

              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  fontSize: "0.95rem",
                }}
              >
                {row.name}
              </Typography>
            </Box>
          );
        } else {
          const allChecked =
            row.can_view && row.can_create && row.can_edit && row.can_delete;
          const someChecked =
            row.can_view || row.can_create || row.can_edit || row.can_delete;

          return (
            <Box
              sx={{
                pl: 2,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                py: 0.5,
              }}
            >
              <Checkbox
                size="small"
                checked={allChecked}
                indeterminate={someChecked && !allChecked}
                onChange={(e) => onMasterToggle(row.id, e.target.checked)}
                disabled={!canEdit || !selectedRole}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  p: 0.25,
                  color: alpha(colorTokens.preschool.turquoise.main, 0.35),
                  "&.Mui-checked": {
                    color: colorTokens.preschool.turquoise.main,
                  },
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: "text.secondary",
                  fontSize: "0.85rem",
                }}
              >
                {row.name}
              </Typography>
            </Box>
          );
        }
      },
    },
    {
      id: "can_view",
      label: "View",
      headerAlign: "center" as const,
      width: "10%",
      render: (row: PermissionTableRow) => (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <Checkbox
            checked={row.can_view}
            onChange={(e) =>
              onPermChange(row.id, "can_view", e.target.checked)
            }
            disabled={!canEdit || !selectedRole}
            size="small"
          />
        </Box>
      ),
    },
    {
      id: "can_create",
      label: "Create",
      headerAlign: "center" as const,
      width: "10%",
      render: (row: PermissionTableRow) => (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <Checkbox
            checked={row.can_create}
            onChange={(e) =>
              onPermChange(row.id, "can_create", e.target.checked)
            }
            disabled={!canEdit || !row.can_view || !selectedRole}
            size="small"
          />
        </Box>
      ),
    },
    {
      id: "can_edit",
      label: "Edit",
      headerAlign: "center" as const,
      width: "10%",
      render: (row: PermissionTableRow) => (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <Checkbox
            checked={row.can_edit}
            onChange={(e) =>
              onPermChange(row.id, "can_edit", e.target.checked)
            }
            disabled={!canEdit || !row.can_view || !selectedRole}
            size="small"
          />
        </Box>
      ),
    },
    {
      id: "can_delete",
      label: "Delete",
      headerAlign: "center" as const,
      width: "10%",
      render: (row: PermissionTableRow) => (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <Checkbox
            checked={row.can_delete}
            onChange={(e) =>
              onPermChange(row.id, "can_delete", e.target.checked)
            }
            disabled={!canEdit || !row.can_view || !selectedRole}
            size="small"
          />
        </Box>
      ),
    },
  ];

  return { columns };
};
