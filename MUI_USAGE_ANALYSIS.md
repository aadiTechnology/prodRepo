# Material UI (@mui/material) Usage Analysis

**Scope:** All files under `src` directory  
**Target components:** Button, TextField, Select, Checkbox, Dialog, Card, Tabs, Autocomplete, Typography  
**Source:** Imports from `@mui/material` only (no `@mui/lab` or other packages)

---

## 1. Component Usage (Summary)

| Component   | Total Usage | Files |
|------------|-------------|-------|
| **Typography** | ~120+ | 30+ |
| **Button**     | ~44  | 19   |
| **TextField**  | ~58  | 14   |
| **Select**     | 8    | 4    |
| **Dialog**     | 6    | 5    |
| **Card**       | 4    | 4    |
| **Checkbox**   | 1    | 1    |
| **Tabs**       | 1    | 1    |
| **Autocomplete** | 0  | 0    |

---

## 2. File-Level Usage (Target Components Only)

For each file that uses at least one target component from `@mui/material`: component name, occurrence count, whether `sx` prop is used on that component, and whether inline `style` is used in the same file (on any element).

| File | Component | Occurrences | Uses sx | Inline Style |
|------|-----------|-------------|---------|--------------|
| apps/web/src/pages/admin/ThemeStudioPage.tsx | Button | 10 | Yes | Yes |
| apps/web/src/pages/admin/ThemeStudioPage.tsx | TextField | 12 | Yes | Yes |
| apps/web/src/pages/admin/ThemeStudioPage.tsx | Dialog | 2 | Yes | — |
| apps/web/src/pages/admin/ThemeStudioPage.tsx | Typography | 12+ | Yes | — |
| apps/web/src/pages/tenants/AddTenant.tsx | Button | 2 | Yes | Yes |
| apps/web/src/pages/tenants/AddTenant.tsx | TextField | 14 | Yes | Yes |
| apps/web/src/pages/tenants/AddTenant.tsx | Select | 1 | Yes | — |
| apps/web/src/pages/tenants/AddTenant.tsx | Tabs | 1 | No | — |
| apps/web/src/pages/tenants/AddTenant.tsx | Typography | 7+ | Yes | — |
| apps/web/src/pages/tenants/TenantDetail.tsx | Button | 3 | Yes | No |
| apps/web/src/pages/tenants/TenantDetail.tsx | Typography | 15+ | Yes | No |
| apps/web/src/pages/CreateUser.tsx | Button | 4 | Yes | No |
| apps/web/src/pages/CreateUser.tsx | TextField | 5 | Yes | No |
| apps/web/src/pages/CreateUser.tsx | Dialog | 1 | Yes | No |
| apps/web/src/pages/CreateUser.tsx | Typography | 6+ | Yes | No |
| apps/web/src/pages/ChangePassword.tsx | Button | 4 | Yes | No |
| apps/web/src/pages/ChangePassword.tsx | TextField | 3 | Yes | No |
| apps/web/src/pages/ChangePassword.tsx | Dialog | 1 | Yes | No |
| apps/web/src/pages/ChangePassword.tsx | Typography | 7+ | Yes | No |
| apps/web/src/pages/ProfilePage.tsx | Button | 3 | Yes | Yes |
| apps/web/src/pages/ProfilePage.tsx | TextField | 3 | Yes | Yes |
| apps/web/src/pages/ProfilePage.tsx | Typography | 12+ | Yes | — |
| apps/web/src/pages/AddRole.tsx | Button | 2 | Yes | No |
| apps/web/src/pages/AddRole.tsx | TextField | 3 | Yes | No |
| apps/web/src/pages/AddRole.tsx | Typography | 3+ | Yes | No |
| apps/web/src/pages/RequirementGeneratePage.tsx | Button | 2 | Yes | No |
| apps/web/src/pages/RequirementGeneratePage.tsx | TextField | 1 | Yes | No |
| apps/web/src/pages/RequirementGeneratePage.tsx | Typography | 20+ | Yes | No |
| apps/web/src/pages/Users.tsx | Select | 3 | Yes | No |
| apps/web/src/pages/Users.tsx | Typography | 3 | Yes | No |
| apps/web/src/pages/Login.tsx | Button | 1 | No | No |
| apps/web/src/pages/Login.tsx | TextField | 2 | Yes | No |
| apps/web/src/pages/Login.tsx | Typography | 12+ | Yes | No |
| apps/web/src/pages/Register.tsx | Button | 1 | Yes | Yes |
| apps/web/src/pages/Register.tsx | TextField | 5 | Yes | Yes |
| apps/web/src/pages/Register.tsx | Typography | 1+ | Yes | — |
| apps/web/src/components/reusable/FormActionsBar.tsx | Button | 2 | No | No |
| apps/web/src/components/reusable/ListPageToolbar.tsx | TextField | 1 | Yes | No |
| apps/web/src/components/reusable/TablePaginationBar.tsx | Select | 1 | Yes | No |
| apps/web/src/components/reusable/TablePaginationBar.tsx | Typography | 2 | Yes | No |
| apps/web/src/components/reusable/DetailFieldRow.tsx | Typography | 1 | Yes | No |
| apps/web/src/components/reusable/FormSectionLabel.tsx | Typography | 1 | Yes | No |
| apps/web/src/components/reusable/FieldLabel.tsx | Typography | 1 | Yes | No |
| apps/web/src/components/reusable/PageBreadcrumbs.tsx | Typography | 1 | Yes | No |
| apps/web/src/components/reusable/FormSectionTitle.tsx | Typography | 1 | Yes | No |
| apps/web/src/components/reusable/DirectoryInfoBar.tsx | Typography | 2 | Yes | No |
| apps/web/src/components/common/ConfirmDialog.tsx | Dialog | 1 | No | No |
| apps/web/src/components/common/ConfirmDialog.tsx | Button | 2 | No | No |
| apps/web/src/components/common/PageHeader.tsx | Typography | 2 | Yes | No |
| apps/web/src/components/layout/Sidebar.tsx | Typography | 3 | Yes | No |
| apps/web/src/components/layout/PageHeader.tsx | Typography | 2 | Yes | No |
| apps/web/src/components/primitives/AppCard.tsx | Card | 1 | Yes | No |
| apps/web/src/components/primitives/Section.tsx | Typography | 1 | Yes | No |
| apps/web/src/components/UserForm.tsx | Button | 2 | No | No |
| apps/web/src/components/UserForm.tsx | TextField | 5 | No | No |
| apps/web/src/components/UserForm.tsx | Dialog | 1 | Yes | No |
| apps/web/src/components/roles/RoleSummaryCards.tsx | Card | 1 | Yes | No |
| apps/web/src/components/roles/RoleSummaryCards.tsx | Button | 1 | Yes | No |
| apps/web/src/components/roles/RoleSummaryCards.tsx | Typography | 3 | No | No |
| apps/web/src/components/roles/RoleTable.tsx | TextField | 1 | Yes | No |
| apps/web/src/components/roles/RoleTable.tsx | Typography | 5+ | Yes | No |
| apps/web/src/components/roles/RoleInfoBox.tsx | Button | 1 | No | No |
| apps/web/src/components/roles/RoleInfoBox.tsx | Typography | — | Yes | No |
| apps/web/src/components/roles/RoleForm.tsx | Button | 1 | Yes | No |
| apps/web/src/components/roles/RoleForm.tsx | TextField | 3 | Yes | No |
| apps/web/src/components/roles/RoleForm.tsx | Select | 3 | Yes | No |
| apps/web/src/components/roles/RoleForm.tsx | Card | 1 | Yes | No |
| apps/web/src/components/roles/RoleForm.tsx | Typography | 1+ | Yes | No |
| apps/web/src/components/roles/PermissionGroup.tsx | Card | 1 | Yes | No |
| apps/web/src/components/roles/PermissionGroup.tsx | Checkbox | 1 | Yes | No |
| apps/web/src/components/roles/PermissionGroup.tsx | Typography | 2 | Yes | No |
| apps/web/src/components/AIAssistant.tsx | TextField | 1 | Yes | No |
| apps/web/src/components/AIAssistant.tsx | Typography | 1 | Yes | No |
| apps/web/src/layout/MainLayout.tsx | Typography | 8+ | Yes | No |
| apps/web/src/layout/Header.tsx | Button | 1 | Yes | No |
| apps/web/src/layout/Header.tsx | Typography | 2 | Yes | No |
| apps/web/src/components/ErrorFallback.tsx | Button | 1 | No | No |
| apps/web/src/components/ErrorBoundary.tsx | Button | 2 | No | No |

