# Frontend RBAC Architecture Design

## Overview

This document outlines the architecture for implementing Role-Based Access Control (RBAC) in the React frontend application. The design supports:
- Multi-tenant awareness
- Role-based permissions
- Dynamic menu rendering
- Route protection
- Feature-level access control

---

## 1. Folder Structure

```
apps/web/src/
├── api/
│   ├── services/
│   │   ├── authService.ts          # Enhanced with login/context
│   │   ├── userService.ts
│   │   ├── tenantService.ts        # NEW: Tenant management
│   │   ├── roleService.ts          # NEW: Role management
│   │   ├── menuService.ts          # NEW: Menu management
│   │   └── featureService.ts       # NEW: Feature management
│   ├── axiosInstance.ts            # Enhanced with token refresh
│   └── client.ts
│
├── context/
│   ├── AuthContext.tsx             # Enhanced with RBAC data
│   ├── RBACContext.tsx             # NEW: RBAC-specific context
│   └── index.ts
│
├── hooks/
│   ├── useAuth.ts                  # Existing auth hook
│   ├── useRBAC.ts                  # NEW: RBAC hook
│   ├── usePermissions.ts           # NEW: Permission checking hook
│   ├── useMenu.ts                  # NEW: Menu data hook
│   └── index.ts
│
├── utils/
│   ├── permissions/
│   │   ├── checkPermission.ts      # NEW: Permission checker
│   │   ├── checkRole.ts            # NEW: Role checker
│   │   ├── hasFeature.ts           # NEW: Feature checker
│   │   └── index.ts
│   ├── menu/
│   │   ├── buildMenuTree.ts        # NEW: Build hierarchical menu
│   │   ├── filterMenusByRole.ts    # NEW: Filter menus by permissions
│   │   └── index.ts
│   ├── storage/
│   │   ├── authStorage.ts          # NEW: Auth data storage
│   │   ├── rbacStorage.ts          # NEW: RBAC data storage
│   │   └── index.ts
│   └── index.ts
│
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx      # Enhanced with permission checks
│   │   ├── PermissionGate.tsx     # NEW: Component-level permission guard
│   │   └── RoleGuard.tsx           # NEW: Role-based component guard
│   │
│   ├── layout/
│   │   ├── MainLayout.tsx          # Enhanced with dynamic menu
│   │   ├── Sidebar.tsx             # NEW: Dynamic sidebar with menu
│   │   ├── Navbar.tsx              # NEW: Top navigation bar
│   │   └── MenuRenderer.tsx        # NEW: Menu rendering component
│   │
│   ├── menu/
│   │   ├── MenuItem.tsx            # NEW: Single menu item component
│   │   ├── MenuGroup.tsx           # NEW: Menu group (level 1)
│   │   ├── SubMenuItem.tsx         # NEW: Sub-menu item (level 2)
│   │   └── MenuIcon.tsx            # NEW: Icon resolver component
│   │
│   └── common/
│       └── ... (existing components)
│
├── types/
│   ├── auth.ts                     # Enhanced with RBAC types
│   ├── rbac.ts                     # NEW: RBAC-specific types
│   ├── menu.ts                     # NEW: Menu types
│   ├── permission.ts               # NEW: Permission types
│   └── ... (existing types)
│
├── routes/
│   ├── AppRoutes.tsx               # Enhanced with permission-based routes
│   ├── routeConfig.ts              # NEW: Route configuration with permissions
│   └── routeGuards.ts              # NEW: Route guard utilities
│
└── constants/
    ├── permissions.ts              # NEW: Permission constants
    ├── roles.ts                    # NEW: Role constants
    └── routes.ts                   # NEW: Route constants
```

---

## 2. Auth Context Architecture

### 2.1 Enhanced AuthContext

**Location:** `src/context/AuthContext.tsx`

**Responsibilities:**
- Authentication state management
- Token management and refresh
- User profile data
- Integration with RBAC context

