# Material UI Styling Patterns Analysis

**Scope:** Files under `src` that use components from `@mui/material`  
**Target components:** Button, TextField, Select, Checkbox, Dialog, Card, Tabs, Autocomplete, Typography  
**Sources inspected:** `sx` prop, inline `style` prop, styled wrappers, theme overrides

**Goal:** Identify repeated style patterns for design system tokenization. No code was modified.

---

## 1. Styling Sources Summary

| Source | Present | Notes |
|--------|---------|------|
| **sx prop** | Yes | Primary styling mechanism; used extensively on target components and layout (Box, Paper). |
| **inline style** | Yes | Rare: ThemeStudioPage (color swatches 3×), AddTenant (image 2×), ProfilePage, TenantList, Register (1× each). |
| **styled wrappers** | Yes | Only in `Sidebar.tsx`: `styled(Box)` and `styled(ListItemButton)` for container, search, nav items. |
| **theme overrides** | Yes | `theme/components.ts`: MuiButton, MuiCard, MuiTextField, MuiDialog, MuiAppBar, MuiCssBaseline. |

---

## 2. Common Style Values

Values observed on or near target MUI components (sx + inline + theme). Frequencies are approximate from scan.

| Style Property | Values Found | Frequency |
|----------------|--------------|-----------|
| **fontSize** | `"0.875rem"` (14px) | Very high |
| | `"0.72rem"`–`"0.9rem"` (captions, labels) | High |
| | `"22px"` (page title) | 3 (CreateUser, ChangePassword, AddRole) |
| | `"1.1rem"` (buttons, headings) | High |
| | `"1.9rem"` (success dialog title) | 2 |
| | `20`, `24` (icons) | High |
| | `12`, `13`, `14`, `15`, `16`, `18` (icons/small UI) | Medium |
| **fontWeight** | `500` | High |
| | `600` | High |
| | `700` | Very high |
| | `800` | Medium (headings, sidebar) |
| **padding** | `p: 0` | High |
| | `p: 2` | Very high |
| | `p: 3` | High |
| | `px: 2`, `px: 3`, `px: 4` | High |
| | `px: { xs: 2, md: 3 }`, `px: { xs: 2, md: 4 }` | High |
| | `py: 1`, `py: 1.5`, `py: 2` | High |
| | `py: 0.5`, `py: 1.2`, `py: 2.5` | Medium |
| | `"8px 12px"`, `"8px 16px"`, `"10px 16px"` (theme/Sidebar) | Low |
| **margin** | `mb: 1`, `mb: 2`, `mt: 2` | Very high |
| | `mb: 0.5`, `mt: 0.5`, `mb: 1.2`, `mb: 2.5` | High |
| | `mx: 1.5`, `ml: 3`, `mr: 2`, `my: 0.5` | Medium |
| | `m: 0` | Medium |
| **borderRadius** | `1` (theme spacing) | Very high |
| | `2` | Very high |
| | `1.2` | High (buttons, IconButtons) |
| | `1.5`, `3` | Medium |
| | `"8px"` | High |
| | `"12px"` | High |
| | `"14px"`, `"16px"` | Medium |
| | `"50%"` | High (avatars, icon circles) |
| **color** | `theme.palette.text.primary` | Very high |
| | `theme.palette.text.secondary` | Very high |
| | `theme.palette.primary.main` | Medium |
| | `"#1a1a2e"`, `"#64748b"`, `"#94a3b8"`, `"#38bdf8"` | Medium (hardcoded) |
| | `"white"` | Medium |
| **backgroundColor / bgcolor** | `theme.palette.background.paper` | Very high |
| | `theme.palette.background.default` | High |
| | `theme.palette.grey[50]`–`grey[800]` | High |
| | `"#1a1a2e"` (header bar) | 4+ |
| | `"#f8fafc"`, `"#f1f5f9"` | 3+ |
| **gap** | `1` | High |
| | `1.5` | Very high |
| | `2` | Very high |
| | `0.5`, `0.75` | Medium |
| **display** | `"flex"` | Very high |
| | `"grid"` | Medium |
| **flex** | `flex: 1`, `flexGrow: 1` | High |
| | `flexDirection: "column"` | Very high |
| **alignItems** | `"center"` | Very high |
| | `"flex-start"` | Medium |
| **justifyContent** | `"space-between"` | Very high |
| | `"center"` | Very high |
| | `"flex-end"` | High |

