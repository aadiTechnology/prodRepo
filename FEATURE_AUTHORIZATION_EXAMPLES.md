# Feature-Level Authorization Utilities - Usage Examples

## Overview

This document provides examples and usage patterns for the feature-level authorization utilities implemented in the frontend.

---

## 1. Permission Utilities

### Location: `src/utils/permissions/`

**Files:**
- `checkPermission.ts` - Permission checking functions
- `checkRole.ts` - Role checking functions
- `index.ts` - Exports

### Usage

```typescript
import { checkPermission, hasAnyPermission, hasAllPermissions } from "../utils/permissions";
import { useRBAC } from "../context/RBACContext";

function MyComponent() {
  const { permissions } = useRBAC();

  // Single permission check
  if (checkPermission("USER_EDIT", permissions)) {
    // User can edit
  }

  // Multiple permissions (OR - user needs ANY)
  if (hasAnyPermission(["USER_EDIT", "USER_DELETE"], permissions)) {
    // User can edit OR delete
  }

  // Multiple permissions (AND - user needs ALL)
  if (hasAllPermissions(["USER_VIEW", "USER_EXPORT"], permissions)) {
    // User can view AND export
  }
}
```

---

## 2. PermissionGate Component

### Location: `src/components/auth/PermissionGate.tsx`

**Purpose:** Conditionally render UI elements based on permissions

### Basic Usage

```typescript
import PermissionGate from "../components/auth/PermissionGate";
import { Button } from "@mui/material";

function UserActions() {
  return (
    <Box>
      {/* Show edit button only if user has USER_EDIT permission */}
      <PermissionGate permission="USER_EDIT">
        <Button variant="contained" color="primary">
          Edit User
        </Button>
      </PermissionGate>

      {/* Show delete button only if user has USER_DELETE permission */}
      <PermissionGate permission="USER_DELETE">
        <Button variant="contained" color="error">
          Delete User
        </Button>
      </PermissionGate>
    </Box>
  );
}
```

### Multiple Permissions (OR Logic)

```typescript
// Show button if user has ANY of these permissions
<PermissionGate permission={["USER_EDIT", "USER_DELETE"]}>
  <Button>Actions</Button>
</PermissionGate>
```

### Multiple Permissions (AND Logic)

```typescript
// Show button only if user has ALL permissions
<PermissionGate
  permission={["USER_VIEW", "USER_EXPORT"]}
  requireAll
>
  <Button>Export Users</Button>
</PermissionGate>
```

### With Fallback Content

```typescript
<PermissionGate
  permission="USER_DELETE"
  fallback={<Typography color="error">No delete access</Typography>}
>
  <Button variant="contained" color="error">
    Delete User
  </Button>
</PermissionGate>
```

### Real-World Example: User Management Page

```typescript
import PermissionGate from "../components/auth/PermissionGate";
import { Button, IconButton, Tooltip } from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";

function UsersPage() {
  return (
    <Box>
      {/* Create button - requires USER_CREATE permission */}
      <PermissionGate permission="USER_CREATE">
        <Button startIcon={<Add />} variant="contained">
          Create User
        </Button>
      </PermissionGate>

      <Table>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              {/* Edit button - requires USER_EDIT permission */}
              <PermissionGate permission="USER_EDIT">
                <Tooltip title="Edit User">
                  <IconButton onClick={() => handleEdit(user)}>
                    <Edit />
                  </IconButton>
                </Tooltip>
              </PermissionGate>

              {/* Delete button - requires USER_DELETE permission */}
              <PermissionGate permission="USER_DELETE">
                <Tooltip title="Delete User">
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(user)}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </PermissionGate>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </Box>
  );
}
```

---

## 3. RoleGuard Component

### Location: `src/components/auth/RoleGuard.tsx`

**Purpose:** Conditionally render UI elements based on roles

### Basic Usage

```typescript
import RoleGuard from "../components/auth/RoleGuard";
import { AdminPanel } from "../components";

function Dashboard() {
  return (
    <Box>
      <Typography>Welcome to Dashboard</Typography>

      {/* Show admin panel only to admins */}
      <RoleGuard role="ADMIN">
        <AdminPanel />
      </RoleGuard>
    </Box>
  );
}
```

### Multiple Roles (OR Logic)

```typescript
// Show if user has ANY of these roles
<RoleGuard role={["ADMIN", "SUPER_ADMIN"]}>
  <AdminFeatures />
</RoleGuard>
```

### With Fallback

```typescript
<RoleGuard
  role="ADMIN"
  fallback={<Alert severity="info">Admin access required</Alert>}
>
  <AdminPanel />
</RoleGuard>
```

---

## 4. Enhanced ProtectedRoute

