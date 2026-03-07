# React TypeScript SaaS – Folder Architecture

A scalable folder structure for a **multi-tenant SaaS** with **admin dashboards**, **FastAPI** backend, and **reusable UI components**.

---

## 1. Recommended Folder Structure

```
apps/web/src/
├── api/                          # API layer (FastAPI integration)
│   ├── client.ts                  # Axios instance, interceptors, auth
│   ├── axiosInstance.ts           # Alias or secondary config if needed
│   ├── types/                     # API-specific types (requests/responses)
│   │   ├── api.ts                 # Generic API types (pagination, error)
│   │   └── index.ts
│   └── services/                  # One service per domain (mirrors FastAPI routers)
│       ├── authService.ts
│       ├── userService.ts
│       ├── tenantService.ts
│       ├── roleService.ts
│       ├── profileService.ts
│       ├── aiService.ts
│       └── index.ts               # Re-export all services
│
├── assets/                        # Static assets (images, fonts, SVGs)
│
├── components/                    # Reusable UI components
│   ├── common/                    # Generic, app-agnostic (buttons, dialogs, layout primitives)
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── ConfirmDialog/
│   │   ├── PageHeader/
│   │   ├── Container/
│   │   ├── DataTable/             # Reusable table + pagination
│   │   ├── ListPageToolbar/       # Search + primary action
│   │   └── index.ts
│   ├── layout/                    # App shell (sidebar, header, main layout)
│   │   ├── MainLayout/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── index.ts
│   ├── auth/                      # Auth-specific (guards, permission gates)
│   │   ├── ProtectedRoute/
│   │   ├── RoleGuard/
│   │   ├── PermissionGate/
│   │   └── index.ts
│   ├── menu/                      # Navigation (menu renderer, groups, items)
│   │   ├── MenuRenderer/
│   │   ├── MenuGroup/
│   │   ├── SubMenuItem/
│   │   └── index.ts
│   ├── roles/                     # Feature: role management (domain-specific)
│   │   ├── RoleTable/
│   │   ├── RoleForm/
│   │   ├── RoleInfoBox/
│   │   ├── StatusChip/
│   │   ├── ScopeChip/
│   │   ├── PermissionGroup/
│   │   └── index.ts
│   ├── users/                     # Feature: user management (optional grouping)
│   │   ├── UserForm/
│   │   └── index.ts
│   ├── ErrorBoundary.tsx
│   ├── ErrorFallback.tsx
│   └── AIAssistant.tsx
│
├── config/                        # App configuration (env, feature flags)
│   ├── env.ts
│   ├── routes.ts                  # Route paths as constants
│   └── index.ts
│
├── constants/                     # Non-env constants (roles, permissions, labels)
│   ├── permissions.ts
│   ├── routes.ts
│   └── index.ts
│
├── context/                       # React context (auth, tenant, RBAC)
│   ├── AuthContext.tsx
│   ├── RBACContext.tsx
│   ├── TenantContext.tsx         # Optional: current tenant for multi-tenant UI
│   └── index.ts
│
├── features/                      # (Optional) Feature-based modules for large apps
│   ├── tenants/
│   │   ├── components/            # Tenant-specific components
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── types.ts
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── users/
│   │   └── settings/
│   └── ...
│
├── hooks/                         # Shared hooks (data, UI, auth)
│   ├── usePermissions.ts
│   ├── useAuth.ts                 # Optional: wrap AuthContext
│   ├── useListData.ts             # List + loading + error + refetch
│   └── index.ts
│
├── layout/                        # Top-level layout wrappers (if not under components/layout)
│   ├── MainLayout.tsx
│   └── Header.tsx
│
├── pages/                         # Route-level components (one per route/screen)
│   ├── auth/                      # Auth flows
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── SessionExpired.tsx
│   │   └── ChangePassword.tsx
│   ├── tenants/                   # Tenant management
│   │   ├── TenantList.tsx
│   │   ├── TenantDetail.tsx
│   │   └── AddTenant.tsx
│   ├── users/
│   │   ├── Users.tsx
│   │   └── CreateUser.tsx
│   ├── roles/
│   │   ├── RoleManagementPage.tsx
│   │   ├── AddRole.tsx
│   │   └── EditRole.tsx
│   ├── profile/
│   │   └── ProfilePage.tsx
│   ├── Home.tsx
│   ├── About.tsx
│   ├── RequirementGeneratePage.tsx
│   └── index.ts                   # Re-export for lazy imports
│
├── routes/                        # Routing configuration
│   ├── AppRoutes.tsx
│   ├── ProtectedRoutes.tsx       # Optional: group protected routes
│   └── index.ts
│
├── theme/                         # MUI theme (palette, typography, components)
│   ├── theme.ts
│   ├── palette.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── breakpoints.ts
│   ├── components.ts
│   └── index.ts
│
├── types/                         # Global TypeScript types (domain models)
│   ├── api.ts                     # Pagination, ApiError, etc.
│   ├── auth.ts
│   ├── user.ts
│   ├── tenant.ts
│   ├── role.types.ts
│   ├── rbac.ts
│   ├── menu.ts
│   └── index.ts
│
├── utils/                         # Pure helpers (no React, no API)
│   ├── permissions/
│   │   ├── checkPermission.ts
│   │   ├── checkRole.ts
│   │   └── index.ts
│   ├── errorLogger.ts
│   ├── format.ts                  # Dates, numbers, strings
│   └── index.ts
│
├── App.tsx
├── main.tsx
└── index.css
```