---

## 3. Style Clusters

Recurring combinations of properties observed across multiple files (on target components or their immediate containers).

| Cluster | Style Combination | Files Using |
|---------|-------------------|-------------|
| **Page shell** | `px: { xs: 2, md: 4 }`, `pb: 2`, `display: "flex"`, `flexDirection: "column"`, `backgroundColor: grey[50]` or `#f8fafc` | CreateUser, ChangePassword, AddRole, ProfilePage |
| **Page header row** | `pt: 1.5`, `pb: 1.5`, `display: "flex"`, `alignItems: "center"`, `justifyContent: "space-between"` | CreateUser, ChangePassword, AddRole |
| **Breadcrumb + actions** | `display: "flex"`, `alignItems: "center"`, `gap: 2` | CreateUser, ChangePassword, AddRole, TenantDetail, ListPageToolbar, PageHeader |
| **Form card** | `p: 0`, `borderRadius: 2`, `border: 1px solid divider`, `overflow: "hidden"`, `minWidth` 420–520 | CreateUser, ChangePassword, AddRole |
| **Card header bar** | `display: "flex"`, `alignItems: "center"`, `gap: 1.5`, `p: 2`, `bgcolor: grey[800]` or `#1a1a2e` | CreateUser, ChangePassword, AddRole |
| **Account Active block** | `p: 2`, `bgcolor: grey[100]` or `#f1f5f9`, `borderRadius: 2`, `border: 1px solid divider`, `display: "flex"`, `alignItems: "center"`, `justifyContent: "space-between"` | CreateUser, ChangePassword, AddRole |
| **Section title** | `fontSize: "22px"`, `fontWeight: 700`, `letterSpacing: "-1px"`, `color: text.primary` or `#1A1A2E` | CreateUser, ChangePassword, AddRole |
| **Section label (uppercase)** | `fontWeight: 700`, `color: "white"`, `textTransform: "uppercase"`, `letterSpacing: "1px"` | CreateUser, ChangePassword |
| **Dialog success content** | `px: 4`, `pt: 4`, `pb: 2.5`, `borderBottomLeftRadius: 12`, `borderBottomRightRadius: 12`, icon fontSize 50, title `fontSize: "1.9rem"`, subtitle `fontSize: "1.05rem"`, `mb: 1.2`, `ml: 3` | CreateUser, ChangePassword |
| **Dialog actions** | `display: "flex"`, `justifyContent: "flex-end"`, `gap: 1.5`, Button `px: 4`, `py: 1.1`, `fontSize: "1.1rem"` | CreateUser, ChangePassword |
| **Back / save IconButton** | `borderRadius: 1.2`, `width: 44`, `height: 44`, `"&:hover": { backgroundColor: grey[700] or #2d2d44 }` | CreateUser, ChangePassword, AddRole |
| **Close icon (dialog)** | `fontSize: 24`, `color: error`, `bgcolor: #fff or background.paper`, `borderRadius: "50%"`, `p: 0.375` | CreateUser, ChangePassword, AddRole |
| **Alert (error/success)** | `mb: 1`, `borderRadius: "8px"`, `py: 0.3` | AddTenant (error + success) |
| **Form grid** | `display: "grid"`, `gridTemplateColumns: "1fr 1fr"`, `gap: 1.5` | AddTenant (multiple sections) |
| **Form section block** | `px: { xs: 2, md: 2.5 }`, `pt: 2` or `1.5`, `pb: 1.5` or `2` | AddTenant |
| **Detail row** | `display: "flex"`, `alignItems: "flex-start"`, `gap: 2`, `py: 2.5`, `px: 3` | DetailFieldRow, TenantDetail |
| **Toolbar (search + actions)** | `display: "flex"`, `alignItems: "center"`, `gap: 2`, `width: { xs: "100%", sm: "auto" }`, `flexWrap: "wrap"` | ListPageToolbar |
| **Pagination bar** | `px: 2`, `py: 1`, `display: "flex"`, `justifyContent: "space-between"`, `alignItems: "center"`, `borderTop: 1`, `borderColor: divider` | TablePaginationBar |
| **Primary action button (sx)** | `borderRadius: 1.2` | PrimaryActionButton, PageHeader, AddTenant (buttons) |
| **Card (outlined)** | `borderRadius: 2`, `p: 2`, sometimes `variant="outlined"` | AppCard, RoleForm, PermissionGroup, RoleSummaryCards |
| **Login tile** | `px: 2.5`, `py: 1.8`, `mb: 1.5` or none, `borderRadius: 2`, `display: "flex"`, `alignItems: "center"`, `gap: 2` | Login (multiple tiles) |