**Inline styling note:** `style={{ ... }}` appears in ThemeStudioPage.tsx (color picker boxes, 3), AddTenant.tsx (image preview, 2), ProfilePage.tsx, TenantList.tsx, Register.tsx. Most styling is via `sx`.

---

## 3. Style Patterns (sx and theme)

Values observed on MUI target components and surrounding layout (Box, Paper, etc.) using `sx` or theme.

### 3.1 fontSize

| Values Found | Frequency / Context |
|--------------|----------------------|
| `"0.65rem"` – `"0.95rem"` (labels, captions) | High (captions, helper text, section labels) |
| `"0.875rem"` | Very common (body, inputs, menu) |
| `"0.9rem"`, `"1rem"`, `"1.05rem"`, `"1.1rem"` | Common (headings, buttons) |
| `"22px"` | Page titles (CreateUser, ChangePassword, AddRole) |
| `"1.9rem"` | Success dialog title |
| `12`–`24` (numeric) | Icons, small UI (e.g. SearchIcon 20, BackIcon 24) |
| `theme.typography.body2.fontSize` | ListPageToolbar, TablePaginationBar |

### 3.2 padding

| Values Found | Frequency |
|--------------|-----------|
| `p: 0`, `p: 2`, `p: 3`, `p: 4` | Very common |
| `px: 2`, `px: 3`, `px: 4`, `px: { xs: 2, md: 3 }` | Common (sections, dialogs) |
| `py: 0.5`, `py: 1`, `py: 1.5`, `py: 2`, `py: 2.5` | Common |
| `pt: 2`, `pb: 2`, `pb: 1.5` | Section/content spacing |
| `padding: theme.spacing(2)` | Sidebar |
| `padding: "8px 12px"`, `"10px 16px"` | Sidebar nav items |

