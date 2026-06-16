# Testability Standards — NGO ERP

This document defines how UI elements in the NGO ERP frontend must expose stable `data-testid` attributes for automated testing (Playwright, component tests, and accessibility tooling).

These standards apply to all new and modified screens. Existing screens should adopt them incrementally when touched.

## Goals

- Tests select elements by **intent**, not CSS classes, MUI-generated class names, or DOM position.
- Test IDs remain **stable across theme changes**, refactors, and tenant branding.
- Naming is **predictable** so authors and reviewers can infer IDs without reading implementation details.

## Format

Every test ID follows:

```
{prefix}-{entity}[-{qualifier}]
```

| Part        | Rule |
|-------------|------|
| `prefix`    | Element category (see table below). Required. |
| `entity`    | Domain noun in kebab-case (e.g. `collection`, `donor-name`, `total-members`). Required. |
| `qualifier` | Optional disambiguator: action, mode, section, or variant (e.g. `edit`, `confirm`, `empty-state`). |

### Prefix registry

| Prefix   | Use for |
|----------|---------|
| `page-`  | Top-level route screens and major page regions |
| `form-`  | Form containers (create, edit, filter, search) |
| `input-` | Fields users type into or select from |
| `btn-`   | Clickable actions (buttons, icon buttons, links styled as actions) |
| `grid-`  | Data tables, lists, and repeatable row collections |
| `dialog-`| Modal dialogs, drawers used as overlays, confirmation prompts |
| `nav-`   | Sidebar, top bar, tabs, breadcrumbs, and in-page navigation |
| `card-`  | Dashboard KPI tiles and summary cards |

### Global naming rules