**State Structure:**
```typescript
interface AuthState {
  // Authentication
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // RBAC Integration (delegated to RBACContext)
  // Access via useRBAC() hook
}
```

**Key Methods:**
- `login(credentials)` - Authenticate and store token
- `logout()` - Clear auth data
- `refreshUser()` - Refresh user profile
- `refreshToken()` - Refresh JWT token if expired

---

### 2.2 RBAC Context (NEW)

**Location:** `src/context/RBACContext.tsx`

**Responsibilities:**
- RBAC data management (roles, permissions, menus)
- Permission checking utilities
- Menu data management
- Feature access control

**State Structure:**
```typescript
interface RBACState {
  // Roles
  roles: string[];
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  
  // Permissions/Features
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Menus
  menus: MenuNode[];
  getMenuByPath: (path: string) => MenuNode | null;
  getMenuFeatures: (menuId: number) => Feature[];
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshRBAC: () => Promise<void>;
}
```

**Key Methods:**
- `refreshRBAC()` - Fetch latest RBAC data from API
- `hasRole(role)` - Check if user has specific role
- `hasPermission(permission)` - Check if user has specific permission
- `getMenuByPath(path)` - Get menu node by route path
- `getMenuFeatures(menuId)` - Get features for a menu

**Storage Strategy:**
- Store RBAC data in localStorage with expiration
- Refresh on login and periodically (configurable)
- Clear on logout

---

## 3. Permission Utilities

### 3.1 Permission Checker

**Location:** `src/utils/permissions/checkPermission.ts`

**Purpose:** Check if user has specific permission/feature

**API:**
```typescript
function checkPermission(
  permission: string,
  userPermissions: string[]
): boolean

function hasAnyPermission(
  permissions: string[],
  userPermissions: string[]
): boolean

function hasAllPermissions(
  permissions: string[],
  userPermissions: string[]
): boolean
```

**Usage Pattern:**
```typescript
// Single permission
if (checkPermission('USER_EDIT', permissions)) {
  // Show edit button
}

// Multiple permissions (OR)
if (hasAnyPermission(['USER_EDIT', 'USER_DELETE'], permissions)) {
  // Show action menu
}

// Multiple permissions (AND)
if (hasAllPermissions(['USER_VIEW', 'USER_EXPORT'], permissions)) {
  // Show export button
}
```

---

### 3.2 Role Checker

**Location:** `src/utils/permissions/checkRole.ts`

**Purpose:** Check if user has specific role

**API:**
```typescript
function checkRole(
  role: string,
  userRoles: string[]
): boolean

function hasAnyRole(
  roles: string[],
  userRoles: string[]
): boolean

function hasAllRoles(
  roles: string[],
  userRoles: string[]
): boolean
```

**Usage Pattern:**
```typescript
// Single role
if (checkRole('ADMIN', roles)) {
  // Show admin panel
}

// Multiple roles (OR)
if (hasAnyRole(['ADMIN', 'SUPER_ADMIN'], roles)) {
  // Show admin features
}
```

---

### 3.3 Feature Checker

**Location:** `src/utils/permissions/hasFeature.ts`

**Purpose:** Check if user has access to a feature within a menu context

**API:**
```typescript
function hasFeature(
  featureCode: string,
  menuId: number,
  rbacData: RBACData
): boolean

function hasMenuAccess(
  menuId: number,
  rbacData: RBACData
): boolean
```

**Usage Pattern:**
```typescript
// Check feature in menu context
if (hasFeature('USER_EDIT', menuId, rbacData)) {
  // Show edit functionality
}

// Check menu access
if (hasMenuAccess(menuId, rbacData)) {
  // Render menu item
}
```

---

## 4. Menu Rendering Strategy

### 4.1 Menu Data Structure

**Type Definition:** `src/types/menu.ts`

```typescript
interface Feature {
  code: string;
  name: string;
  category: string | null;
}

interface MenuNode {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  sort_order: number;
  level: 1 | 2;
  features: Feature[];
  children: MenuNode[]; // Only for level 1
}
```