### 3.3 margin

| Values Found | Frequency |
|--------------|-----------|
| `mb: 1`, `mb: 2`, `mb: 2.5`, `mt: 2`, `mt: 0.5` | Very common |
| `mx: 1.5`, `ml: 3`, `mr: 2`, `my: 0.5` | Common |
| `margin: "4px 8px"`, `"2px 8px 2px 48px"` | Sidebar |
| `marginBottom: theme.spacing(1)` | Sidebar |

### 3.4 borderRadius

| Values Found | Frequency |
|--------------|-----------|
| `1`, `1.2`, `1.25`, `1.5`, `2`, `3` (theme spacing) | Very common |
| `"4px"`, `"6px"`, `"7px"`, `"8px"`, `"12px"`, `"14px"`, `"16px"`, `"20px"` | Common |
| `"50%"` | Avatars, icon circles |
| `theme.shape.borderRadius` | ListPageToolbar |
| `borderRadius: 0` | Dialog content edges |

### 3.5 colors

| Values Found | Frequency |
|--------------|-----------|
| `theme.palette.text.primary`, `theme.palette.text.secondary` | Very common |
| `theme.palette.primary.main`, `theme.palette.error.main`, `theme.palette.success.main` | Common |
| `theme.palette.background.paper`, `theme.palette.background.default` | Common |
| `theme.palette.divider`, `theme.palette.grey[50]`–`grey[800]` | Common |
| `"#1a1a2e"`, `"#64748b"`, `"#94a3b8"`, `"#0f172a"`, `"#1e293b"`, `"#38bdf8"`, `"#10b981"` | Hardcoded in pages/layout |
| `"white"`, `"rgba(255,255,255,0.7)"` | Headers, overlays |

### 3.6 hover styles

| Pattern | Files / Context |
|---------|------------------|
| `"&:hover": { bgcolor: theme.palette.action.hover }` | TablePaginationBar |
| `"&:hover": { borderColor: ... }` | Inputs, cards (PermissionGroup) |
| `"&:hover": { backgroundColor: theme.palette.grey[700] }` | CreateUser, AddRole (IconButton) |
| `"&:hover": { color: "#38bdf8" }`, `"&:hover": { color: "#F8FAFC" }` | Sidebar |
| `"&:hover fieldset": { borderColor: theme.palette.grey[400] }` | TextField (AddTenant, ListPageToolbar) |
| `"&:hover": { bgcolor: "grey.700" }` | AddTenant (upload button) |

### 3.7 disabled styles

| Pattern | Files |
|---------|--------|
| `"&.Mui-disabled": { borderColor: theme.palette.divider }` | TablePaginationBar (IconButtons) |
| `"&.Mui-disabled": { backgroundColor: theme.palette.grey[400], color: "white" }` | AddTenant, ProfilePage (buttons) |
| `"& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: theme.palette.grey[500] }` | AddTenant, ProfilePage (TextField) |
| `"&.Mui-disabled": { bgcolor: theme.palette.grey[300], color: theme.palette.text.secondary }` | ProfilePage |
| `"&.Mui-disabled": { color: theme.palette.text.secondary }` | AddTenant (Button) |