---

## 4. Interaction Styles

| Interaction | Styles | Frequency |
|-------------|--------|-----------|
| **:hover** | `"&:hover": { bgcolor: theme.palette.action.hover }` | TablePaginationBar (2), DataTable (1), TenantDetail (1), ProfilePage (1) |
| | `"&:hover": { backgroundColor: theme.palette.grey[700] }` or `#2d2d44` | CreateUser, AddRole, ChangePassword, TenantDetail (back/save IconButton) |
| | `"&:hover fieldset": { borderColor: theme.palette.grey[400] }` | AddTenant, ListPageToolbar, ProfilePage (TextField) |
| | `"&:hover": { color: theme.palette.text.primary }` (breadcrumb/links) | AddTenant, CreateUser |
| | `"&:hover": { borderColor: accentColor }` or `grey.400` | PermissionGroup, AddTenant (upload zone) |
| | `"&:hover": { backgroundColor: "transparent", textDecoration: "underline" }` (buttons in dialog) | CreateUser, ChangePassword, AddTenant |
| | `"&:hover": { bgcolor: theme.palette.error.dark }` or `success.dark` | AddTenant, ProfilePage (IconButtons) |
| | Sidebar nav: `"&:hover": { color: #38bdf8 }` / `#F8FAFC` | Sidebar (multiple) |
| | Login tiles: `"&:hover": { background, borderColor, transform, boxShadow }` | Login (5 similar tiles) |
| **:focus** | `"&.Mui-focused": { fieldset borderColor }` | AddTenant, ProfilePage, Login (TextField) |
| **:disabled** | `"&.Mui-disabled": { borderColor: theme.palette.divider }` | TablePaginationBar (IconButtons, 2) |
| | `"&.Mui-disabled": { backgroundColor: grey[400], color: "white" }` | AddTenant, ProfilePage (Button) |
| | `"& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: grey[500/600] }` | AddTenant, ProfilePage (TextField) |
| | `"&.Mui-disabled": { bgcolor: grey[300], color: text.secondary }` | ProfilePage |
| | `"&.Mui-disabled": { color: text.secondary }` | AddTenant (Button) |
| **Theme (global)** | MuiButton contained `"&:hover": { boxShadow }` | theme/components.ts |

---

## 5. Design System Candidates (3+ Occurrences)

Patterns that appear **3 or more times** and are strong candidates for design tokens or shared mixins.