---

### 4.2 Menu Tree Builder

**Location:** `src/utils/menu/buildMenuTree.ts`

**Purpose:** Transform flat menu array into hierarchical tree structure

**Algorithm:**
1. Filter menus by user permissions
2. Sort menus by `sort_order` at each level
3. Build parent-child relationships
4. Filter out menus with no accessible children (for level 1)

**API:**
```typescript
function buildMenuTree(
  menus: MenuNode[],
  userPermissions: string[]
): MenuNode[]
```

---

### 4.3 Menu Filtering

**Location:** `src/utils/menu/filterMenusByRole.ts`

**Purpose:** Filter menus based on user roles and permissions

**Filtering Rules:**
1. **Level 1 Menu Visibility:**
   - Menu is visible if user has ANY feature in the menu
   - OR menu has accessible children (level 2)

2. **Level 2 Menu Visibility:**
   - Menu is visible if user has ANY feature in the menu

3. **Feature Visibility:**
   - Features are filtered based on user's assigned permissions

**API:**
```typescript
function filterMenusByRole(
  menus: MenuNode[],
  userRoles: string[],
  userPermissions: string[]
): MenuNode[]
```

---

### 4.4 Menu Rendering Components

#### MenuRenderer Component

**Location:** `src/components/layout/MenuRenderer.tsx`

**Responsibilities:**
- Render complete menu hierarchy
- Handle menu item clicks
- Highlight active menu item
- Show/hide sub-menus

**Props:**
```typescript
interface MenuRendererProps {
  menus: MenuNode[];
  currentPath: string;
  onMenuClick: (path: string) => void;
}
```

#### MenuGroup Component

**Location:** `src/components/menu/MenuGroup.tsx`

**Purpose:** Render level 1 menu items with expandable children

**Features:**
- Expandable/collapsible groups
- Icon display
- Active state indication
- Sub-menu rendering

#### SubMenuItem Component

**Location:** `src/components/menu/SubMenuItem.tsx`

**Purpose:** Render level 2 menu items

**Features:**
- Indented display
- Icon display
- Active state indication
- Click handling

---

### 4.5 Menu Rendering Flow

```
1. User logs in → Fetch RBAC data (roles, permissions, menus)
2. Store RBAC data in RBACContext
3. Filter menus based on user permissions
4. Build menu tree structure
5. Render menu in Sidebar component
6. Handle menu clicks → Navigate to route
7. Highlight active menu based on current route
```

---

## 5. Route Protection Approach

### 5.1 Route Configuration

**Location:** `src/routes/routeConfig.ts`

**Purpose:** Define routes with permission requirements

**Structure:**
```typescript
interface RouteConfig {
  path: string;
  element: React.ComponentType;
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAnyRole?: string[];
  requireAnyPermission?: string[];
  layout?: React.ComponentType;
}

const routes: RouteConfig[] = [
  {
    path: '/users',
    element: UsersPage,
    requireAuth: true,
    requiredPermissions: ['USER_VIEW'],
  },
  {
    path: '/users/create',
    element: CreateUserPage,
    requireAuth: true,
    requiredPermissions: ['USER_CREATE'],
  },
  {
    path: '/admin',
    element: AdminPage,
    requireAuth: true,
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];
```

---

### 5.2 ProtectedRoute Component (Enhanced)

**Location:** `src/components/auth/ProtectedRoute.tsx`

**Enhanced Features:**
- Permission-based access control
- Role-based access control
- Feature-based access control
- Redirect to unauthorized page if access denied

**Props:**
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAnyRole?: string[];
  requireAnyPermission?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}