### Location: `src/components/auth/ProtectedRoute.tsx`

**Purpose:** Protect routes with authentication and permissions

### Basic Authentication

```typescript
// Existing usage - still works (backward compatible)
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

### Permission-Based Route Protection

```typescript
// Require specific permission
<Route
  path="/users/edit"
  element={
    <ProtectedRoute requiredPermissions="USER_EDIT">
      <EditUserPage />
    </ProtectedRoute>
  }
/>
```

### Multiple Permissions (OR)

```typescript
// User needs ANY of these permissions
<Route
  path="/users/actions"
  element={
    <ProtectedRoute
      requiredPermissions={["USER_EDIT", "USER_DELETE"]}
    >
      <UserActionsPage />
    </ProtectedRoute>
  }
/>
```

### Multiple Permissions (AND)

```typescript
// User needs ALL permissions
<Route
  path="/users/export"
  element={
    <ProtectedRoute
      requiredPermissions={["USER_VIEW", "USER_EXPORT"]}
      requireAllPermissions
    >
      <ExportPage />
    </ProtectedRoute>
  }
/>
```

### Role-Based Route Protection

```typescript
// Require specific role
<Route
  path="/admin"
  element={
    <ProtectedRoute requiredRoles="ADMIN">
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

### Combined Permissions and Roles

```typescript
// User needs permission AND role
<Route
  path="/admin/users"
  element={
    <ProtectedRoute
      requiredPermissions="USER_MANAGE"
      requiredRoles="ADMIN"
    >
      <AdminUserManagement />
    </ProtectedRoute>
  }
/>
```

### Show Unauthorized Message

```typescript
// Show message instead of redirecting
<Route
  path="/restricted"
  element={
    <ProtectedRoute
      requiredPermissions="SPECIAL_ACCESS"
      showUnauthorized
    >
      <RestrictedPage />
    </ProtectedRoute>
  }
/>
```

### Custom Redirect

```typescript
<Route
  path="/premium"
  element={
    <ProtectedRoute
      requiredPermissions="PREMIUM_ACCESS"
      redirectTo="/upgrade"
    >
      <PremiumPage />
    </ProtectedRoute>
  }
/>
```

---

## 5. usePermissions Hook

### Location: `src/hooks/usePermissions.ts`

**Purpose:** Convenience hook for permission checking

### Usage

```typescript
import { usePermissions } from "../hooks/usePermissions";

function MyComponent() {
  const { hasPermission, hasAnyPermission, permissions } = usePermissions();

  // Check single permission
  const canEdit = hasPermission("USER_EDIT");

  // Check multiple permissions
  const canModify = hasAnyPermission(["USER_EDIT", "USER_DELETE"]);

  // Access all permissions
  console.log("User permissions:", permissions);

  return (
    <Box>
      {canEdit && <Button>Edit</Button>}
      {canModify && <Button>Modify</Button>}
    </Box>
  );
}
```

---

## 6. Complete Route Protection Example

### Updated AppRoutes.tsx

```typescript
import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "../layout/MainLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

const Home = lazy(() => import("../pages/Home"));
const Users = lazy(() => import("../pages/Users"));
const EditUser = lazy(() => import("../pages/EditUser"));
const AdminPanel = lazy(() => import("../pages/AdminPanel"));
const Login = lazy(() => import("../pages/Login"));

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes with layout */}
      <Route element={<MainLayout />}>
        {/* Basic authentication */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* Permission-based protection */}
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredPermissions="USER_VIEW">
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users/edit/:id"
          element={
            <ProtectedRoute requiredPermissions="USER_EDIT">
              <EditUser />
            </ProtectedRoute>
          }
        />

        {/* Role-based protection */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRoles="ADMIN">
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Combined protection */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute
              requiredPermissions="USER_MANAGE"
              requiredRoles={["ADMIN", "SUPER_ADMIN"]}
            >
              <AdminUserManagement />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
```

---

## 7. Component-Level Examples

### Button with Permission Check

```typescript
import PermissionGate from "../components/auth/PermissionGate";
import { Button } from "@mui/material";

function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <CardContent>
        <Typography>{user.full_name}</Typography>
        <Typography>{user.email}</Typography>
      </CardContent>
      <CardActions>
        <PermissionGate permission="USER_EDIT">
          <Button size="small">Edit</Button>
        </PermissionGate>
        <PermissionGate permission="USER_DELETE">
          <Button size="small" color="error">
            Delete
          </Button>
        </PermissionGate>
      </CardActions>
    </Card>
  );
}
```

### Menu Item with Permission Check

```typescript
import PermissionGate from "../components/auth/PermissionGate";
import { ListItemButton, ListItemText } from "@mui/material";

function NavigationMenu() {
  return (
    <List>
      <ListItemButton component={Link} to="/users">
        <ListItemText primary="Users" />
      </ListItemButton>

      <PermissionGate permission="USER_CREATE">
        <ListItemButton component={Link} to="/users/create">
          <ListItemText primary="Create User" />
        </ListItemButton>
      </PermissionGate>

      <PermissionGate permission="USER_EXPORT">
        <ListItemButton component={Link} to="/users/export">
          <ListItemText primary="Export Users" />
        </ListItemButton>
      </PermissionGate>
    </List>
  );
}
```

### Conditional Rendering with usePermissions

```typescript
import { usePermissions } from "../hooks/usePermissions";
import { Button, Box } from "@mui/material";

function ActionBar() {
  const { hasPermission, hasAnyPermission } = usePermissions();

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      {hasPermission("USER_VIEW") && (
        <Button variant="outlined">View</Button>
      )}

      {hasPermission("USER_EDIT") && (
        <Button variant="contained">Edit</Button>
      )}

      {hasAnyPermission(["USER_DELETE", "USER_ADMIN"]) && (
        <Button variant="contained" color="error">
          Delete
        </Button>
      )}
    </Box>
  );
}
```

---

## 8. Best Practices

### ✅ DO

1. **Use PermissionGate for UI elements**
   ```typescript
   <PermissionGate permission="USER_EDIT">
     <Button>Edit</Button>
   </PermissionGate>
   ```

2. **Use ProtectedRoute for entire pages**
   ```typescript
   <ProtectedRoute requiredPermissions="USER_VIEW">
     <UsersPage />
   </ProtectedRoute>
   ```

3. **Use usePermissions hook for conditional logic**
   ```typescript
   const { hasPermission } = usePermissions();
   if (hasPermission("USER_EDIT")) {
     // Do something
   }
   ```

4. **Provide fallback content when appropriate**
   ```typescript
   <PermissionGate
     permission="PREMIUM_FEATURE"
     fallback={<UpgradePrompt />}
   >
     <PremiumFeature />
   </PermissionGate>
   ```

### ❌ DON'T

1. **Don't rely solely on client-side checks**
   - Always validate permissions server-side
   - Client-side checks are for UX only

2. **Don't expose sensitive data in fallbacks**
   ```typescript
   // Bad: Exposes permission name
   <PermissionGate
     permission="ADMIN_SECRET"
     fallback={<Typography>You need ADMIN_SECRET permission</Typography>}
   />
   ```

3. **Don't nest too many PermissionGates**
   ```typescript
   // Bad: Too nested
   <PermissionGate permission="A">
     <PermissionGate permission="B">
       <PermissionGate permission="C">
         <Button>Action</Button>
       </PermissionGate>
     </PermissionGate>
   </PermissionGate>

   // Good: Use requireAll
   <PermissionGate permission={["A", "B", "C"]} requireAll>
     <Button>Action</Button>
   </PermissionGate>
   ```

---

## 9. Integration with Existing Code

### Backward Compatibility

All existing code continues to work:

```typescript
// ✅ Still works - backward compatible
<ProtectedRoute requireAdmin>
  <AdminPage />
</ProtectedRoute>
```

### Gradual Migration

You can gradually add permission checks:

```typescript
// Step 1: Add permission check to route
<ProtectedRoute requiredPermissions="USER_VIEW">
  <UsersPage />
</ProtectedRoute>

// Step 2: Add permission checks to buttons
<PermissionGate permission="USER_EDIT">
  <Button>Edit</Button>
</PermissionGate>
```

---

## 10. Type Safety

All utilities are fully typed:

```typescript
// ✅ Type-safe permission checking
const canEdit = hasPermission("USER_EDIT"); // boolean

// ✅ Type-safe component props
<PermissionGate
  permission="USER_EDIT" // string | string[]
  requireAll={false} // boolean
  fallback={<div />} // ReactNode
>
  <Button />
</PermissionGate>
```

---

## Summary

✅ **Permission utilities** - `checkPermission`, `hasAnyPermission`, `hasAllPermissions`  
✅ **Role utilities** - `checkRole`, `hasAnyRole`, `hasAllRoles`  
✅ **PermissionGate component** - Conditional rendering based on permissions  
✅ **RoleGuard component** - Conditional rendering based on roles  
✅ **Enhanced ProtectedRoute** - Route-level permission/role protection  
✅ **usePermissions hook** - Convenience hook for permission checking  
✅ **No breaking changes** - All existing code continues to work  
✅ **Type-safe** - Full TypeScript support  

The authorization utilities are ready to use throughout the application!
