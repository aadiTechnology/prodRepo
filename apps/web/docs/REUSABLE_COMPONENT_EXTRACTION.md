# Reusable Component Extraction – Candidates

Based on the Codebase Discovery analysis. For each candidate: component name, pages where it appears, duplication level, suggested API, refactoring risk, and priority.

---

## Extraction candidates table

| # | Component name | Pages where it appears | Estimated duplication level | Suggested reusable component API | Refactoring risk | Priority |
|---|----------------|-------------------------|-----------------------------|----------------------------------|------------------|----------|
| 1 | **ConfirmDialog** (extend existing) | **TenantList**, **TenantDetail**, **Users** (delete + deactivate), **RoleManagementPage**, **AddRole** | High – 5+ inline/custom dialogs; only RoleTable uses shared `ConfirmDialog` | `ConfirmDialog`: `open`, `title`, `message`, `confirmText`, `onConfirm`, `onCancel`, `loading?`. Optional: `messageNode?: ReactNode`, `confirmVariant?: 'error' \| 'primary'`, `showWarningAlert?: boolean`, `warningContent?: ReactNode` | **Low** – component exists; add optional props and replace inline `<Dialog>` blocks | **P0** |
| 2 | **ListPageToolbar** | **TenantList**, **RoleManagementPage** (nearly identical); **Users** (similar but different search + Button) | High – same Search TextField + Add IconButton + sx in 2 pages; 3rd page similar | `ListPageToolbar`: `searchValue`, `onSearchChange`, `searchPlaceholder?`, `onAddClick?`, `addLabel?`, `addIcon?`, `renderActions?` (optional extra actions) | **Low** – presentational; plug in existing state/handlers | **P0** |
| 3 | **TablePaginationBar** | **TenantList**, **RoleManagementPage** | High – identical block: rows-per-page Select + "X–Y of Z" + prev/next IconButtons | `TablePaginationBar`: `page`, `rowsPerPage`, `totalRows`, `onPageChange`, `onRowsPerPageChange`, `rowsPerPageOptions?` (default `[10,20,25,50]`) | **Low** – pure UI; state stays in page or parent | **P1** |
| 4 | **DataTable** (or **ListTable**) | **TenantList**, **RoleManagementPage**, **Users**; **RequirementGeneratePage** (display-only table) | High – same TableContainer + sticky header + loading/empty + row hover in 3 list pages | `DataTable<T>`: `columns: ColumnDef<T>[]`, `data: T[]`, `loading?`, `emptyMessage?`, `renderRowActions?(row): ReactNode`, `stickyHeader?`, `size?`. Optional: `TablePaginationBar` integration or slot | **Medium** – column/row rendering differs per page; need clear column API and optional action cell | **P1** |
| 5 | **ListPageLayout** (or **PageLayout**) | **RequirementGeneratePage**, **TenantList**, **AddTenant**, **RoleManagementPage** | Medium – shared pattern: outer Box (#f8fafc) + PageHeader (or title) + Paper (border, shadow, radius) | `ListPageLayout`: `title`, `subtitle?`, `onBack?`, `backIcon?`, `actions?`, `children`, `paperProps?`. Renders Box + PageHeader + Paper wrapper | **Low** – thin wrapper; no behavior change | **P2** |
| 6 | **DirectoryInfoBar** (or **TableInfoBar**) | **TenantList**, **RoleManagementPage** | Medium – same "Directory" label + "Showing X–Y of Z" bar above table | `DirectoryInfoBar`: `label` (e.g. "Tenant Directory"), `rangeStart`, `rangeEnd`, `total` | **Low** – presentational | **P2** |
| 7 | **FormSection** / **FormSectionTitle** | **AddTenant**, **AddRole** | Medium – repeated Typography (subtitle2, uppercase, letterSpacing) for "Company Information", "Role Information", etc. | `FormSection`: `title: string`, `children`, `titleVariant?`. `FormSectionTitle`: same props for title only (use inside custom sections) | **Low** – visual only; drop-in replacement | **P2** |
| 8 | **PrimaryActionButton** (or **AddButton**) | **TenantList**, **RoleManagementPage** | Medium – same dark circular IconButton (#1a1a2e, hover #2d2d44) for Add in header | `PrimaryActionButton`: `onClick`, `icon`, `label` (for Tooltip), `aria-label?` | **Low** – single component or part of ListPageToolbar | **P2** |
| 9 | **TableRowActions** (Edit/Delete) | **TenantList**, **RoleManagementPage**, **Users**, **RoleTable** | Medium – Edit + Delete (and sometimes View) IconButtons in table rows with similar tooltips | `TableRowActions`: `onEdit?`, `onDelete?`, `onView?`, `disabled?`, `size?`. Renders IconButtons with standard icons | **Low** – optional; can be `renderRowActions` content from DataTable | **P2** |
| 10 | **useListData** (hook) | **TenantList**, **RoleManagementPage**, **Users** | High – same pattern: `[items, setItems]`, `[loading, setLoading]`, `[error, setError]`, `fetch = useCallback(...)`, `useEffect` | `useListData<T>(fetcher: () => Promise<T[]>, deps?: DependencyList)`: returns `{ data, loading, error, refetch }`. Optional: `usePaginatedListData` with `page`, `rowsPerPage`, `total`, `setPage`, `setRowsPerPage` | **Medium** – touches data flow and effect deps; test refetch and pagination after refactor | **P3** |
| 11 | **ResultTable** (display-only) | **RequirementGeneratePage** | Low – single use; fixed columns (Scenario, Pre-Requisite, Test Data, Steps, Expected Result) | `ResultTable`: `rows: Array<Record<string, string \| string[]>>`, `columns: { id, label }[]`, optional `cellRender?`. Or use DataTable in read-only mode | **Low** if kept as-is; **Medium** if merged into DataTable with "display" mode | **P3** |

---

## Priority order for extraction (summary)

| Priority | Component(s) | Rationale |
|----------|--------------|-----------|
| **P0** | ConfirmDialog (adopt everywhere), ListPageToolbar | Highest impact, low risk; removes most duplicated dialog and toolbar code. |
| **P1** | TablePaginationBar, DataTable | Same two blocks in TenantList + RoleManagementPage; DataTable reduces table boilerplate in 3+ pages. |
| **P2** | ListPageLayout, DirectoryInfoBar, FormSection, PrimaryActionButton, TableRowActions | Consistency and DRY; all low risk. |
| **P3** | useListData, ResultTable | useListData standardizes data pattern; ResultTable is optional or covered by DataTable. |

---

## Notes

- **ConfirmDialog**: Extend the existing `components/common/ConfirmDialog.tsx` with optional `messageNode` and `warningContent` so TenantDetail/TenantList can pass the soft-delete Alert without duplicating dialog structure.
- **ListPageToolbar**: Start with TenantList and RoleManagementPage (same UX); then adapt Users to use it with optional `renderActions` or a different primary action type.
- **DataTable**: Define a small `ColumnDef<T>` type (e.g. `id`, `label`, `align?`, `render?: (row: T) => ReactNode` or `field?: keyof T`) so each page supplies columns and optional row actions; keep sorting/pagination state in the page or in a hook.
- **Risk**: "Low" = mostly move JSX and props; "Medium" = shared state or column contract; no "High" for these items if done incrementally.
