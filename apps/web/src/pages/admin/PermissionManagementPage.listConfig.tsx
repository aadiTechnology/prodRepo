/**
 * PermissionManagementPage.listConfig.tsx
 *
 * Column definitions for the permission management table.
 * This table renders a two-level (module → page) tree with
 * per-row permission checkboxes. Row actions (edit / delete)
 * are provided by the page via renderRowActions, not here.
 */

import React from "react";
import { Box, Typography, Checkbox, IconButton, alpha } from "@mui/material";
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import type { DataTableColumn } from "../../components/reusable";
import { colorTokens } from "../../tokens/colors";
import type { PermissionTableRow } from "../../hooks/usePermissionListController";

// ── Config options ────────────────────────────────────────────────────────────

export interface PermissionListConfigOptions {
  canEdit: boolean;
  selectedRole: unknown;
  allRows: PermissionTableRow[];
  expandedModuleIds: Set<number>;
  permissions: Map<number, unknown>;
  onPermChange: (menuId: number, key: string, checked: boolean) => void;
  onMasterToggle: (moduleId: number, checked: boolean) => void;
  onToggleModule: (moduleId: number) => void;
  onSelectAllModules: (checked: boolean) => void;
}

// ── UI policy (shared across callers) ─────────────────────────────────────────

export const permissionListUiPolicy = {
  emptyMessage: "Select a role above to view its permissions.",
  errorFallbackMessage: "Failed to load permissions.",
  retryLabel: "Retry",
} as const;

// ── Column factory ────────────────────────────────────────────────────────────

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
}: PermissionListConfigOptions): { columns: DataTableColumn<PermissionTableRow>[] } => {
  const columns: DataTableColumn<PermissionTableRow>[] = [

    // ── Select-all header checkbox ────────────────────────────────────────
    {
      id: "selectAll",
      label: "",
      width: "6%",
      headerAlign: "center" as const,
      render: () => null,
      renderHeader: () => {
        const allModules = allRows.filter((r) => r.level === 1);
        const allSelected =
          allModules.length > 0 &&
          allModules.every(
            (m) => m.can_view && m.can_create && m.can_edit && m.can_delete
          );
        const someSelected = allModules.some(
          (m) => m.can_view || m.can_create || m.can_edit || m.can_delete
        );
        return (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={(e) => onSelectAllModules(e.target.checked)}
              disabled={!canEdit || !selectedRole}
              sx={{
                color: alpha(colorTokens.preschool.turquoise.main, 0.4),
                "&.Mui-checked": { color: colorTokens.preschool.turquoise.main },
              }}
            />
          </Box>
        );
      },
    },

    // ── Module / Page name with expand toggle ─────────────────────────────
    {
      id: "name",
      label: "Module / Page",
      field: "name" as const,
      width: "55%",
      render: (row) => {
        const isModule = row.level === 1;
        const isExpanded = expandedModuleIds.has(row.id);
        const allChecked =
          row.can_view && row.can_create && row.can_edit && row.can_delete;
        const someChecked =
          row.can_view || row.can_create || row.can_edit || row.can_delete;

        if (isModule) {
          return (
            <Box
              sx={{
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
                checked={allChecked}
                indeterminate={someChecked && !allChecked}
                onChange={(e) => onMasterToggle(row.id, e.target.checked)}
                disabled={!canEdit || !selectedRole}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  p: 0.25,
                  color: alpha(colorTokens.preschool.turquoise.main, 0.4),
                  "&.Mui-checked": { color: colorTokens.preschool.turquoise.main },
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
                    bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.1),
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
                sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.95rem" }}
              >
                {row.name}
              </Typography>
            </Box>
          );
        }

        // Page row (level 2)
        return (
          <Box
            sx={{
              pl: 5,
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
                "&.Mui-checked": { color: colorTokens.preschool.turquoise.main },
              }}
            />
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "text.secondary", fontSize: "0.85rem" }}
            >
              {row.name}
            </Typography>
          </Box>
        );
      },
    },

    // ── View ──────────────────────────────────────────────────────────────
    {
      id: "can_view",
      label: "View",
      headerAlign: "center" as const,
      width: "10%",
      render: (row) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Checkbox
            checked={row.can_view}
            onChange={(e) => onPermChange(row.id, "can_view", e.target.checked)}
            disabled={!canEdit || !selectedRole}
            size="small"
          />
        </Box>
      ),
    },

    // ── Create ────────────────────────────────────────────────────────────
    {
      id: "can_create",
      label: "Create",
      headerAlign: "center" as const,
      width: "10%",
      render: (row) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Checkbox
            checked={row.can_create}
            onChange={(e) => onPermChange(row.id, "can_create", e.target.checked)}
            disabled={!canEdit || !row.can_view || !selectedRole}
            size="small"
          />
        </Box>
      ),
    },

    // ── Edit ──────────────────────────────────────────────────────────────
    {
      id: "can_edit",
      label: "Edit",
      headerAlign: "center" as const,
      width: "10%",
      render: (row) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Checkbox
            checked={row.can_edit}
            onChange={(e) => onPermChange(row.id, "can_edit", e.target.checked)}
            disabled={!canEdit || !row.can_view || !selectedRole}
            size="small"
          />
        </Box>
      ),
    },

    // ── Delete ────────────────────────────────────────────────────────────
    {
      id: "can_delete",
      label: "Delete",
      headerAlign: "center" as const,
      width: "10%",
      render: (row) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Checkbox
            checked={row.can_delete}
            onChange={(e) => onPermChange(row.id, "can_delete", e.target.checked)}
            disabled={!canEdit || !row.can_view || !selectedRole}
            size="small"
          />
        </Box>
      ),
    },
  ];

  return { columns };
};
