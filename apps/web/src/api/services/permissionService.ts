/**
 * Permission Service
 *
 * Handles API calls related to role-based menu permissions.
 * Provides functionality to fetch and update role permissions for menus.
 */

import apiClient from "../client";

export interface RoleMenuPermission {
  id: number;
  menu_id: number;
  menu_name: string;
  level: 1 | 2;
  parent_id?: number;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface MenuTreeNode {
  id: number;
  name: string;
  level: 1 | 2;
  parent_id?: number;
  permissions: RoleMenuPermission;
  children?: MenuTreeNode[];
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string;
  scope_type: "Platform" | "Tenant";
  tenant_id?: number;
  is_active: boolean;
  created_at: string;
}

class PermissionService {
  /**
   * Fetch all roles accessible to the current user
   * - Platform Admin: sees all roles
   * - Tenant Admin: sees only their tenant's roles
   */
  async getRolesForUser(): Promise<Role[]> {
    try {
      const response = await apiClient.get("/roles", {
        params: {
          pageSize: 1000, // Get all roles without pagination
        },
      });

      console.log("[PermissionService] getRolesForUser response:", response);

      // Handle multiple possible response structures
      if (response.data?.data?.items) {
        return response.data.data.items;
      }
      if (response.data?.items) {
        return response.data.items;
      }
      if (Array.isArray(response.data?.data)) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      console.warn("[PermissionService] Unexpected response structure:", response);
      return [];
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      throw error;
    }
  }

  /**
   * Fetch menu permissions for a specific role
   * Returns a tree structure of menus with permission flags
   * Backend returns flat list, so we transform it to hierarchical tree
   * @param roleId - The role ID to fetch permissions for
   */
  async getRolePermissions(roleId: number): Promise<MenuTreeNode[]> {
    try {
      const response = await apiClient.get(`/rbac/roles/${roleId}/matrix`);
      console.log("[PermissionService] getRolePermissions raw response:", response.data);

      // Backend returns: { role_id, role_name, items: [] }
      const items = response.data?.items || [];
      
      if (!Array.isArray(items) || items.length === 0) {
        console.warn("[PermissionService] No items in response");
        return [];
      }

      // Transform flat list into tree hierarchy
      // items have: menu_id, menu_name, parent_id, level, can_view, can_create, can_edit, can_delete
      const menuMap = new Map<number, MenuTreeNode>();

      // Create MenuTreeNode for each item
      items.forEach((item: any) => {
        const node: MenuTreeNode = {
          id: item.menu_id,
          name: item.menu_name,
          level: item.level || 1,
          parent_id: item.parent_id,
          permissions: {
            id: 0, // dummy id as we don't have it from response
            menu_id: item.menu_id,
            menu_name: item.menu_name,
            level: item.level || 1,
            parent_id: item.parent_id,
            can_view: !!item.can_view,
            can_create: !!item.can_create,
            can_edit: !!item.can_edit,
            can_delete: !!item.can_delete,
          },
          children: [],
        };
        menuMap.set(item.menu_id, node);
      });

      // Build parent-child relationships
      const rootNodes: MenuTreeNode[] = [];
      menuMap.forEach((node) => {
        if (node.parent_id === null || node.parent_id === undefined) {
          // This is a root-level menu
          rootNodes.push(node);
        } else {
          // This is a child - add to parent's children
          const parent = menuMap.get(node.parent_id);
          if (parent) {
            if (!parent.children) {
              parent.children = [];
            }
            parent.children.push(node);
          }
        }
      });

      console.log("[PermissionService] Transformed menu tree:", rootNodes);
      return rootNodes;
    } catch (error) {
      console.error(`Failed to fetch permissions for role ${roleId}:`, error);
      throw error;
    }
  }

  /**
   * Update permissions for a role
   * Sends a bulk update of all menu permissions for a role
   * @param roleId - The role ID to update permissions for
   * @param permissions - Array of permission objects with can_view, can_create, can_edit, can_delete
   */
  async updateRolePermissions(
    roleId: number,
    permissions: RoleMenuPermission[]
  ): Promise<void> {
    try {
      // Transform permissions array into format expected by backend
      // Backend expects: { permissions: [ { menu_id, can_view, can_create, can_edit, can_delete }, ... ] }
      const permissionsList = permissions.map((perm) => ({
        menu_id: perm.menu_id,
        can_view: perm.can_view,
        can_create: perm.can_create,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete,
      }));

      console.log("[PermissionService] Updating permissions with payload:", {
        permissions: permissionsList,
      });

      const response = await apiClient.post(`/rbac/roles/${roleId}/matrix`, {
        permissions: permissionsList,
      });

      console.log("[PermissionService] Update response:", response);
    } catch (error) {
      console.error(`Failed to update permissions for role ${roleId}:`, error);
      throw error;
    }
  }

  /**
   * Flatten a menu tree structure into a single array
   * Useful for processing all menus in a single loop
   */
  flattenMenuTree(menus: MenuTreeNode[]): RoleMenuPermission[] {
    const flattened: RoleMenuPermission[] = [];

    const traverse = (nodes: MenuTreeNode[]) => {
      nodes.forEach((node) => {
        flattened.push(node.permissions);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(menus);
    return flattened;
  }

  /**
   * Build a map of menu IDs to their parent ID
   * Useful for dependency checks (e.g., if View is unchecked, disable others)
   */
  buildMenuMap(
    menus: MenuTreeNode[]
  ): Map<number, { name: string; parentId?: number; level: number }> {
    const menuMap = new Map<
      number,
      { name: string; parentId?: number; level: number }
    >();

    const traverse = (nodes: MenuTreeNode[]) => {
      nodes.forEach((node) => {
        menuMap.set(node.id, {
          name: node.name,
          parentId: node.parent_id,
          level: node.level,
        });
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(menus);
    return menuMap;
  }
}

export default new PermissionService();