```

**Logic Flow:**
```
1. Check authentication (if requireAuth)
2. Check roles (if requiredRoles or requireAnyRole)
3. Check permissions (if requiredPermissions or requireAnyPermission)
4. Render children if all checks pass
5. Show fallback or redirect if checks fail
```

---

### 5.3 PermissionGate Component (NEW)

**Location:** `src/components/auth/PermissionGate.tsx`

**Purpose:** Component-level permission guard (show/hide UI elements)

**Props:**
```typescript
interface PermissionGateProps {
  children: React.ReactNode;
  permission: string | string[];
  requireAll?: boolean; // If true, requires ALL permissions (default: ANY)
  fallback?: React.ReactNode;
}
```

**Usage:**
```typescript
<PermissionGate permission="USER_EDIT">
  <Button>Edit User</Button>
</PermissionGate>

<PermissionGate permission={['USER_DELETE', 'USER_ADMIN']} requireAll>
  <Button>Delete User</Button>
</PermissionGate>
```

---

### 5.4 RoleGuard Component (NEW)

**Location:** `src/components/auth/RoleGuard.tsx`

**Purpose:** Component-level role guard

**Props:**
```typescript
interface RoleGuardProps {
  children: React.ReactNode;
  role: string | string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}
```

**Usage:**
```typescript
<RoleGuard role="ADMIN">
  <AdminPanel />
</RoleGuard>
```

---

### 5.5 Route Guard Utilities

**Location:** `src/routes/routeGuards.ts`

**Purpose:** Utility functions for route protection logic

**Functions:**
```typescript
function canAccessRoute(
  route: RouteConfig,
  authState: AuthState,
  rbacState: RBACState
): boolean

function getRouteAccessError(
  route: RouteConfig,
  authState: AuthState,
  rbacState: RBACState
): string | null
```

---

### 5.6 Route Protection Flow

```
1. User navigates to route
2. AppRoutes checks route configuration
3. ProtectedRoute component checks:
   a. Authentication status
   b. Required roles
   c. Required permissions
4. If all checks pass → Render route component
5. If checks fail → Show unauthorized page or redirect
```

---

## 6. Data Flow Architecture

### 6.1 Login Flow

```
1. User submits login form
2. Call /auth/login/context API
3. Receive response:
   - access_token
   - user profile
   - roles[]
   - menus[] (hierarchical)
   - permissions[] (flattened from menus)
