/**
 * Role-Based Menu Permission Management Page — Premium Redesign
 *
 * ✦ Glassmorphism hero card with animated gradient
 * ✦ Smooth expand/collapse accordion with spring-like transitions
 * ✦ Fully responsive — card-based on mobile, grid table on desktop
 * ✦ Micro-interactions: hover lifts, checkbox pulse, row highlights
 * ✦ Proper semantic HTML & ARIA accessibility
 * ✦ Uses project color tokens (turquoise palette)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  Checkbox,
  IconButton,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Collapse,
  Paper,
  Tooltip,
  useMediaQuery,
  useTheme,
  Skeleton,
  Fade,
  Grow,
  Snackbar,
  LinearProgress,
  alpha,
  keyframes,
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Shield as ShieldIcon,
  LockOpen as LockOpenIcon,
  Lock as LockIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedUserIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";
import permissionService, {
  MenuTreeNode,
  Role,
  RoleMenuPermission,
} from "../../api/services/permissionService";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";

/* ═══════════════════════════════════════════════════════════════════════════
   THEME PALETTE
   ═══════════════════════════════════════════════════════════════════════════ */
const PALETTE = {
  // Primary turquoise gradient
  primary:      "#4ECDC4",
  primaryDark:  "#3AB8AF",
  primaryLight: "#6FD9D1",
  primaryGlow:  "#4ECDC420",

  // Accents
  accent:       "#9F7AEA",
  accentLight:  "#B794F4",
  coral:        "#FF6B6B",
  sunshine:     "#FFE66D",
  mint:         "#48BB78",

  // Surfaces
  cardBg:       "#FFFFFF",
  pageBg:       "#FFF9F0",
  rowEven:      "#FAFCFB",
  rowOdd:       "#FFFFFF",
  rowHover:     "#F0FBF9",
  childBg:      "#F7FDFC",
  childBgAlt:   "#F0FAF8",
  expandedBg:   "#E8FAF6",

  // Text
  textPrimary:   "#1A202C",
  textSecondary: "#4A5568",
  textMuted:     "#A0AEC0",
  textOnPrimary: "#FFFFFF",

  // Borders
  border:        "#E2E8F0",
  borderLight:   "#F0F4F8",
  borderAccent:  "#4ECDC440",

  // Shadows
  shadowSm:  "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:  "0 4px 14px rgba(0,0,0,0.08)",
  shadowLg:  "0 10px 40px rgba(78,205,196,0.15)",
  shadowXl:  "0 20px 60px rgba(78,205,196,0.2)",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   KEYFRAME ANIMATIONS
   ═══════════════════════════════════════════════════════════════════════════ */
const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 ${PALETTE.primaryGlow}; }
  50%      { box-shadow: 0 0 0 8px transparent; }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
interface PermissionRow {
  id: number;
  name: string;
  level: 1 | 2;
  parent_id?: number;
  permissions: RoleMenuPermission;
}