### Multi-tenant and admin considerations

- **Tenant context**: Use `context/TenantContext.tsx` to hold current tenant (and optionally tenant list for switcher). Services can send `X-Tenant-Id` or rely on backend from token.
- **Admin vs tenant scope**: Keep **pages** flat by domain (tenants, users, roles). Use **routes** and **PermissionGate** to show admin-only sections; optional `pages/admin/` if you have many admin-only screens.
- **Feature folders**: Introduce `features/<domain>/` when a domain (e.g. tenants, billing) has many pages, components, and hooks; otherwise `pages/<domain>/` + `components/<domain>/` is enough.

---

## 2. Naming Conventions

| Kind | Convention | Example |
|------|------------|--------|
| **Components** | PascalCase | `PageHeader`, `ConfirmDialog`, `TenantList` |
| **Component files** | PascalCase, match component name | `PageHeader.tsx`, `ConfirmDialog.tsx` |
| **Folders (components)** | PascalCase for component folders, camelCase for feature/domain | `PageHeader/`, `roles/`, `common/` |
| **Pages** | PascalCase, suffix `Page` when it’s a full screen | `TenantList.tsx`, `ProfilePage.tsx`, `RoleManagementPage.tsx` |
| **Hooks** | camelCase, prefix `use` | `usePermissions`, `useListData`, `useAuth` |
| **Services** | camelCase, suffix `Service` | `userService.ts`, `tenantService.ts` |
| **Context** | PascalCase, suffix `Context` | `AuthContext.tsx`, `RBACContext.tsx` |
| **Types/Interfaces** | PascalCase | `User`, `Tenant`, `ApiError`, `UserCreate` |
| **Constants** | UPPER_SNAKE for true constants, camelCase for config objects | `DEFAULT_PAGE_SIZE`, `apiBaseUrl` |
| **Routes (path)** | kebab-case | `/tenant-management`, `/roles/:id/edit` |
| **Route path constants** | camelCase or UPPER_SNAKE in `config` or `constants` | `routes.tenantList`, `ROUTES.TENANT_LIST` |
| **Env variables** | UPPER_SNAKE in env files, camelCase in `config` | `VITE_API_BASE_URL` → `apiBaseUrl` |

### File naming

