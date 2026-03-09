# Material UI — Repeated UI Composition Patterns

**Scope:** Files in `src` that use components from `@mui/material`  
**Target components:** Button, TextField, Select, Checkbox, Dialog, Card, Tabs, Autocomplete, Typography  
**Rule:** Only patterns that appear in **2 or more files** are reported.

**Goal:** Identify UI compositions that should become reusable components in the design system. No code was modified.

---

## 1. Detected UI Patterns

| Pattern Name | Components | Layout | Files |
|--------------|------------|--------|-------|
| **Page header (title + actions)** | Typography, IconButton and/or Button, optional Stack | Flex row; left: back + title/breadcrumb, right: action buttons; `justifyContent: space-between` | AddTenant, ProfilePage, TenantList, RoleManagementPage, Users, ThemeStudioPage, RequirementGeneratePage (via `PageHeader`); CreateUser, ChangePassword, AddRole (custom inline) |
| **Form page header (breadcrumb + title + cancel/save)** | IconButton (back), Typography (breadcrumb + page title), Stack, IconButton (cancel), IconButton (save), Tooltip | Flex row; back + breadcrumb Typography + title; right: Cancel + Save IconButtons in Stack | CreateUser, ChangePassword, AddRole |
| **Search + filter bar** | TextField (search), InputAdornment, optional Button (Add), optional Select(s), Typography (labels) | Flex row; search field + optional primary action + optional filters (Typography + Select repeated) | TenantList, RoleManagementPage, Users (ListPageToolbar + optional renderActions); Users adds Role/Status/Sort Selects |
| **Form field row (label + input)** | Typography or FieldLabel, TextField or Select | Vertical stack or grid cell; label above input | AddTenant (FieldLabel + TextField), ProfilePage (local FieldLabel + TextField), RoleForm (TextField with label prop) |
| **Form section (section heading + grouped fields)** | Typography or FormSectionLabel, Box/Grid, FieldLabel, TextField, Select, Switch | Section label (optional icon) then grid or column of label+input rows | AddTenant (FormSectionLabel + grid of FieldLabel + TextField); ProfilePage (Typography headings + field groups) |
| **Dialog (title + content + actions)** | Dialog, DialogTitle, DialogContent, DialogContentText (optional), DialogActions, Button (Cancel), Button (Confirm/Submit) | Dialog shell; title; scrollable content; footer with Cancel + primary action | ThemeStudioPage (2 dialogs), ConfirmDialog (reusable), UserForm, CreateUser (confirm), ChangePassword (confirm) |
| **Confirm dialog (title + message + cancel/confirm)** | Dialog, DialogTitle, DialogContent, DialogContentText or custom content, DialogActions, Button × 2 | Standard confirm: title, message, Cancel + Confirm buttons | ConfirmDialog used in: TenantDetail, AddRole, TenantList, RoleManagementPage, Users, RoleTable; custom confirm in CreateUser, ChangePassword |
| **Form card (dark header + body + actions)** | Paper or Card, Box (header strip), Typography, Icon (optional), Box (body), Grid, TextField, Button/FormActionsBar (footer) | Card: dark header bar (icon + title); padded body (form); optional footer actions | CreateUser, ChangePassword, AddRole, AddTenant |
| **List page (header + toolbar + table + pagination)** | PageHeader, ListPageToolbar, optional DirectoryInfoBar, DataTable, TablePaginationBar | Vertical: header (title + toolbar); optional info bar; table; pagination bar | TenantList, RoleManagementPage, Users |
| **Table toolbar (search + add + filters)** | TextField, Button (Add), Select, Typography | Flex row; search + primary button + optional Select filters | TenantList, RoleManagementPage, Users (via ListPageToolbar and PageHeader actions) |
| **Form grid (responsive fields)** | Grid container, Grid item, TextField, Select | Grid with spacing; xs=12 and/or sm=6/md=4 for columns | CreateUser, ChangePassword, AddRole, RoleForm |
| **Success / confirmation modal (icon + title + message + buttons)** | Dialog, Box (header bar), IconButton (close), Box (content), Typography (title + message), Divider, Button × 2 | Custom dialog: dark top bar with close; content with large icon + title + message; divider; Cancel + Confirm text buttons | CreateUser, ChangePassword |
| **Card with header + body** | Card or Paper, Box (header), Typography, CardContent or Box (body) | Outlined card; optional header strip; content area | CreateUser, ChangePassword, AddRole (Paper + header Box + body); AddTenant (Paper + header + two-column body); RoleForm (Card + CardContent); RoleSummaryCards, PermissionGroup |
| **Breadcrumb or contextual title** | Breadcrumbs + Link + Typography, or Typography with inline " / " segments | Horizontal: Home / Section / Page or similar | CreateUser, ChangePassword, AddRole (Typography with spans); TenantDetail (Breadcrumbs) |
| **List page layout shell** | PageLayout, AppCard, optional PageHeader, children (toolbar, table, etc.) | PageLayout wraps AppCard; header slot for PageHeader + toolbar | TenantList, RoleManagementPage, Users, RequirementGeneratePage (ListPageLayout) |

