/**
 * Permission Management Page
 * Manage role-based menu permissions
 * Fully token-aware and architecture-compliant list page
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  Snackbar,
} from "@mui/material";
import permissionService, {
  MenuTreeNode,
  Role,
  RoleMenuPermission,
} from "../../api/services/permissionService";
import tenantService from "../../api/services/tenantService";
import type { Tenant } from "../../types/tenant";
import { PageHeader } from "../../components/layout";
import { ListPageLayout, EntityTableSection, ListPageToolbar } from "../../components/reusable";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";
import { FormHeaderIconAction } from "../../components/primitives";
import { PermissionTableRow } from "../../hooks/usePermissionListController";
import { createPermissionListConfig } from "./PermissionManagementPage.listConfig";

/* ═══════════════════════════════════════════════════════════════════════════
   PERMISSION MANAGEMENT PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const PermissionManagementPage = () => {
  const { user } = useAuth();
  const { hasPermission: rbacPerm, refreshRBAC } = useRBAC();

  // ── Authorization ────────────────────────────────────────────────────────
  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "ADMIN" && !user?.tenant_id);
  const canEdit =
    isSuperAdmin ||
    rbacPerm("ADMIN_MGMT:edit") ||
    rbacPerm("SYSTEM_CONFIG:edit") ||
    rbacPerm("Permission Mapping:edit");
  const isSystemAdmin = user?.tenant_id == null && !!user;

  // ── Core State ────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([]);
  const [permissions, setPermissions] = useState<Map<number, RoleMenuPermission>>(new Map());
  const [originalPermissions, setOriginalPermissions] = useState<Map<number, RoleMenuPermission>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("all");

  // ── UI State ────────────────────────────────────────────────────────────
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Fetch Roles ─────────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      setError(null);
      const data = await permissionService.getRolesForUser();
      setRoles(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch roles.");
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ── Fetch Tenants (System Admin only) ────────────────────────────────────
  const fetchTenants = useCallback(async () => {
    if (!isSystemAdmin) return;
    try {
      const pageSize = 100;
      let page = 1;
      let allTenants: Tenant[] = [];
      let total = 0;

      do {
        const data = await tenantService.list({ page, page_size: pageSize });
        const pageItems = data?.items || [];
        total = data?.total || pageItems.length;
        allTenants = [...allTenants, ...pageItems];
        page += 1;
      } while (allTenants.length < total);

      setTenants(allTenants);
    } catch {
      // Keep page usable even if tenant list fails; roles can still load.
      setTenants([]);
    }
  }, [isSystemAdmin]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    if (!isSystemAdmin) {
      setSelectedTenantId(user?.tenant_id != null ? String(user.tenant_id) : "all");
    }
  }, [isSystemAdmin, user?.tenant_id]);

  // ── Expanded Modules State ──────────────────────────────────────────────
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<number>>(
    new Set()
  );

  const toggleModule = useCallback((moduleId: number) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // ── Handle Role Change ──────────────────────────────────────────────────
  const handleRoleChange = useCallback(
    async (roleId: number) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role) return;
      setSelectedRole(role);
      setError(null);
      setLoadingMenus(true);
      try {
        const menuData = await permissionService.getRolePermissions(roleId);
        setMenuTree(menuData);
        const map = new Map<number, RoleMenuPermission>();
        const traverse = (nodes: MenuTreeNode[]) =>
          nodes.forEach((n) => {
            map.set(n.id, n.permissions);
            if (n.children) traverse(n.children);
          });
        traverse(menuData);
        setPermissions(map);
        setOriginalPermissions(new Map(map));
      } catch (err: any) {
        setError(err?.message || "Failed to fetch permissions.");
      } finally {
        setLoadingMenus(false);
      }
    },
    [roles]
  );

  // ── Handle Tenant Change ──────────────────────────────────────────────────
  const handleTenantChange = useCallback((tenantId: string) => {
    setSelectedTenantId(tenantId);
    setSelectedRole(null);
    setMenuTree([]);
    setPermissions(new Map());
    setOriginalPermissions(new Map());
    setExpandedModuleIds(new Set());
    setPage(0);
  }, []);

  // ── Transform Tree Into Flat Rows ────────────────────────────────────────
  const allRows: PermissionTableRow[] = useMemo(() => {
    const rows: PermissionTableRow[] = [];
    const lowerSearch = searchQuery.toLowerCase().trim();

    const traverse = (nodes: MenuTreeNode[]) =>
      nodes.forEach((n) => {
        const perm = permissions.get(n.id);
        const matchesSearch = !lowerSearch || n.name.toLowerCase().includes(lowerSearch);

        if (perm) {
          let shouldShow = false;
          if (n.level === 1) {
            shouldShow = true;
          } else if (n.level === 2 && n.parent_id) {
            if (expandedModuleIds.has(n.parent_id) || (lowerSearch && matchesSearch)) {
              shouldShow = true;
            }
          }

          if (shouldShow) {
            rows.push({
              id: n.id,
              name: n.name,
              can_view: perm.can_view,
              can_create: perm.can_create,
              can_edit: perm.can_edit,
              can_delete: perm.can_delete,
              level: n.level as 1 | 2,
              parent_id: n.parent_id,
            });
          }
        }
        if (n.children?.length) traverse(n.children);
      });
    
    traverse(menuTree);
    return rows;
  }, [menuTree, permissions, expandedModuleIds, searchQuery]);

  // ── Pagination State ───────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return allRows.slice(start, end);
  }, [allRows, page, rowsPerPage]);

  // ── Permission Change Handlers ──────────────────────────────────────────
  const handlePermChange = useCallback(
    (menuId: number, key: string, checked: boolean) => {
      setPermissions((prev) => {
        const map = new Map(prev);
        const perm = map.get(menuId);
        if (!perm) return prev;

        const updated = { ...perm, [key]: checked };

        // View is prerequisite for other actions
        if (key === "can_view" && !checked) {
          updated.can_create = false;
          updated.can_edit = false;
          updated.can_delete = false;
        }
        if (key !== "can_view" && checked) {
          updated.can_view = true;
        }
        map.set(menuId, updated as RoleMenuPermission);
        return map;
      });
    },
    []
  );

  const handleMasterToggle = useCallback(
    (moduleId: number, checked: boolean) => {
      setPermissions((prev) => {
        const map = new Map(prev);

        const updateNode = (id: number) => {
          const p = map.get(id);
          if (p) {
            map.set(id, {
              ...p,
              can_view: checked,
              can_create: checked,
              can_edit: checked,
              can_delete: checked,
            });
          }
        };

        // Update parent module
        updateNode(moduleId);

        // Recursive update for children
        const findAndUpdateChildren = (nodes: MenuTreeNode[]): boolean => {
          for (const node of nodes) {
            if (node.id === moduleId) {
              if (node.children) {
                const traverseChildren = (children: MenuTreeNode[]) => {
                  children.forEach((child) => {
                    updateNode(child.id);
                    if (child.children) traverseChildren(child.children);
                  });
                };
                traverseChildren(node.children);
              }
              return true;
            }
            if (node.children && findAndUpdateChildren(node.children)) return true;
          }
          return false;
        };

        findAndUpdateChildren(menuTree);
        return map;
      });
    },
    [menuTree]
  );

  const handleSelectAllModules = useCallback((checked: boolean) => {
    setPermissions((prev) => {
      const map = new Map(prev);
      // Get all modules (level 1) - use permissions map keys filtered by level
      const allModules = Array.from(permissions.keys())
        .filter((id) => {
          const row = allRows.find((r) => r.id === id);
          return row && row.level === 1;
        });
      
      allModules.forEach((moduleId) => {
        const perm = map.get(moduleId);
        if (perm) {
          map.set(moduleId, {
            ...perm,
            can_view: checked,
            can_create: checked,
            can_edit: checked,
            can_delete: checked,
          });
        }
        
        // Also update all child permissions
        allRows
          .filter((r) => r.parent_id === moduleId)
          .forEach((child) => {
            const childPerm = map.get(child.id);
            if (childPerm) {
              map.set(child.id, {
                ...childPerm,
                can_view: checked,
                can_create: checked,
                can_edit: checked,
                can_delete: checked,
              });
            }
          });
      });
      
      return map;
    });
  }, [allRows, permissions]);

  // ── Has Changes ────────────────────────────────────────────────────────
  const hasChanges = useMemo(() => {
    for (const [k, v] of permissions.entries()) {
      const o = originalPermissions.get(k);
      if (!o) return true;
      if (
        o.can_view !== v.can_view ||
        o.can_create !== v.can_create ||
        o.can_edit !== v.can_edit ||
        o.can_delete !== v.can_delete
      )
        return true;
    }
    return false;
  }, [permissions, originalPermissions]);

  // ── Save Permissions ────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!selectedRole) {
      setError("Please select a role first.");
      return;
    }
    if (!hasChanges) {
      setError("No changes detected.");
      return;
    }
    try {
      setLoadingSave(true);
      setError(null);
      await permissionService.updateRolePermissions(
        selectedRole.id,
        Array.from(permissions.values())
      );
      await refreshRBAC();
      setSuccess("Permissions updated successfully!");
      setOriginalPermissions(new Map(permissions));
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to save permissions.");
    } finally {
      setLoadingSave(false);
    }
  }, [selectedRole, permissions, hasChanges, refreshRBAC]);

  // ── Reset Changes ────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPermissions(new Map(originalPermissions));
  }, [originalPermissions]);

  // ── Filtered Roles ────────────────────────────────────────────────────
  const filteredRoles = useMemo(
    () => {
      if (!isSystemAdmin) {
        return roles.filter((r) => r.tenant_id === user?.tenant_id);
      }

      if (selectedTenantId === "all") return roles;
      if (selectedTenantId === "platform") return roles.filter((r) => !r.tenant_id);

      const tenantId = Number(selectedTenantId);
      return roles.filter((r) => r.tenant_id === tenantId);
    },
    [roles, isSystemAdmin, user?.tenant_id, selectedTenantId]
  );

  const tenantOptions = useMemo(() => {
    if (!isSystemAdmin) return [];
    return [
      { label: "All Tenants", value: "all" },
      { label: "Platform", value: "platform" },
      ...tenants.map((t) => ({ label: t.name, value: String(t.id) })),
    ];
  }, [isSystemAdmin, tenants]);

  // ── Table Configuration ──────────────────────────────────────────────────
  const columnConfig = useMemo(
    () =>
      createPermissionListConfig({
        canEdit,
        selectedRole,
        allRows,
        expandedModuleIds,
        permissions,
        onPermChange: handlePermChange,
        onMasterToggle: handleMasterToggle,
        onToggleModule: toggleModule,
        onSelectAllModules: handleSelectAllModules,
      }),
    [
      canEdit,
      selectedRole,
      allRows,
      expandedModuleIds,
      permissions,
      handlePermChange,
      handleMasterToggle,
      handleSelectAllModules,
      toggleModule,
    ]
  );

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <ListPageLayout
      header={
        <>
          <PageHeader
            links={[{ title: "Permission Mapping", path: "#" }]}
            homePath="/"
            actions={
              <ListPageToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search modules..."
                actionsAfterSearch
                filters={[
                  ...(isSystemAdmin
                    ? [
                        {
                          label: "Tenant",
                          value: selectedTenantId,
                          onChange: handleTenantChange,
                          options: tenantOptions,
                        },
                      ]
                    : []),
                  {
                    label: "Role",
                    value: selectedRole?.id?.toString() || "",
                    onChange: (val) => handleRoleChange(parseInt(val || "0")),
                    options: filteredRoles.map((r) => ({
                      label: r.name,
                      value: r.id.toString(),
                    })),
                  },
                ]}
                renderActions={
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    {/* Reset Button */}
                    <FormHeaderIconAction
                      variant="cancel"
                      tooltipTitle="Reset Changes"
                      onClick={handleReset}
                      disabled={!selectedRole || !hasChanges || loadingSave}
                    />

                    {/* Save Button */}
                    <FormHeaderIconAction
                      variant="save"
                      tooltipTitle="Save Permissions"
                      onClick={handleSave}
                      disabled={!selectedRole || !hasChanges || !canEdit}
                      loading={loadingSave}
                    />
                  </Box>
                }
              />
            }
          />

          {error && (
            <Box sx={{ mx: 2, mb: 1, mt: 1 }}>
              <Alert
                severity="error"
                onClose={() => setError(null)}
                sx={{ borderRadius: "12px" }}
              >
                {error}
              </Alert>
            </Box>
          )}
        </>
      }
    >
      {/* Permission Table Section */}
      {(!loadingRoles || allRows.length > 0) && (
        <Box
          sx={{
            opacity: selectedRole ? 1 : 0.6,
            pointerEvents: selectedRole ? "auto" : "none",
          }}
        >
          <EntityTableSection
            label="Permission Directory"
            totalRows={allRows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            columns={columnConfig.columns}
            data={paginatedRows}
            loading={loadingMenus}
            stickyHeader
            size="small"
          />
        </Box>
      )}

      {loadingRoles && (
        <Box sx={{ mx: 2, py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Loading roles...
          </Typography>
        </Box>
      )}

      {selectedRole && loadingMenus && (
        <Box sx={{ mx: 2, py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Loading permissions...
          </Typography>
        </Box>
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="success"
          onClose={() => setSuccess(null)}
          sx={{ width: "100%" }}
        >
          {success}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
};

export default PermissionManagementPage;