| Style Pattern | Suggested Token / Usage | Usage Count |
|---------------|------------------------|-------------|
| **borderRadius: 2** (theme units) | `shape.borderRadius.medium` or reuse theme default | 15+ |
| **borderRadius: 1.2** | `shape.borderRadius.button` / icon button | 5 |
| **borderRadius: "12px"** | `shape.borderRadius.card` (align with theme MuiCard 12) | 6+ |
| **borderRadius: "8px"** | `shape.borderRadius.input` (align with theme MuiTextField 8) | 5+ |
| **borderRadius: "50%"** | Already semantic (circle); ensure single usage pattern | 6+ |
| **p: 2** | `spacing.section` / `padding.block` | 25+ |
| **gap: 2** | `spacing.stackMd` | 20+ |
| **gap: 1.5** | `spacing.stackSm` | 25+ |
| **px: { xs: 2, md: 4 }** | `spacing.pageHorizontal` | 4 |
| **pt: 1.5, pb: 1.5** | `spacing.headerVertical` | 3 |
| **mb: 1**, **mb: 2**, **mt: 2** | `spacing.afterSm`, `spacing.afterMd`, `spacing.beforeMd` | 20+ each |
| **fontSize: "0.875rem"** | `typography.body2.fontSize` / token | 10+ |
| **fontSize: "22px"** | `typography.h5.pageTitle` | 3 |
| **fontWeight: 700** | `typography.fontWeightBold` (theme) | 30+ |
| **fontWeight: 600** | `typography.fontWeightMedium` / semibold | 15+ |
| **display: "flex" + alignItems: "center" + gap: 2** | Layout mixin or `Stack` + sx | 15+ |
| **display: "flex" + justifyContent: "space-between" + alignItems: "center"** | Layout mixin | 10+ |
| **Page shell** (flex column, px responsive, grey background) | `layout.pageShell` or PageLayout component | 4 |
| **Form card** (p: 0, borderRadius: 2, border, overflow hidden) | `surface.formCard` | 3 |
| **Card header bar** (dark bg, p: 2, flex center) | `surface.formCardHeader` | 3 |
| **Account Active block** (grey.100, p: 2, borderRadius: 2, flex space-between) | `surface.toggleRow` | 3 |
| **Back/save IconButton** (44×44, borderRadius: 1.2, hover grey.700) | Component or `button.iconPageNav` | 3 |
| **Close icon circle** (24, error color, 50%, p: 0.375) | Component or `iconButton.close` | 3 |
| **Success dialog content** (px: 4, pt: 4, pb: 2.5, radius 12, title 1.9rem) | `dialog.successContent` | 2 (very similar) |
| **"&:hover fieldset": borderColor grey[400]** | TextField hover in theme or input token | 3 |
| **"&.Mui-disabled": backgroundColor grey[400], color white** | Button disabled in theme | 2 (+ similar grey[300]) |
| **bgcolor: "#1a1a2e"** | `palette.surface.header` / dark header token | 4+ |
| **bgcolor: "#f8fafc" / "#f1f5f9"** | `palette.surface.subtle` (align with tokens) | 4+ |

---

## 6. Theme Overrides (Existing)

From `theme/components.ts` — already centralized; component-level overrides can be extended with tokens.

| Component | Override | Value |
|-----------|----------|--------|
| MuiButton | root borderRadius | 8 |
| MuiButton | root padding | "8px 16px" |
| MuiButton | root textTransform | "none" |
| MuiButton | root fontWeight | 500 |
| MuiButton | contained &:hover boxShadow | "0 4px 8px rgba(0,0,0,0.15)" |
| MuiCard | root borderRadius | 12 |
| MuiTextField | root .MuiOutlinedInput-root borderRadius | 8 |
| MuiDialog | paper borderRadius | 12 |

Many `sx` usages override these (e.g. borderRadius: 2, 1.2, "12px") — consolidating to theme or tokens would reduce drift.

---

## 7. Styled Wrappers

Only **Sidebar.tsx** uses `styled()` from `@mui/material`:

- **SidebarContainer** — `styled(Box)`: flex column, background, padding, marginBottom.
- **SearchWrapper**, **SearchInput** — `styled(Box)`: search area layout and input look.
- **NavItem**, **SubNavItem** — `styled(ListItemButton)`: nav item padding, borderRadius "12px", hover/active colors.

These could be refactored to `sx` or to theme `components.MuiListItemButton` if the same pattern is needed elsewhere.

---

## 8. Recommendations Summary

1. **Tokens:** Add or align tokens for: `borderRadius` (2, 1.2, 8px, 12px, 50%), `spacing` (p: 2, gap: 1.5/2, px responsive), `typography` (0.875rem, 22px, fontWeight 600/700), and surface colors (#1a1a2e, #f8fafc, #f1f5f9).
2. **Theme:** Extend `theme/components.ts` for TextField hover/focus and Button disabled so `sx` overrides can be removed.
3. **Clusters:** Turn repeated clusters (page shell, form card, card header, Account Active block, back/save IconButton, success dialog) into layout components or named `sx` objects.
4. **Interaction:** Standardize hover (action.hover, grey.700 for nav), focus (primary or grey), and disabled (grey.400/300 + contrast) in theme or tokens.
5. **Inline style:** Replace remaining inline styles (ThemeStudioPage, AddTenant, etc.) with `sx` or tokens for consistency.

---

**End of report.** Analysis only; no code was modified.