---

## 2. Pattern Frequency

| Pattern | Occurrences (files) |
|---------|---------------------|
| Page header (title + actions) | 10 (7 via PageHeader, 3 custom) |
| Form page header (breadcrumb + cancel/save) | 3 |
| Search + filter bar | 3 |
| Form field row (label + input) | 3 |
| Form section (heading + grouped fields) | 2 |
| Dialog (title + content + actions) | 5+ (multiple dialogs across 4+ files) |
| Confirm dialog (title + message + cancel/confirm) | 8 (6 via ConfirmDialog, 2 custom) |
| Form card (dark header + body + actions) | 4 |
| List page (header + toolbar + table + pagination) | 3 |
| Table toolbar (search + add + filters) | 3 |
| Form grid (responsive fields) | 4 |
| Success / confirmation modal (icon + title + message + buttons) | 2 |
| Card with header + body | 4+ |
| Breadcrumb or contextual title | 4 |
| List page layout shell | 4 |

---

## 3. Suggested Reusable Components

| Component Name | Based On Pattern | Purpose |
|----------------|------------------|---------|
| **FormPageHeader** | Form page header (breadcrumb + title + cancel/save) | Single component for CreateUser/ChangePassword/AddRole: back IconButton, breadcrumb + page title Typography, Cancel + Save IconButtons with consistent styling and tooltips. |
| **FormCard** | Form card (dark header + body + actions) | Paper with optional dark header strip (icon + title), body slot, optional footer actions. Used by CreateUser, ChangePassword, AddRole, AddTenant to remove duplicated layout and sx. |
| **ConfirmDialog** (existing) | Confirm dialog (title + message + cancel/confirm) | Already exists; extend for optional icon, custom content, and confirm variant (e.g. success). CreateUser/ChangePassword custom modals could use it. |
| **SuccessConfirmModal** | Success / confirmation modal (icon + title + message + buttons) | Dialog with dark top bar, close IconButton, large success icon + title + message, Cancel + Confirm. Replace custom dialogs in CreateUser and ChangePassword. |
| **SearchFilterBar** | Search + filter bar / Table toolbar | Extend ListPageToolbar or add wrapper: TextField (search) + primary Button (Add) + optional slots for Typography + Select filters (e.g. Role, Status, Sort) so Users page doesn’t hand-wire Selects. |
| **FormSection** | Form section (section heading + grouped fields) | Wrapper: FormSectionLabel (or slot) + content slot (grid/stack of fields). Standardize spacing and layout used in AddTenant and ProfilePage. |
| **FormFieldRow** | Form field row (label + input) | Single row: label (required indicator optional) + input slot. Align AddTenant (FieldLabel), ProfilePage (local label), and RoleForm (TextField label) on one primitive. |
| **DetailFieldRow** (existing) | Label-value row (1 file today) | Already used in TenantDetail; reuse on other detail views (e.g. profile, role detail) for consistent label-value layout. |
| **PageHeader** (existing) | Page header (title + actions) | Two PageHeader implementations exist (layout vs common); unify and use for all list/form pages so CreateUser, ChangePassword, AddRole can use it instead of custom header. |
| **ListPageLayout** (existing) | List page layout shell | Already composes PageLayout + AppCard; used by TenantList, RoleManagementPage, Users, RequirementGeneratePage. Keep as standard list-page shell. |
| **ListPageToolbar** (existing) | Table toolbar (search + add) | Already provides search + Add; document or extend for renderActions (filters) pattern used in Users. |
| **DialogForm** | Dialog (title + content + actions) | Optional wrapper: Dialog + DialogTitle + DialogContent + DialogActions with slots and default Cancel/Submit behavior. Reduces boilerplate in ThemeStudioPage, UserForm, and future form dialogs. |
| **BreadcrumbNav** | Breadcrumb or contextual title | Reusable breadcrumb: optional back button, segments (Link or Typography), optional action slot. Unify CreateUser/ChangePassword/AddRole (inline) and TenantDetail (Breadcrumbs). |

---

## 4. Notes

- **FormActionsBar** exists but is not used in any page; form footers use custom Stack/Button or DialogActions. Consider adopting FormActionsBar for form card footers.
- **Tabs** appear only in AddTenant (Upload/URL for logo); no second file, so no pattern reported.
- **Autocomplete** is not used.
- Two **PageHeader** components exist (`layout/PageHeader` and `common/PageHeader`); consolidating them would simplify the “page header (title + actions)” pattern.

---

**End of report.** Analysis only; no code was modified.