const PERM_CONFIG = [
  { key: "can_view"   as keyof RoleMenuPermission, label: "View",   action: "view"   as const, icon: VisibilityIcon, color: "#4299E1" },
  { key: "can_create" as keyof RoleMenuPermission, label: "Create", action: "create" as const, icon: AddIcon,        color: "#48BB78" },
  { key: "can_edit"   as keyof RoleMenuPermission, label: "Edit",   action: "edit"   as const, icon: EditIcon,       color: "#ED8936" },
  { key: "can_delete" as keyof RoleMenuPermission, label: "Delete", action: "delete" as const, icon: DeleteIcon,     color: "#FC8181" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
const PermissionManagementPage = () => {
  const { user }                    = useAuth();
  const { hasPermission: rbacPerm, refreshRBAC } = useRBAC();
  const theme                       = useTheme();
  const isMobile                    = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet                    = useMediaQuery(theme.breakpoints.down("md"));

  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "ADMIN" && !user?.tenant_id);
  const canEdit =
    isSuperAdmin ||
    rbacPerm("ADMIN_MGMT:edit") ||
    rbacPerm("SYSTEM_CONFIG:edit") ||
    rbacPerm("Permission Mapping:edit");

  // ── Core State ──────────────────────────────────────────────────────────
  const [roles,               setRoles]               = useState<Role[]>([]);
  const [selectedRole,        setSelectedRole]        = useState<Role | null>(null);
  const [menuTree,            setMenuTree]            = useState<MenuTreeNode[]>([]);
  const [permissions,         setPermissions]         = useState<Map<number, RoleMenuPermission>>(new Map());
  const [originalPermissions, setOriginalPermissions] = useState<Map<number, RoleMenuPermission>>(new Map());
  const [expandedIds,         setExpandedIds]         = useState<Set<number>>(new Set());

  // ── UI State ────────────────────────────────────────────────────────────
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [loadingSave,  setLoadingSave]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);

  const isSystemAdmin = user?.tenant_id == null && !!user;

  // ── Fetch Roles ─────────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      setError(null);
      const data = await permissionService.getRolesForUser();
      if (!data?.length) setError("No roles available. Please create roles first.");
      setRoles(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch roles.");
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  }, [isSystemAdmin]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // ── Select Role → Fetch Permissions ─────────────────────────────────────
  const handleRoleChange = useCallback(
    async (roleId: number) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role) return;
      setSelectedRole(role);
      setError(null);
      setLoadingMenus(true);
      setExpandedIds(new Set());
      try {
        const menuData = await permissionService.getRolePermissions(roleId);
        setMenuTree(menuData);
        const map = new Map<number, RoleMenuPermission>();
        const traverse = (nodes: MenuTreeNode[]) =>
          nodes.forEach((n) => {
            map.set(n.id, n.permissions);
            if (n.children) traverse(n.children);
          });
        traverse(menuData);
        setPermissions(map);
        setOriginalPermissions(new Map(map));
      } catch (err: any) {
        setError(err?.message || "Failed to fetch permissions.");
      } finally {
        setLoadingMenus(false);
      }
    },
    [roles]
  );

  // ── Flatten Tree ────────────────────────────────────────────────────────
  const tableRows: PermissionRow[] = useMemo(() => {
    const rows: PermissionRow[] = [];
    const traverse = (nodes: MenuTreeNode[]) =>
      nodes.forEach((n) => {
        rows.push({ id: n.id, name: n.name, level: n.level as 1 | 2, parent_id: n.parent_id, permissions: n.permissions });
        if (n.children?.length) traverse(n.children);
      });
    traverse(menuTree);
    return rows;
  }, [menuTree]);

  const parentRows = useMemo(() => tableRows.filter((r) => r.level === 1), [tableRows]);
  const childRows  = useMemo(() => tableRows.filter((r) => r.level === 2), [tableRows]);

  // ── Toggle Expand ───────────────────────────────────────────────────────
  const toggleExpand = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Permission Change ───────────────────────────────────────────────────
  const handlePermChange = (
    menuId: number,
    action: "view" | "create" | "edit" | "delete",
    checked: boolean
  ) => {
    setPermissions((prev) => {
      const map  = new Map(prev);
      const perm = map.get(menuId);
      if (!perm) return prev;

      const field = ({ view: "can_view", create: "can_create", edit: "can_edit", delete: "can_delete" } as const)[action];
      const updated = { ...perm, [field]: checked };

      if (action === "view" && !checked) {
        updated.can_create = false; updated.can_edit = false; updated.can_delete = false;
      }
      if (action !== "view" && checked) updated.can_view = true;
      map.set(menuId, updated as RoleMenuPermission);

      // Cascade to children
      childRows.filter((c) => c.parent_id === menuId).forEach((child) => {
        const cp = map.get(child.id);
        if (!cp) return;
        const cu = { ...cp, [field]: checked };
        if (action === "view" && !checked) { cu.can_create = false; cu.can_edit = false; cu.can_delete = false; }
        if (action !== "view" && checked) cu.can_view = true;
        map.set(child.id, cu as RoleMenuPermission);
      });

      // Upward: if child checked, ensure parent view is on
      const cur = tableRows.find((r) => r.id === menuId);
      if (cur?.parent_id && checked) {
        const pp = map.get(cur.parent_id);
        if (pp && !pp.can_view) map.set(cur.parent_id, { ...pp, can_view: true } as RoleMenuPermission);
      }
      return map;
    });
  };

  const handleToggleAll = (menuId: number, checked: boolean) => {
    setPermissions((prev) => {
      const map = new Map(prev);
      const apply = (id: number) => {
        const p = map.get(id);
        if (p) map.set(id, { ...p, can_view: checked, can_create: checked, can_edit: checked, can_delete: checked } as RoleMenuPermission);
      };
      apply(menuId);
      childRows.filter((c) => c.parent_id === menuId).forEach((c) => apply(c.id));
      if (checked) {
        const cur = tableRows.find((r) => r.id === menuId);
        if (cur?.parent_id) {
          const pp = map.get(cur.parent_id);
          if (pp && !pp.can_view) map.set(cur.parent_id, { ...pp, can_view: true } as RoleMenuPermission);
        }
      }
      return map;
    });
  };

  // ── Has Changes ─────────────────────────────────────────────────────────
  const hasChanges = useMemo(() => {
    for (const [k, v] of permissions.entries()) {
      const o = originalPermissions.get(k);
      if (!o) return true;
      if (o.can_view !== v.can_view || o.can_create !== v.can_create || o.can_edit !== v.can_edit || o.can_delete !== v.can_delete) return true;
    }
    return false;
  }, [permissions, originalPermissions]);

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!selectedRole) { setError("Please select a role first."); return; }
    if (!hasChanges)   { setError("No changes detected."); return; }
    try {
      setLoadingSave(true); setError(null);
      await permissionService.updateRolePermissions(selectedRole.id, Array.from(permissions.values()));
      
      // Refresh RBAC data so the sidebar updates dynamically if the current user is affected
      await refreshRBAC();
      
      setSuccess("Permissions updated successfully!");
      setOriginalPermissions(new Map(permissions));
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to save permissions.");
    } finally {
      setLoadingSave(false);
    }
  }, [selectedRole, permissions, hasChanges, refreshRBAC]);

  // ── Filtered Roles ──────────────────────────────────────────────────────
  const filteredRoles = useMemo(
    () => isSystemAdmin ? roles : roles.filter((r) => r.tenant_id === user?.tenant_id),
    [roles, isSystemAdmin, user?.tenant_id]
  );

  // ── Helpers ─────────────────────────────────────────────────────────────
  const activeCount = (id: number) => {
    const p = permissions.get(id);
    if (!p) return 0;
    return [p.can_view, p.can_create, p.can_edit, p.can_delete].filter(Boolean).length;
  };

  /* ═════════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════════ */
  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[{ title: "Permission Mapping", path: "#" }]}
          homePath="/"
          actions={<></>}
        />
      }
    >
      {/* ── Progress Bar (when saving) ──────────────────────────────────── */}
      <Fade in={loadingSave}>
        <LinearProgress
          sx={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
            "& .MuiLinearProgress-bar": {
              background: `linear-gradient(90deg, ${PALETTE.primary}, ${PALETTE.accent})`,
            },
            bgcolor: PALETTE.borderLight,
          }}
        />
      </Fade>

      {/* ── Snackbar Alerts ─────────────────────────────────────────────── */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setError(null)}
          sx={{
            borderRadius: 3,
            fontWeight: 600,
            boxShadow: PALETTE.shadowMd,
            "& .MuiAlert-icon": { fontSize: 22 },
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          icon={<CheckCircleIcon />}
          onClose={() => setSuccess(null)}
          sx={{
            borderRadius: 3,
            fontWeight: 600,
            boxShadow: PALETTE.shadowMd,
            background: `linear-gradient(135deg, ${PALETTE.mint} 0%, ${PALETTE.primaryDark} 100%)`,
          }}
        >
          {success}
        </Alert>
      </Snackbar>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO CARD — Role Selector
          ═══════════════════════════════════════════════════════════════════ */}
      <Box
        component="section"
        aria-label="Role selection"
        sx={{
          mx: { xs: 1.5, sm: 2.5 },
          mt: { xs: 1.5, sm: 2.5 },
          p: { xs: 2.5, sm: 3 },
          borderRadius: 4,
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(135deg, ${PALETTE.primary} 0%, ${PALETTE.primaryDark} 50%, ${PALETTE.accent} 100%)`,
          boxShadow: PALETTE.shadowXl,
          // Animated shimmer overlay
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)`,
            backgroundSize: "200% 100%",
            animation: `${shimmer} 6s ease-in-out infinite`,
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { md: "center" },
            gap: { xs: 2, md: 3 },
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Icon + Title */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <Box
              sx={{
                width: 52, height: 52, borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(10px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.3s ease, background 0.3s ease",
                "&:hover": { transform: "rotate(-8deg) scale(1.1)", bgcolor: "rgba(255,255,255,0.25)" },
              }}
            >
              <SecurityIcon sx={{ color: PALETTE.textOnPrimary, fontSize: 28 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                component="h1"
                sx={{ fontWeight: 800, color: PALETTE.textOnPrimary, lineHeight: 1.2, letterSpacing: "-0.02em" }}
              >
                Permission Mapping
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 500, mt: 0.3 }}
              >
                Configure module access for each role
              </Typography>
            </Box>
          </Box>

          <Divider
            orientation={isMobile ? "horizontal" : "vertical"}
            flexItem
            sx={{ borderColor: "rgba(255,255,255,0.2)" }}
          />

          {/* Role Dropdown */}
          {loadingRoles ? (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Skeleton variant="rounded" width={200} height={40} sx={{ borderRadius: 3, bgcolor: "rgba(255,255,255,0.15)" }} />
            </Box>
          ) : filteredRoles.length === 0 ? (
            <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", fontWeight: 500 }}>
              No roles available
            </Typography>
          ) : (
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 } }}>
              <InputLabel sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 600, "&.Mui-focused": { color: "white" } }}>
                Select Role
              </InputLabel>
              <Select
                value={selectedRole?.id || ""}
                label="Select Role"
                onChange={(e) => handleRoleChange(parseInt(e.target.value as string))}
                disabled={loadingRoles || filteredRoles.length === 0}
                sx={{
                  color: "white",
                  fontWeight: 700,
                  borderRadius: 3,
                  backdropFilter: "blur(10px)",
                  bgcolor: "rgba(255,255,255,0.1)",
                  transition: "all 0.3s ease",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.3)", borderWidth: 1.5 },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.6)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white", borderWidth: 2 },
                  "& .MuiSelect-icon": { color: "rgba(255,255,255,0.8)" },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      borderRadius: 3,
                      mt: 1,
                      boxShadow: PALETTE.shadowLg,
                      border: `1px solid ${PALETTE.borderLight}`,
                      "& .MuiMenuItem-root": {
                        borderRadius: 2,
                        mx: 0.5,
                        my: 0.3,
                        transition: "all 0.2s ease",
                        "&:hover": { bgcolor: alpha(PALETTE.primary, 0.08) },
                        "&.Mui-selected": { bgcolor: alpha(PALETTE.primary, 0.12), "&:hover": { bgcolor: alpha(PALETTE.primary, 0.16) } },
                      },
                    },
                  },
                }}
              >
                <MenuItem value=""><em>— Select a role —</em></MenuItem>
                {filteredRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                      <AdminPanelSettingsIcon sx={{ fontSize: 18, color: PALETTE.textMuted }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{role.name}</Typography>
                      <Chip
                        label={role.scope_type === "Tenant" ? "Tenant" : "Platform"}
                        size="small"
                        sx={{
                          height: 20, fontSize: "0.65rem", fontWeight: 700, borderRadius: 1.5,
                          bgcolor: role.scope_type === "Tenant" ? alpha("#4299E1", 0.1) : alpha(PALETTE.primary, 0.1),
                          color: role.scope_type === "Tenant" ? "#2B6CB0" : PALETTE.primaryDark,
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Stats Badges */}
          {selectedRole && !loadingMenus && (
            <Fade in timeout={500}>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", ml: { md: "auto" } }}>
                {[
                  { val: parentRows.length, label: "Modules",   icon: "📦" },
                  { val: childRows.length,  label: "Sub-pages", icon: "📄" },
                ].map((stat) => (
                  <Box
                    key={stat.label}
                    sx={{
                      textAlign: "center",
                      bgcolor: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 2.5,
                      px: 2.5, py: 1,
                      minWidth: 72,
                      transition: "transform 0.2s ease, background 0.2s ease",
                      "&:hover": { transform: "translateY(-2px)", bgcolor: "rgba(255,255,255,0.22)" },
                    }}
                  >
                    <Typography sx={{ fontSize: "0.7rem", mb: 0.3 }}>{stat.icon}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "white", lineHeight: 1, fontSize: "1.2rem" }}>
                      {stat.val}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: "0.65rem" }}>
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Fade>
          )}
        </Box>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          LOADING SKELETON
          ═══════════════════════════════════════════════════════════════════ */}
      {selectedRole && loadingMenus && (
        <Box sx={{ mx: { xs: 1.5, sm: 2.5 }, mt: 2.5 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={56}
              sx={{
                borderRadius: 2,
                mb: 1,
                bgcolor: alpha(PALETTE.primary, 0.06),
                animation: `${fadeInUp} 0.4s ease ${i * 0.1}s backwards`,
              }}
            />
          ))}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ACCORDION TABLE
          ═══════════════════════════════════════════════════════════════════ */}
      {selectedRole && !loadingMenus && parentRows.length > 0 && (
        <Box
          component="section"
          aria-label="Permission configuration"
          sx={{
            mx: { xs: 1.5, sm: 2.5 },
            mt: 2,
            mb: 1,
            animation: `${fadeInUp} 0.4s ease`,
          }}
        >
          {/* Column Header — Desktop Only */}
          {!isMobile && (
            <Box
              component="header"
              role="row"
              aria-label="Permission table header"
              sx={{
                display: "grid",
                gridTemplateColumns: isTablet
                  ? "1fr 56px 56px 56px 56px 60px"
                  : "1fr 72px 72px 72px 72px 80px",
                px: 2.5,
                py: 1.2,
                background: `linear-gradient(135deg, ${PALETTE.primary} 0%, ${PALETTE.primaryDark} 100%)`,
                borderRadius: "14px 14px 0 0",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, color: "white", letterSpacing: 1.2, fontSize: "0.7rem", textTransform: "uppercase" }}
              >
                Module
              </Typography>
              {PERM_CONFIG.map(({ label }) => (
                <Typography
                  key={label}
                  align="center"
                  variant="caption"
                  sx={{ fontWeight: 800, color: "white", letterSpacing: 0.5, fontSize: "0.65rem", textTransform: "uppercase" }}
                >
                  {label}
                </Typography>
              ))}
              <Typography
                align="center"
                variant="caption"
                sx={{ fontWeight: 800, color: "white", letterSpacing: 0.5, fontSize: "0.65rem", textTransform: "uppercase" }}
              >
                All
              </Typography>
            </Box>
          )}

          {/* Rows Container */}
          <Paper
            elevation={0}
            sx={{
              border: `1.5px solid ${PALETTE.borderAccent}`,
              borderTop: isMobile ? `1.5px solid ${PALETTE.borderAccent}` : "none",
              borderRadius: isMobile ? 3 : "0 0 14px 14px",
              overflow: "hidden",
              boxShadow: PALETTE.shadowSm,
            }}
          >
            {parentRows.map((row, idx) => {
              const perm       = permissions.get(row.id);
              if (!perm) return null;
              const expanded   = expandedIds.has(row.id);
              const children   = childRows.filter((c) => c.parent_id === row.id);
              const active     = activeCount(row.id);
              const allChecked = perm.can_view && perm.can_create && perm.can_edit && perm.can_delete;
              const isLast     = idx === parentRows.length - 1;

              return (
                <Box
                  key={row.id}
                  sx={{ animation: `${fadeInUp} 0.35s ease ${idx * 0.04}s backwards` }}
                >
                  {/* ── Parent Row ──────────────────────────────────────── */}
                  <Box
                    component="article"
                    tabIndex={0}
                    role={children.length > 0 ? "button" : undefined}
                    aria-expanded={children.length > 0 ? expanded : undefined}
                    aria-label={`${row.name} module, ${active} of 4 permissions active`}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && children.length > 0) {
                        e.preventDefault();
                        toggleExpand(row.id);
                      }
                    }}
                    onClick={() => children.length > 0 && toggleExpand(row.id)}
                    sx={{
                      display: isMobile ? "flex" : "grid",
                      flexDirection: isMobile ? "column" : undefined,
                      gridTemplateColumns: isTablet
                        ? "1fr 56px 56px 56px 56px 60px"
                        : "1fr 72px 72px 72px 72px 80px",
                      alignItems: "center",
                      px: { xs: 2, sm: 2.5 },
                      py: { xs: 1.5, sm: 1 },
                      bgcolor: expanded ? PALETTE.expandedBg : (idx % 2 === 0 ? PALETTE.rowOdd : PALETTE.rowEven),
                      borderBottom: isLast && !expanded ? "none" : `1px solid ${PALETTE.borderLight}`,
                      cursor: children.length > 0 ? "pointer" : "default",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        bgcolor: PALETTE.rowHover,
                        transform: "translateX(2px)",
                        "& .module-icon": { bgcolor: PALETTE.primary, transform: "scale(1.1)" },
                      },
                      "&:focus-visible": {
                        outline: `2px solid ${PALETTE.primary}`,
                        outlineOffset: -2,
                      },
                    }}
                  >
                    {/* Module Name + Icons */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: isMobile ? 1.2 : 0, width: "100%" }}>
                      <Box
                        className="module-icon"
                        sx={{
                          width: 36, height: 36, borderRadius: 2,
                          bgcolor: active > 0 ? alpha(PALETTE.primary, 0.15) : alpha(PALETTE.textMuted, 0.1),
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.3s ease",
                        }}
                      >
                        {active > 0
                          ? <LockOpenIcon sx={{ fontSize: 18, color: PALETTE.primary, transition: "color 0.3s" }} />
                          : <LockIcon sx={{ fontSize: 18, color: PALETTE.textMuted, transition: "color 0.3s" }} />
                        }
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          component="span"
                          sx={{ fontWeight: 700, color: PALETTE.textPrimary, fontSize: "0.9rem", display: "block" }}
                        >
                          {row.name}
                        </Typography>
                        {/* Mobile permission pills */}
                        {isMobile && (
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                            {PERM_CONFIG.map(({ key, label, color }) => (
                              <Chip
                                key={key}
                                label={label}
                                size="small"
                                sx={{
                                  height: 20, fontSize: "0.6rem", fontWeight: 700, borderRadius: 1.5,
                                  bgcolor: perm[key] ? alpha(color, 0.15) : alpha(PALETTE.textMuted, 0.08),
                                  color: perm[key] ? color : PALETTE.textMuted,
                                  border: `1px solid ${perm[key] ? alpha(color, 0.3) : "transparent"}`,
                                  transition: "all 0.25s ease",
                                  "& .MuiChip-label": { px: 0.8 },
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                      {children.length > 0 && (
                        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Chip
                            label={`${children.length} ${children.length === 1 ? "page" : "pages"}`}
                            size="small"
                            sx={{
                              height: 22, fontSize: "0.65rem", fontWeight: 700, borderRadius: 2,
                              bgcolor: expanded ? alpha(PALETTE.primary, 0.15) : alpha(PALETTE.textMuted, 0.08),
                              color: expanded ? PALETTE.primaryDark : PALETTE.textMuted,
                              transition: "all 0.3s ease",
                            }}
                          />
                          <ExpandMoreIcon
                            sx={{
                              fontSize: 22,
                              color: expanded ? PALETTE.primary : PALETTE.textMuted,
                              transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s",
                              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </Box>
                      )}
                    </Box>

                    {/* Checkboxes — Desktop grid */}
                    {isMobile ? (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 0.5, width: "100%" }} onClick={(e) => e.stopPropagation()}>
                        {PERM_CONFIG.map(({ action, label, color }) => {
                          const field = { view: "can_view", create: "can_create", edit: "can_edit", delete: "can_delete" }[action] as keyof RoleMenuPermission;
                          return (
                            <Box key={action} sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                              <Checkbox
                                checked={!!perm[field]}
                                onChange={(e) => handlePermChange(row.id, action, e.target.checked)}
                                size="small"
                                disabled={!canEdit || (action !== "view" && !perm.can_view)}
                                sx={{
                                  p: 0.3,
                                  color: PALETTE.border,
                                  "&.Mui-checked": { color },
                                  transition: "all 0.2s ease",
                                  "&:hover": { bgcolor: alpha(color, 0.08) },
                                }}
                              />
                              <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.textSecondary, textTransform: "capitalize", fontSize: "0.75rem" }}>
                                {label}
                              </Typography>
                            </Box>
                          );
                        })}
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                          <Checkbox
                            checked={allChecked}
                            onChange={(e) => handleToggleAll(row.id, e.target.checked)}
                            size="small"
                            disabled={!canEdit}
                            sx={{
                              p: 0.3,
                              color: PALETTE.border,
                              "&.Mui-checked": { color: PALETTE.primary },
                            }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: PALETTE.textPrimary, fontSize: "0.75rem" }}>All</Typography>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        {PERM_CONFIG.map(({ action, color }) => {
                          const field = { view: "can_view", create: "can_create", edit: "can_edit", delete: "can_delete" }[action] as keyof RoleMenuPermission;
                          return (
                            <Box key={action} sx={{ display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                              <Tooltip title={`${action.charAt(0).toUpperCase() + action.slice(1)}`} arrow placement="top">
                                <span>
                                  <Checkbox
                                    checked={!!perm[field]}
                                    onChange={(e) => handlePermChange(row.id, action, e.target.checked)}
                                    size="small"
                                    disabled={!canEdit || (action !== "view" && !perm.can_view)}
                                    sx={{
                                      p: 0.5,
                                      color: PALETTE.border,
                                      "&.Mui-checked": { color, animation: `${pulseGlow} 0.4s ease` },
                                      transition: "all 0.2s ease",
                                      "&:hover": { bgcolor: alpha(color, 0.08), transform: "scale(1.15)" },
                                    }}
                                  />
                                </span>
                              </Tooltip>
                            </Box>
                          );
                        })}
                        <Box sx={{ display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Toggle All" arrow placement="top">
                            <span>
                              <Checkbox
                                checked={allChecked}
                                onChange={(e) => handleToggleAll(row.id, e.target.checked)}
                                size="small"
                                disabled={!canEdit}
                                sx={{
                                  p: 0.5,
                                  color: PALETTE.border,
                                  "&.Mui-checked": { color: PALETTE.primary, animation: `${pulseGlow} 0.4s ease` },
                                  "&:hover": { transform: "scale(1.15)" },
                                }}
                              />
                            </span>
                          </Tooltip>
                        </Box>
                      </>
                    )}
                  </Box>

                  {/* ── Children (Collapsed) ─────────────────────────────── */}
                  <Collapse in={expanded} unmountOnExit timeout={350} easing="cubic-bezier(0.4, 0, 0.2, 1)">
                    {children.map((child, ci) => {
                      const cp       = permissions.get(child.id);
                      if (!cp) return null;
                      const caChecked = cp.can_view && cp.can_create && cp.can_edit && cp.can_delete;
                      const isClast   = ci === children.length - 1;

                      return (
                        <Box
                          key={child.id}
                          component="article"
                          aria-label={`${child.name} sub-page`}
                          sx={{
                            display: isMobile ? "flex" : "grid",
                            flexDirection: isMobile ? "column" : undefined,
                            gridTemplateColumns: isTablet
                              ? "1fr 56px 56px 56px 56px 60px"
                              : "1fr 72px 72px 72px 72px 80px",
                            alignItems: "center",
                            pl: { xs: 3.5, sm: 5 },
                            pr: 2,
                            py: { xs: 1.2, sm: 0.75 },
                            bgcolor: ci % 2 === 0 ? PALETTE.childBg : PALETTE.childBgAlt,
                            borderBottom: isClast && isLast ? "none" : `1px solid ${alpha(PALETTE.primary, 0.08)}`,
                            borderLeft: `3px solid ${PALETTE.primary}`,
                            transition: "all 0.25s ease",
                            animation: `${fadeInUp} 0.3s ease ${ci * 0.05}s backwards`,
                            "&:hover": { bgcolor: alpha(PALETTE.primary, 0.06), pl: { xs: 4, sm: 5.5 } },
                          }}
                        >
                          {/* Child Name */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: isMobile ? 0.8 : 0, width: "100%" }}>
                            <Box
                              sx={{
                                width: 7, height: 7, borderRadius: "50%",
                                bgcolor: PALETTE.primary,
                                flexShrink: 0,
                                boxShadow: `0 0 6px ${alpha(PALETTE.primary, 0.4)}`,
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: PALETTE.textSecondary, fontSize: "0.84rem" }}
                            >
                              {child.name}
                            </Typography>
                            {isMobile && (
                              <Box sx={{ display: "flex", gap: 0.5, ml: "auto", flexWrap: "wrap" }}>
                                {PERM_CONFIG.map(({ key, label, color }) => (
                                  <Chip
                                    key={key}
                                    label={label}
                                    size="small"
                                    sx={{
                                      height: 18, fontSize: "0.58rem", fontWeight: 700, borderRadius: 1.5,
                                      bgcolor: cp[key] ? alpha(color, 0.15) : alpha(PALETTE.textMuted, 0.06),
                                      color: cp[key] ? color : PALETTE.textMuted,
                                      "& .MuiChip-label": { px: 0.8 },
                                      transition: "all 0.2s ease",
                                    }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>

                          {/* Child Checkboxes */}
                          {isMobile ? (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 0.5, width: "100%" }}>
                              {PERM_CONFIG.map(({ action, label, color }) => {
                                const field = { view: "can_view", create: "can_create", edit: "can_edit", delete: "can_delete" }[action] as keyof RoleMenuPermission;
                                return (
                                  <Box key={action} sx={{ display: "flex", alignItems: "center", gap: 0.2 }}>
                                    <Checkbox
                                      checked={!!cp[field]}
                                      onChange={(e) => handlePermChange(child.id, action, e.target.checked)}
                                      size="small"
                                      disabled={!canEdit || (action !== "view" && !cp.can_view)}
                                      sx={{ p: 0.25, color: PALETTE.border, "&.Mui-checked": { color } }}
                                    />
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: PALETTE.textSecondary, textTransform: "capitalize", fontSize: "0.72rem" }}>
                                      {label}
                                    </Typography>
                                  </Box>
                                );
                              })}
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.2 }}>
                                <Checkbox
                                  checked={caChecked}
                                  onChange={(e) => handleToggleAll(child.id, e.target.checked)}
                                  size="small"
                                  disabled={!canEdit}
                                  sx={{ p: 0.25, color: PALETTE.border, "&.Mui-checked": { color: PALETTE.primary } }}
                                />
                                <Typography variant="caption" sx={{ fontWeight: 700, color: PALETTE.textPrimary }}>All</Typography>
                              </Box>
                            </Box>
                          ) : (
                            <>
                              {PERM_CONFIG.map(({ action, color }) => {
                                const field = { view: "can_view", create: "can_create", edit: "can_edit", delete: "can_delete" }[action] as keyof RoleMenuPermission;
                                return (
                                  <Box key={action} sx={{ display: "flex", justifyContent: "center" }}>
                                    <Checkbox
                                      checked={!!cp[field]}
                                      onChange={(e) => handlePermChange(child.id, action, e.target.checked)}
                                      size="small"
                                      disabled={!canEdit || (action !== "view" && !cp.can_view)}
                                      sx={{
                                        p: 0.4,
                                        color: PALETTE.border,
                                        "&.Mui-checked": { color },
                                        "&:hover": { bgcolor: alpha(color, 0.08), transform: "scale(1.1)" },
                                        transition: "all 0.2s ease",
                                      }}
                                    />
                                  </Box>
                                );
                              })}
                              <Box sx={{ display: "flex", justifyContent: "center" }}>
                                <Checkbox
                                  checked={caChecked}
                                  onChange={(e) => handleToggleAll(child.id, e.target.checked)}
                                  size="small"
                                  disabled={!canEdit}
                                  sx={{ p: 0.4, color: PALETTE.border, "&.Mui-checked": { color: PALETTE.primary } }}
                                />
                              </Box>
                            </>
                          )}
                        </Box>
                      );
                    })}
                  </Collapse>

                  {!isLast && <Divider sx={{ borderColor: PALETTE.borderLight }} />}
                </Box>
              );
            })}
          </Paper>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ACTION BUTTONS
          ═══════════════════════════════════════════════════════════════════ */}
      {selectedRole && !loadingMenus && parentRows.length > 0 && (
        <Fade in timeout={400}>
          <Box
            component="footer"
            sx={{
              mx: { xs: 1.5, sm: 2.5 },
              mt: 2,
              mb: 3,
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              bgcolor: alpha(PALETTE.primary, 0.03),
              border: `1.5px solid ${hasChanges ? PALETTE.borderAccent : PALETTE.borderLight}`,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5,
              justifyContent: "flex-end",
              alignItems: { sm: "center" },
              transition: "all 0.3s ease",
              ...(hasChanges && { boxShadow: `0 0 0 1px ${alpha(PALETTE.primary, 0.1)}` }),
            }}
          >
            {hasChanges && (
              <Typography
                variant="caption"
                sx={{
                  color: PALETTE.primary,
                  fontWeight: 600,
                  mr: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  animation: `${fadeInUp} 0.3s ease`,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 8, height: 8, borderRadius: "50%",
                    bgcolor: PALETTE.primary,
                    display: "inline-block",
                    animation: `${pulseGlow} 2s ease infinite`,
                  }}
                />
                Unsaved changes
              </Typography>
            )}
            <Button
              variant="outlined"
              startIcon={<UndoIcon />}
              onClick={() => setPermissions(new Map(originalPermissions))}
              disabled={!hasChanges || loadingSave}
              sx={{
                borderRadius: 2.5,
                fontWeight: 600,
                borderColor: PALETTE.border,
                color: PALETTE.textSecondary,
                textTransform: "none",
                px: 3,
                transition: "all 0.2s ease",
                "&:hover": { borderColor: PALETTE.textMuted, bgcolor: alpha(PALETTE.textMuted, 0.04) },
              }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!hasChanges || loadingSave || !canEdit}
              startIcon={loadingSave ? <CircularProgress size={18} sx={{ color: "white" }} /> : <SaveIcon />}
              sx={{
                borderRadius: 2.5,
                fontWeight: 700,
                px: 4,
                textTransform: "none",
                background: `linear-gradient(135deg, ${PALETTE.primary} 0%, ${PALETTE.primaryDark} 100%)`,
                boxShadow: `0 4px 14px ${alpha(PALETTE.primary, 0.35)}`,
                transition: "all 0.3s ease",
                "&:hover": {
                  background: `linear-gradient(135deg, ${PALETTE.primaryDark} 0%, ${PALETTE.accent} 100%)`,
                  boxShadow: `0 6px 20px ${alpha(PALETTE.primary, 0.45)}`,
                  transform: "translateY(-1px)",
                },
                "&:active": { transform: "translateY(0)" },
                "&:disabled": {
                  background: PALETTE.border,
                  boxShadow: "none",
                  color: PALETTE.textMuted,
                },
              }}
            >
              {loadingSave ? "Saving…" : "Save Permissions"}
            </Button>
          </Box>
        </Fade>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          EMPTY STATE
          ═══════════════════════════════════════════════════════════════════ */}
      {!selectedRole && !loadingRoles && (
        <Fade in timeout={600}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: { xs: 8, sm: 14 },
              gap: 2,
              animation: `${fadeInUp} 0.5s ease`,
            }}
          >
            <Box
              sx={{
                width: 96, height: 96,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${alpha(PALETTE.primary, 0.12)} 0%, ${alpha(PALETTE.accent, 0.08)} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 8px 32px ${alpha(PALETTE.primary, 0.15)}`,
                transition: "transform 0.3s ease",
                "&:hover": { transform: "scale(1.08) rotate(-5deg)" },
              }}
            >
              <VerifiedUserIcon sx={{ fontSize: 48, color: PALETTE.primary }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: PALETTE.textPrimary, mt: 1 }}>
              Select a Role
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: PALETTE.textMuted, maxWidth: 360, textAlign: "center", lineHeight: 1.6 }}
            >
              Choose a role from the dropdown above to view and manage its module permissions.
            </Typography>
          </Box>
        </Fade>
      )}
    </ListPageLayout>
  );
};

export default PermissionManagementPage;