- **One main component per file**: Default export matches file name (`PageHeader.tsx` → `export default function PageHeader`).
- **Co-located files**: Same folder as component: `Button.test.tsx`, `Button.stories.tsx`, `index.ts` (re-export).
- **Types**: Either in `types/` (shared) or next to the module (e.g. `RoleTable.types.ts` or inside the file).

---

## 3. Component Rules

### 3.1 Hierarchy

1. **common/** – No domain logic. Used across the app (buttons, dialogs, tables, page header).
2. **layout/** – App shell (sidebar, header, main layout). May use auth/tenant context.
3. **auth/** – Auth and authorization (ProtectedRoute, RoleGuard, PermissionGate).
4. **&lt;domain&gt;/** (e.g. **roles/**, **users/**) – Domain-specific UI (RoleForm, UserForm, RoleTable). Can call services and use domain types.
5. **pages/** – Route-level components. Compose layout + domain components + common; handle route params and top-level data loading.

### 3.2 Rules

- **One default export per component file** (the main component). Named exports for subcomponents or types if needed.
- **Props interface**: Name as `ComponentNameProps` in the same file or in `ComponentName.types.ts`.
- **No direct API calls in common components**; pass data and callbacks via props. Pages or hooks do the API calls.
- **Domain components** (e.g. RoleForm) may use services; prefer passing `onSubmit` from the page for easier testing and reuse.
- **Barrel files**: Each component folder has `index.ts` that re-exports the component (and optionally types) so imports are `from "@/components/common"` or `from "@/components/roles"`.
- **Paths**: Use path aliases (e.g. `@/components`, `@/api`, `@/types`) so imports are stable when moving files.

### 3.3 Structure of a component folder

```
components/common/ConfirmDialog/
├── ConfirmDialog.tsx    # Implementation
├── ConfirmDialog.types.ts  # Optional: Props interface
├── ConfirmDialog.test.tsx  # Optional
└── index.ts            # export { default } from './ConfirmDialog';
```

### 3.4 Reusable UI

- Put truly reusable pieces in **common/** (DataTable, ConfirmDialog, PageHeader, ListPageToolbar).
- Keep feature-specific variations in **&lt;domain&gt;/** (e.g. RoleTable with role columns and actions).

---

## 4. Service Layer Rules

### 4.1 Role of services

- **Single responsibility**: One service per domain (user, tenant, role, auth, profile, ai). Mirrors FastAPI routers.
- **HTTP only**: Services use the shared **api client** (e.g. `apiClient` from `api/client.ts`). No React, no hooks inside services.
- **Return domain types**: Methods return typed data (and throw on error). Types live in `types/` or `api/types/`.

### 4.2 File and method naming

- **File**: `api/services/<domain>Service.ts` (e.g. `userService.ts`, `tenantService.ts`).
- **Export**: Object with methods (e.g. `userService.getAllUsers`) or named functions; default export for the service object is fine.
- **Methods**: camelCase, verb-first: `getUserById`, `createTenant`, `updateRole`, `deleteUser`.

### 4.3 Signatures and errors

- **Input**: Explicit parameters or a single request type (e.g. `UserCreate`, `ListTenantsParams`).
- **Output**: `Promise<T>` or `Promise<void>`. Use types from `types/` (e.g. `User`, `Tenant`, `PaginatedResponse<Tenant>`).
- **Errors**: Let the api client interceptors handle 401/redirect; services throw. Catch in hooks or pages and set error state or show toast.

### 4.4 Example (FastAPI alignment)

```ts
// api/services/tenantService.ts
import apiClient from "../client";
import type { Tenant, TenantCreate, TenantUpdate, PaginatedResponse } from "@/types";

export const tenantService = {
  list: (params: { search?: string; page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<Tenant>>("/tenants/", { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Tenant>(`/tenants/${id}`).then((r) => r.data),

  create: (data: TenantCreate) =>
    apiClient.post<Tenant>("/tenants/provision", data).then((r) => r.data),

  update: (id: number, data: TenantUpdate) =>
    apiClient.put<Tenant>(`/tenants/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/tenants/${id}`),

  activate: (id: number) =>
    apiClient.post(`/tenants/${id}/activate`),

  deactivate: (id: number) =>
    apiClient.post(`/tenants/${id}/deactivate`),
};
```

### 4.5 Multi-tenant and admin

- Tenant context: If the backend expects `X-Tenant-Id`, add it in the **api client** request interceptor from `TenantContext` (or from token).
- Admin-only endpoints: Same services; restrict access via routes and PermissionGate. No separate “admin service” unless you have a distinct backend prefix.

---

## 5. Type Definition Rules

### 5.1 Where types live

| Scope | Location | Example |
|-------|----------|--------|
| **Domain models** (shared by API and UI) | `types/<domain>.ts` or `types/<domain>.types.ts` | `types/user.ts`, `types/tenant.ts`, `types/role.types.ts` |
| **API contracts** (pagination, error, request/response DTOs) | `types/api.ts` or `api/types/` | `PaginatedResponse<T>`, `ApiError`, `ListParams` |
| **Component props** (single component) | Same folder as component: `ComponentName.types.ts` or inline | `ConfirmDialog.types.ts` |
| **Feature-specific** (only one feature) | Inside feature: `features/tenants/types.ts` | `TenantFormState` |

### 5.2 Naming

- **Models**: PascalCase, noun – `User`, `Tenant`, `Role`.
- **DTOs / API shapes**: Suffix with purpose – `UserCreate`, `UserUpdate`, `TenantCreate`, `PaginatedResponse<T>`.
- **Props**: `ComponentNameProps` – `ConfirmDialogProps`, `PageHeaderProps`.
- **Enums**: PascalCase; values UPPER_SNAKE or PascalCase – `RoleScope`, `UserStatus`.

### 5.3 Consistency with FastAPI

- **Mirror backend schemas**: Response types should match FastAPI response models (same property names; use `snake_case` in types if that’s what the API returns, or map in the service layer to camelCase).
- **Request types**: Match FastAPI request bodies (e.g. `UserCreate` with `full_name`, `role`, etc.) so the service can pass them through.
- **Ids**: Prefer `number` or `string` consistently; align with FastAPI (e.g. integer IDs).

### 5.4 Barrel and reuse

- **`types/index.ts`**: Re-export public types so consumers can `import type { User, Tenant } from "@/types"`.
- **No circular dependencies**: Types should not import from components or services. Components and services import from `types/` or `api/types/`.

### 5.5 Example layout

```ts
// types/api.ts
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
}

export interface ApiErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// types/user.ts
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  tenant_id: number | null;
  is_active: boolean;
  phone_number?: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  role: number | string;
  tenant_id?: number | null;
}

export interface UserUpdate {
  full_name?: string;
  role?: number | string;
  tenant_id?: number | null;
  is_active?: boolean;
}
```

---

## Quick Reference

| Area | Rule |
|------|------|
| **Folders** | `api/`, `components/` (common, layout, auth, &lt;domain&gt;), `pages/` (grouped by domain), `routes/`, `context/`, `hooks/`, `theme/`, `types/`, `utils/`, `config/`, `constants/` |
| **Components** | PascalCase; common = no API; domain = can use services; pages = compose and load data |
| **Services** | One per domain; use api client; camelCase methods; return typed Promises |
| **Types** | Domain in `types/`; API contracts in `types/api.ts` or `api/types/`; props in component folder or inline |
| **Naming** | Components/pages PascalCase; hooks `use*`; services `*Service`; types PascalCase; constants UPPER_SNAKE or config camelCase |

This layout supports multi-tenant SaaS, admin dashboards, FastAPI integration, and reusable UI while keeping a clear place for new features and types.