4. Store in AuthContext and RBACContext
5. Store in localStorage (with expiration)
6. Build menu tree
7. Redirect to dashboard/home
```

### 6.2 Permission Check Flow

```
1. Component needs to check permission
2. Use usePermissions() hook
3. Hook reads from RBACContext
4. Permission utility checks against user permissions
5. Return boolean result
6. Component renders conditionally
```

### 6.3 Menu Rendering Flow

```
1. RBACContext provides menus array
2. MenuRenderer component receives menus
3. Filter menus by permissions
4. Build hierarchical tree
5. Render MenuGroup components (level 1)
6. Render SubMenuItem components (level 2)
7. Handle navigation on click
```

---

## 7. Storage Strategy

### 7.1 Auth Storage

**Location:** `src/utils/storage/authStorage.ts`

**Stored Data:**
- `auth_token` - JWT token
- `auth_user` - User profile
- `auth_expires` - Token expiration timestamp

**Operations:**
- `saveAuthData()` - Save auth data
- `getAuthData()` - Retrieve auth data
- `clearAuthData()` - Clear auth data
- `isTokenExpired()` - Check token expiration

---

### 7.2 RBAC Storage

**Location:** `src/utils/storage/rbacStorage.ts`

**Stored Data:**
- `rbac_roles` - User roles
- `rbac_permissions` - User permissions
- `rbac_menus` - Menu hierarchy
- `rbac_timestamp` - Last fetch timestamp
- `rbac_expires` - Cache expiration timestamp

**Operations:**
- `saveRBACData()` - Save RBAC data
- `getRBACData()` - Retrieve RBAC data
- `clearRBACData()` - Clear RBAC data
- `isRBACDataExpired()` - Check cache expiration

**Cache Strategy:**
- Cache RBAC data for 5 minutes (configurable)
- Refresh on login
- Refresh on manual refresh
- Clear on logout

---

## 8. Hooks Architecture

### 8.1 useRBAC Hook

**Location:** `src/hooks/useRBAC.ts`

**Purpose:** Access RBAC context and utilities

**Returns:**
```typescript
{
  roles: string[];
  permissions: string[];
  menus: MenuNode[];
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshRBAC: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
```

---

### 8.2 usePermissions Hook

**Location:** `src/hooks/usePermissions.ts`

**Purpose:** Permission checking utilities

**Returns:**
```typescript
{
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  permissions: string[];
}
```

---

### 8.3 useMenu Hook

**Location:** `src/hooks/useMenu.ts`

**Purpose:** Menu data and utilities

**Returns:**
```typescript
{
  menus: MenuNode[];
  menuTree: MenuNode[];
  getMenuByPath: (path: string) => MenuNode | null;
  getMenuFeatures: (menuId: number) => Feature[];
  activeMenu: MenuNode | null;
}
```

---

## 9. API Integration

### 9.1 Enhanced Auth Service

**Location:** `src/api/services/authService.ts`

**New Methods:**
```typescript
{
  loginWithContext: (credentials: LoginRequest) => Promise<LoginContextResponse>;
  refreshToken: () => Promise<TokenResponse>;
  logout: () => Promise<void>;
}
```

---

### 9.2 Login Context Response Type

**Location:** `src/types/auth.ts`

```typescript
interface LoginContextResponse {
  access_token: string;
  token_type: string;
  user: User;
  roles: string[];
  menus: MenuNode[];
  permissions: string[]; // Flattened from menus
}
```

---

## 10. Error Handling

### 10.1 Unauthorized Access

**Strategy:**
- Show 403 Unauthorized page
- Log unauthorized access attempts
- Redirect to login if token expired
- Show user-friendly error messages

### 10.2 Permission Denied

**Strategy:**
- Hide UI elements (don't show error)
- Show fallback content if provided
- Log permission checks for debugging

---

## 11. Performance Considerations

### 11.1 Optimization Strategies

1. **Memoization:**
   - Memoize permission checks
   - Memoize menu tree building
   - Memoize filtered menus

2. **Lazy Loading:**
   - Lazy load route components
   - Lazy load menu icons
   - Code split by route

3. **Caching:**
   - Cache RBAC data in localStorage
   - Cache menu tree structure
   - Cache permission check results

4. **Debouncing:**
   - Debounce menu filtering
   - Debounce permission checks (if needed)

---

## 12. Security Considerations

### 12.1 Client-Side Security

1. **Never trust client-side checks alone:**
   - All permission checks must be validated server-side
   - Client-side checks are for UX only

2. **Token Security:**
   - Store tokens securely (httpOnly cookies preferred)
   - Implement token refresh mechanism
   - Clear tokens on logout

3. **Data Validation:**
   - Validate all API responses
   - Sanitize user inputs
   - Handle malformed RBAC data gracefully

---

## 13. Testing Strategy

### 13.1 Unit Tests

- Permission utility functions
- Role checking functions
- Menu filtering logic
- Menu tree building

### 13.2 Integration Tests

- Auth flow
- RBAC data loading
- Menu rendering
- Route protection

### 13.3 E2E Tests

- Login flow
- Permission-based UI visibility
- Route access control
- Menu navigation

---

## Summary

This architecture provides:

✅ **Comprehensive RBAC support** - Roles, permissions, and features  
✅ **Dynamic menu rendering** - Based on user permissions  
✅ **Route protection** - Multi-level access control  
✅ **Component-level guards** - Fine-grained UI control  
✅ **Performance optimized** - Caching and memoization  
✅ **Type-safe** - Full TypeScript support  
✅ **Maintainable** - Clear separation of concerns  
✅ **Scalable** - Easy to extend with new permissions/roles  

The architecture follows React best practices and integrates seamlessly with the existing codebase structure.
