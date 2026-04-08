# Tenant Management Pages: Architecture & Design Overview

This document provides a comprehensive overview of the architecture, semantics, primitives, configuration, and theming/tokenization for the following pages:
- TenantList.tsx
- AddTenant.tsx

---

## 1. Architecture

### High-Level Structure
- **TenantList.tsx**: Implements the tenant directory listing, search, sort, and actions (edit, delete, impersonate). Uses a controller hook for state and logic separation.
- **AddTenant.tsx**: Handles both tenant creation and editing. Utilizes a form manager hook, dynamic form config, and supports media uploads and theme template selection.

### Component Composition
- **Reusable Layouts**: Both pages use shared layout components (`ListPageLayout`, `PageHeader`, `BaseForm`).
- **Separation of Concerns**: Data fetching, state, and side effects are managed in hooks/services, while UI is composed from reusable and semantic components.

---

## 2. Semantics

- **EntityTableSection**: Semantic table for listing tenants, with row actions and sticky headers.
- **BaseForm**: Semantic form abstraction for add/edit flows, with validation and error handling.
- **ConfirmDialog**: Used for destructive actions (delete confirmation).
- **Snackbar/Alert**: Semantic feedback for user actions (success, error).

---

## 3. Primitives

- **MUI Components**: Box, Typography, Button, Select, MenuItem, Alert, Snackbar, etc.
- **React Router**: Navigation and route params for context-aware rendering.
- **State Primitives**: useState, useEffect, useMemo, useCallback for local and derived state.
- **Custom Hooks**: `useTenantListController`, `useFormManager` for encapsulating logic.

---

## 4. Configuration

- **Form Config**: Dynamic form configuration via `createAddTenantFormConfig`, supporting both add and edit modes.
- **Validation Config**: Centralized validation rules using presets and custom logic.
- **List Config**: Table columns, row actions, and UI policy are configured via `createTenantListConfig`.
- **API Services**: Abstracted service modules for tenant and theme template operations.

---

## 5. Theming & Tokenization

- **Theme Templates**: Tenants can be assigned a theme template (`theme_template_id`), fetched from the backend.
- **Design Tokens**: Styling is handled via MUI's theme system, with support for custom tokens via theme templates.
- **Logo Upload**: Supports media upload and preview, with size validation and data URL handling.

---

## 6. Messaging & Feedback

- **Snackbar/Alert**: User feedback for success and error states.
- **ConfirmDialog**: Explicit confirmation for destructive actions.
- **Error Mapping**: API errors are mapped to form fields and global error messages.

---

## 7. Token (Authentication/Impersonation)

- **Impersonation**: System admins can impersonate tenants via `loginAsTenant`, updating the auth context.
- **Auth Context**: User and token management is handled via `useAuth` context.

---

## 8. Extensibility & Best Practices

- **Hooks for Logic**: All business logic and side effects are encapsulated in hooks for testability and reuse.
- **Config-Driven UI**: Forms and tables are driven by configuration objects, enabling easy extension.
- **Separation of UI & Logic**: UI components are kept declarative and stateless where possible.

---

## 9. File References
- **TenantList.tsx**: `apps/web/src/pages/tenants/TenantList.tsx`
- **AddTenant.tsx**: `apps/web/src/pages/tenants/AddTenant.tsx`

---

## 10. Related Components & Utilities
- **Reusable Components**: `components/reusable`, `components/layout`, `components/semantic`
- **Hooks**: `hooks/useFormManager`, `hooks/useTenantListController`
- **API Services**: `api/services/tenantService`, `api/services/themeTemplateService`
- **Validation**: `utils/formValidation`, `utils/formValidationPresets`

---

This document serves as a reference for developers and designers to understand the structure, semantics, configuration, and extensibility of the tenant management pages. For further details, refer to the respective source files and configuration modules.
