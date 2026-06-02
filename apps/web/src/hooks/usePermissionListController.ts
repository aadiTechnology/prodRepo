/**
 * usePermissionListController.ts
 * Manages state and business logic for the Permission Management page
 * Handles data fetching, permission toggles, tree state, and pagination.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import permissionService, {
  MenuTreeNode,
  Role,
  RoleMenuPermission,
} from "../api/services/permissionService";
import tenantService from "../api/services/tenantService";
import type { Tenant } from "../types/tenant";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";

export interface PermissionTableRow {
  id: number;
  name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  level: 1 | 2;
  parent_id?: number;
}

const hasAnyMenuAccess = (perm: RoleMenuPermission): boolean =>
  perm.can_view || perm.can_create || perm.can_edit || perm.can_delete;

export const usePermissionListController = () => {
  const { user } = useAuth();
  const { hasPermission: rbacPerm, refreshRBAC, menus: rbacMenus } = useRBAC();

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

  const displayRows = useMemo(() => {
    if (isSystemAdmin) return allRows;

    const allowedMenuIds = new Set<number>();
    const collectAllowedIds = (nodes: typeof rbacMenus) => {
      nodes.forEach((node) => {
        allowedMenuIds.add(node.id);
        if (node.children?.length) collectAllowedIds(node.children);
      });
    };
    collectAllowedIds(rbacMenus);

    // Tenant admins can manage only the features they currently have.
    const inScopeRows = allRows.filter((row) => {
      if (allowedMenuIds.has(row.id)) return true;
      if (row.level === 1) {
        return allRows.some(
          (childRow) =>
            childRow.level === 2 &&
            childRow.parent_id === row.id &&
            allowedMenuIds.has(childRow.id)
        );
      }
      return false;
    });

    if (canEdit) return inScopeRows;

    return inScopeRows.filter((row) => {
      const perm = permissions.get(row.id);
      if (row.level === 1 && row.parent_id == null) {
        const childHasAccess = inScopeRows.some((childRow) => {
          if (childRow.level !== 2 || childRow.parent_id !== row.id) return false;
          const childPerm = permissions.get(childRow.id);
          return !!childPerm && hasAnyMenuAccess(childPerm);
        });
        return (!!perm && hasAnyMenuAccess(perm)) || childHasAccess;
      }
      return !!perm && hasAnyMenuAccess(perm);
    });
  }, [allRows, isSystemAdmin, canEdit, permissions, rbacMenus]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return displayRows.slice(start, end);
  }, [displayRows, page, rowsPerPage]);

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
      const rowSource = isSystemAdmin ? allRows : displayRows;
      const allModules = Array.from(permissions.keys())
        .filter((id) => {
          const row = rowSource.find((r) => r.id === id);
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
        
        rowSource
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
  }, [allRows, displayRows, isSystemAdmin, permissions]);

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
      const payloadPermissions = isSystemAdmin
        ? Array.from(permissions.values())
        : displayRows
            .map((row) => permissions.get(row.id))
            .filter((perm): perm is RoleMenuPermission => !!perm);
      await permissionService.updateRolePermissions(
        selectedRole.id,
        payloadPermissions
      );
      await refreshRBAC();
      setSuccess("Permissions updated successfully!");
      setOriginalPermissions(new Map(permissions));
    } catch (err: any) {
      setError(err?.message || "Failed to save permissions.");
    } finally {
      setLoadingSave(false);
    }
  }, [selectedRole, permissions, hasChanges, refreshRBAC, isSystemAdmin, displayRows]);

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

  return {
    canEdit,
    isSystemAdmin,
    roles: filteredRoles,
    selectedRole,
    searchQuery,
    setSearchQuery,
    selectedTenantId,
    tenantOptions,
    loadingRoles,
    loadingMenus,
    loadingSave,
    error,
    setError,
    success,
    setSuccess,
    expandedModuleIds,
    toggleModule,
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange,
    handleRoleChange,
    handleTenantChange,
    allRows,
    displayRows,
    paginatedRows,
    handlePermChange,
    handleMasterToggle,
    handleSelectAllModules,
    hasChanges,
    handleSave,
    handleReset,
    permissions,
  };
};