1. **kebab-case only** — lowercase words separated by hyphens. No camelCase, PascalCase, or underscores.
2. **Describe purpose, not implementation** — `input-donor-name`, not `input-textfield-3`.
3. **One primary test ID per test target** — do not duplicate the same ID in the DOM.
4. **Stable over clever** — prefer domain terms (`collection`) over display labels that may change (`Donation Entry`).
5. **English domain nouns** — match API and route vocabulary where possible.
6. **No dynamic values in the base ID** — use suffix patterns for rows/items (see [Dynamic elements](#dynamic-elements)).
7. **Attach to the interactive or asserting element** — input on the `<input>`, button on the `<button>`, grid on the table wrapper.

## Where to place test IDs (UI layers)

Follow the frontend architecture (`Primitive → Semantic → Feature`):

| Layer | Responsibility |
|-------|----------------|
| **Feature / Page** | `page-*`, `form-*`, `grid-*`, `dialog-*`, `card-*` on screen-level containers |
| **Semantic / Pattern** | Default `btn-save`, `btn-cancel` on shared buttons; pass through `data-testid` when a feature needs a specific ID |
| **Primitive** | Forward `data-testid` (and all native props) to the underlying MUI element — never strip or rename |

Feature code owns domain-specific IDs. Shared components accept an optional `data-testid` override but should ship sensible defaults where the action is universal (e.g. Save, Cancel).

---

## 1. Pages

### Rules

- Every routable screen exposes exactly one root `page-*` on its outermost layout container (`PageContainer`, `ListPageLayout`, or equivalent).
- Use `{view}-{entity}` or `{action}-{entity}` when the route has a clear mode.
- Sub-regions on large pages may use a second segment: `page-collection-details-summary`, `page-collection-details-history`.

### Examples

| Screen | Test ID |
|--------|---------|
| Collection list | `page-collection-list` |
| Collection detail | `page-collection-details` |
| Add collection | `page-add-collection` |
| Edit collection | `page-edit-collection` |
| Donor directory | `page-donor-list` |
| Receipt view | `page-receipt-details` |
| Dashboard | `page-dashboard` |
| Login | `page-login` |

```tsx
<PageContainer data-testid="page-collection-list">
  {/* list content */}
</PageContainer>
```

---

## 2. Forms

### Rules

- One `form-*` per `<form>` element or logical form card (including filter bars that submit/search).
- Name after **intent**: `form-add-collection`, not `form-collection-form`.
- Edit vs create: `form-add-donor` / `form-edit-donor`.
- Nested sub-forms (e.g. inline address block) may use `form-donor-address` inside the parent page.

### Examples

| Form | Test ID |
|------|---------|
| Create collection | `form-add-collection` |
| Edit collection | `form-edit-collection` |
| Record donation | `form-record-donation` |
| Filter collections | `form-filter-collections` |
| Login | `form-login` |
| Change password | `form-change-password` |

```tsx
<form data-testid="form-add-collection" onSubmit={handleSubmit(onSubmit)}>
  {/* fields */}
</form>
```

---

## 3. Inputs

### Rules

- Pattern: `input-{field-name}` where `field-name` matches the form field / schema key in kebab-case.
- Apply to the element that receives focus (native input, textarea, or MUI input root when using `slotProps` / `inputProps`).
- Selects, autocompletes, date pickers, and checkboxes use the same `input-` prefix.
- Read-only display fields used in assertions may use `text-{field-name}` only when they are not inputs; prefer `input-` when the user can edit.

### Examples

| Field | Test ID |
|-------|---------|
| Donor name | `input-donor-name` |
| Amount | `input-amount` |
| Collection date | `input-collection-date` |
| Payment mode | `input-payment-mode` |
| Donor email | `input-donor-email` |
| Receipt number | `input-receipt-number` |
| Search query | `input-search` |
| Active status toggle | `input-is-active` |

```tsx
<FormTextField
  control={control}
  name="donor_name"
  label="Donor name"
  inputProps={{ "data-testid": "input-donor-name" }}
/>
```

For shared semantic inputs (`EmailInput`, `PhoneInput`), the feature passes `inputProps={{ "data-testid": "input-donor-email" }}`.

---

## 4. Buttons

### Rules

- Pattern: `btn-{action}` where `action` is the verb or standard label in kebab-case.
- Use **standard verbs** across the app for the same behavior (see table).
- When multiple buttons share a verb on one screen, add a qualifier: `btn-delete-collection`, `btn-delete-receipt`.
- Icon-only buttons must still have `btn-*` (e.g. `btn-close`, `btn-refresh`).

### Standard action IDs

| Action | Test ID |
|--------|---------|
| Save / Submit | `btn-save` |
| Cancel | `btn-cancel` |
| Delete | `btn-delete` |
| Edit | `btn-edit` |
| Add / Create | `btn-add` |
| Search | `btn-search` |
| Export | `btn-export` |
| Confirm | `btn-confirm` |
| Close dialog | `btn-close` |

### Domain-specific examples

| Button | Test ID |
|--------|---------|
| Record donation | `btn-record-donation` |
| Generate receipt | `btn-generate-receipt` |
| Archive receipt | `btn-archive-receipt` |
| Add donor | `btn-add-donor` |
| Apply filters | `btn-apply-filters` |
| Clear filters | `btn-clear-filters` |

```tsx
<SaveButton data-testid="btn-save" onClick={handleSubmit(onSubmit)} />
<CancelButton data-testid="btn-cancel" onClick={onCancel} />
```

---

## 5. Tables

### Rules

- Use the `grid-` prefix for data tables, virtualized lists, and card grids that represent tabular data — even when implemented with MUI `DataGrid` or a custom `DataTable`.
- Name after the **entity collection**: `grid-collections`, `grid-donors`.
- Attach `grid-*` to the table wrapper (or `TableContainer`), not individual cells.
- Row actions: `btn-edit-row`, `btn-delete-row`, or qualified `btn-edit-collection` on the row action control.
- Toolbar controls inside list pages follow their own prefixes (`input-search`, `btn-add`, `form-filter-collections`).

### Row and cell patterns (dynamic elements)

| Element | Pattern | Example |
|---------|---------|---------|
| Row | `grid-{entity}-row-{id}` | `grid-collections-row-1042` |
| Cell | `grid-{entity}-cell-{column}-{id}` | `grid-collections-cell-amount-1042` |
| Empty state | `grid-{entity}-empty` | `grid-collections-empty` |
| Loading | `grid-{entity}-loading` | `grid-donors-loading` |

Use stable business IDs (database id) in row suffixes, not array index, when available.

### Examples

| Table | Test ID |
|-------|---------|
| Collections | `grid-collections` |
| Donors | `grid-donors` |
| Receipts | `grid-receipts` |
| Members | `grid-members` |
| Campaigns | `grid-campaigns` |

```tsx
<DataTable
  data-testid="grid-collections"
  rows={collections}
  rowTestId={(row) => `grid-collections-row-${row.id}`}
/>
```

---

## 6. Dialogs

### Rules

- Pattern: `dialog-{purpose}` describing why the dialog exists, not the component file name.
- Attach to the dialog paper/root (`Dialog` primitive), not the backdrop.
- Primary and secondary actions inside dialogs reuse `btn-*` (`btn-confirm`, `btn-cancel`, `btn-delete`).
- Destructive flows: `dialog-delete-donor`, `dialog-archive-receipt`.

### Examples

| Dialog | Test ID |
|--------|---------|
| Archive receipt confirmation | `dialog-archive-receipt` |
| Delete collection | `dialog-delete-collection` |
| Add donor quick-create | `dialog-add-donor` |
| Unsaved changes warning | `dialog-unsaved-changes` |
| Receipt preview | `dialog-receipt-preview` |

```tsx
<Dialog open={open} onClose={onClose} data-testid="dialog-archive-receipt">
  <DialogTitle>Archive receipt?</DialogTitle>
  <DialogActions>
    <CancelButton data-testid="btn-cancel" onClick={onClose} />
    <Button data-testid="btn-confirm" onClick={onConfirm}>Archive</Button>
  </DialogActions>
</Dialog>
```

---

## 7. Navigation

### Rules

- Sidebar and primary menu items: `nav-{module}` using the module slug (matches route/menu config).
- Sub-menu items: `nav-{parent}-{child}` — e.g. `nav-collections-receipts`.
- Tabs: `nav-tab-{name}` — e.g. `nav-tab-overview`, `nav-tab-donations`.
- Breadcrumb links: `nav-breadcrumb-{segment}`.
- Mobile drawer toggle: `nav-menu-toggle`.
- User menu / profile: `nav-user-menu`, `nav-logout`.

### Examples

| Navigation target | Test ID |
|-------------------|---------|
| People module | `nav-people` |
| Collections module | `nav-collections` |
| Donors | `nav-donors` |
| Finance | `nav-finance` |
| Dashboard | `nav-dashboard` |
| Settings | `nav-settings` |
| Reports → Collections | `nav-reports-collections` |

```tsx
<ListItemButton data-testid="nav-collections" onClick={() => navigate("/collections")}>
  <ListItemText primary="Collections" />
</ListItemButton>
```

---

## 8. Dashboard Cards

### Rules

- Pattern: `card-{metric-or-widget}` describing what the card shows.
- KPI summary tiles: `card-total-{noun}` or `card-{metric-name}`.
- Interactive cards (click-through): add `btn-*` on the inner action if needed; the card wrapper keeps `card-*`.
- Loading skeletons: `card-{name}-loading`.

### Examples

| Card | Test ID |
|------|---------|
| Total members | `card-total-members` |
| Total collections | `card-total-collections` |
| Collections this month | `card-collections-this-month` |
| Pending receipts | `card-pending-receipts` |
| Active campaigns | `card-active-campaigns` |
| Donor growth | `card-donor-growth` |
| Recent donations widget | `card-recent-donations` |

```tsx
<AppCard data-testid="card-total-members">
  <Typography variant="h4">{memberCount}</Typography>
  <Typography variant="body2">Total members</Typography>
</AppCard>
```

---

## Dynamic elements

When lists, menus, or repeated UI cannot use a single static ID:

| Scenario | Convention |
|----------|------------|
| Table row | `grid-{entity}-row-{id}` |
| Table cell | `grid-{entity}-cell-{column}-{id}` |
| Tab panel | `nav-panel-{name}` |
| Dropdown option | `input-{field}-option-{value}` (value slugified) |
| Toast / alert | `alert-{type}` or `alert-{context}` — e.g. `alert-save-success` |

Avoid array indices in test IDs unless no stable id exists (e.g. `grid-collections-row-0` only in static fixtures).

---

## Playwright usage

Prefer `getByTestId` (configured to use `data-testid`):

```ts
await page.goto("/collections");
await expect(page.getByTestId("page-collection-list")).toBeVisible();
await page.getByTestId("btn-add").click();
await expect(page.getByTestId("form-add-collection")).toBeVisible();
await page.getByTestId("input-donor-name").fill("Jane Doe");
await page.getByTestId("input-amount").fill("5000");
await page.getByTestId("btn-save").click();
await expect(page.getByTestId("alert-save-success")).toBeVisible();
```

Scope queries within a container when multiple similar elements exist:

```ts
const dialog = page.getByTestId("dialog-archive-receipt");
await dialog.getByTestId("btn-confirm").click();
```

---

## Review checklist

Before merging a UI change, confirm:

- [ ] Routable screen has a `page-*` root test ID.
- [ ] Each form has a `form-*` test ID.
- [ ] Every user-editable field has an `input-*` test ID.
- [ ] Primary actions use standard `btn-*` verbs or a qualified variant.
- [ ] List/table views expose `grid-*` on the wrapper.
- [ ] Modals expose `dialog-*` on the dialog root.
- [ ] New sidebar/menu entries expose `nav-*`.
- [ ] Dashboard widgets expose `card-*`.
- [ ] No duplicate test IDs on the same view.
- [ ] IDs are kebab-case and describe domain intent.

---

## Anti-patterns

| Do not | Do instead |
|--------|------------|
| `data-testid="submitButton"` | `data-testid="btn-save"` |
| `data-testid="mui--textfield-1"` | `data-testid="input-donor-name"` |
| `data-testid="CollectionsPage"` | `data-testid="page-collection-list"` |
| `id="amount"` as test hook | `data-testid="input-amount"` |
| CSS class selectors in tests | `getByTestId(...)` |
| Random or generated IDs | Stable domain-based names |
| Test ID on every `<div>` | Test ID only on assertable/interactive targets |

---

## Related references

- Frontend UI layers: `apps/web/src/components/UI_ARCHITECTURE.md`
- System architecture: `SYSTEM_ARCHITECTURE.md`
- E2E tests: `apps/web/tests/`