### 3.8 layout (flex / grid)

| Pattern | Frequency |
|---------|-----------|
| `display: "flex"`, `flexDirection: "column"`, `gap: 1`, `gap: 1.5`, `gap: 2` | Very common |
| `alignItems: "center"`, `justifyContent: "space-between"`, `justifyContent: "flex-end"` | Very common |
| `display: "grid"`, `gridTemplateColumns: "1fr 1fr"`, `gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }` | AddTenant, form sections |
| `flex: 1`, `flexGrow: 1`, `flexShrink: 0` | Common |
| `gridColumn: "1 / 3"` | Full-width fields in grid |

---

## 4. Repeated UI Patterns

| Pattern | Files | Description |
|---------|--------|-------------|
| **Form rows (label + input)** | AddTenant, CreateUser, ChangePassword, ProfilePage, AddRole, UserForm, RoleForm, Register | `FieldLabel` or similar + `TextField`/`Select`/`Switch` in a row or grid; often with `FormSectionLabel` for section title + icon. |
| **Dialog structure** | ThemeStudioPage, CreateUser, ChangePassword, ConfirmDialog, UserForm | `Dialog` → `DialogTitle` / header → `DialogContent` → `DialogActions` with Cancel + primary (e.g. Confirm/Save). Success confirmation dialogs with icon + message + single OK. |
| **Card layouts** | AppCard, RoleSummaryCards, RoleForm, PermissionGroup | `Card` (often `variant="outlined"`) with `CardContent`, sometimes in `Grid`; PermissionGroup uses Card + Checkbox per permission. |
| **Tab pages** | AddTenant | Single use: `Tabs` + `Tab` (Upload / URL) for logo input. |
| **Search + filter bar** | TenantList, RoleManagementPage, Users | `ListPageToolbar` with search `TextField` (with `InputAdornment` Search icon), optional “Add” button and `renderActions` (e.g. Role/Status/Sort `Select`s on Users). |
| **Detail field rows** | TenantDetail | `DetailFieldRow` (label + value + optional `Divider`) repeated for tenant fields. |
| **Form section headers** | AddTenant, ProfilePage | `FormSectionLabel` (icon + title) above a block of fields. |
| **Page header + breadcrumb** | CreateUser, ChangePassword, AddRole, TenantDetail, etc. | Back button + breadcrumb (e.g. Home / Section / Page) + title; often dark header bar with `Typography` and action buttons (Save, Cancel). |
| **List page layout** | TenantList, RoleManagementPage, Users | `ListPageLayout` with `PageHeader` + `ListPageToolbar` + optional `DirectoryInfoBar` + `DataTable` + `TablePaginationBar`. |
| **Table pagination** | TablePaginationBar, DataTable consumers | “Rows per page” `Select` + “X–Y of Z” `Typography` + prev/next `IconButton`s. |

---

## 5. Files That Import @mui/material (No Target Components in Scope)

These files import from `@mui/material` but do not use any of the target components (Button, TextField, Select, Checkbox, Dialog, Card, Tabs, Autocomplete, Typography):

- apps/web/src/theme/** (themeBuilder, palette, typography, components, breakpoints, AppThemeProvider, tenantThemeGenerator — types/theme only, or CssBaseline/ThemeProvider)
- apps/web/src/routes/AppRoutes.tsx (Box, CircularProgress)
- apps/web/src/components/reusable/TableRowActions.tsx (IconButton, Tooltip)
- apps/web/src/components/reusable/PrimaryActionButton.tsx (IconButton, Tooltip)
- apps/web/src/components/layout/DashboardGrid.tsx (Grid)
- apps/web/src/components/layout/ContentContainer.tsx (Box)
- apps/web/src/components/common/Container.tsx (Container)
- apps/web/src/components/reusable/DataTable.tsx (Table, TableHead, TableBody, etc. — table primitives only)
- apps/web/src/components/roles/StatusChip.tsx, ScopeChip.tsx (Chip)
- apps/web/src/components/menu/SubMenuItem.tsx, MenuRenderer.tsx, MenuGroup.tsx (List, ListItemButton, etc. — no target components)

---

**End of report.** No code was modified; analysis only.
