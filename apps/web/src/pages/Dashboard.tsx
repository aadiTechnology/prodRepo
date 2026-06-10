import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  Skeleton,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  MenuItem,
  Alert,
} from "@mui/material";
import {
  School as SchoolIcon,
  People as PeopleIcon,
  MonetizationOn as MoneyIcon,
  TrendingUp as TrendIcon,
  AssignmentTurnedIn as AttendanceIcon,
  NotificationsActive as NoticeIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  WatchLater as HalfDayIcon,
  CalendarToday as CalendarIcon,
  Class as ClassIcon,
  LocalAtm as FeeIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  AccessTime as AccessTimeIcon,
  WbSunny as SunIcon,
  WbTwilight as SunriseIcon,
  NightsStay as MoonIcon,
  Star as StarIcon,
  Call as CallIcon,
  AssignmentInd as AssignmentIndIcon,
  ContactPhone as ContactPhoneIcon,
  Assignment as HomeworkIcon,
  MenuBook as SubjectIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  CheckBox as QuickMarkIcon,
  DragIndicator as DragHandleIcon,
} from "@mui/icons-material";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import dashboardService, {
  DashboardResponse,
  AdminDashboardData,
  TeacherDashboardData,
  StudentDashboardData,
  RecentNoticeItem,
  DashboardFetchParams,
  AttendanceOverview,
  FeeCollectionSummary,
} from "../api/services/dashboardService";
import schoolClassService, { SchoolClass } from "../api/services/schoolClassService";
import { formatLastLoginLabel, getPreviousLoginIso } from "../utils/lastLoginStorage";

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  blue: "#2563EB",
  blueDark: "#1D4ED8",
  blueGlass: "rgba(37,99,235,0.08)",
  green: "#16A34A",
  greenGlass: "rgba(22,163,74,0.08)",
  amber: "#D97706",
  amberGlass: "rgba(217,119,6,0.08)",
  red: "#DC2626",
  redGlass: "rgba(220,38,38,0.08)",
  purple: "#7C3AED",
  purpleGlass: "rgba(124,58,237,0.08)",
  slate: "#0F172A",
  slateText: "#1E293B",
  muted: "#64748B",
  border: "rgba(226,232,240,0.8)",
  cardBg: "rgba(255,255,255,0.72)",
  cardBorder: "rgba(255,255,255,0.55)",
  white: "#FFFFFF",
};

// ─── Draggable section infrastructure ────────────────────────────────────────
function useSectionOrder(storageKey: string, defaultOrder: string[]): [string[], (next: string[]) => void] {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        // Keep only IDs that still exist; append any new ones
        const valid = parsed.filter((id) => defaultOrder.includes(id));
        const added = defaultOrder.filter((id) => !valid.includes(id));
        return [...valid, ...added];
      }
    } catch { /* ignore */ }
    return defaultOrder;
  });

  const save = useCallback((next: string[]) => {
    setOrder(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  }, [storageKey]);

  return [order, save];
}

const SortableSection: React.FC<{ id: string; children: React.ReactNode; sx?: object }> = ({ id, children, sx }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        position: "relative",
        "&:hover .drag-handle": { opacity: 1 },
        ...sx,
      }}
    >
      {/* Drag handle — visible on hover */}
      <Box
        className="drag-handle"
        {...attributes}
        {...listeners}
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          opacity: 0,
          transition: "opacity 0.2s",
          cursor: "grab",
          bgcolor: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "8px",
          p: 0.5,
          display: "flex",
          alignItems: "center",
          color: C.muted,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          "&:active": { cursor: "grabbing" },
        }}
      >
        <DragHandleIcon sx={{ fontSize: 18 }} />
      </Box>
      {children}
    </Box>
  );
};

// ─── Date Filter helpers ──────────────────────────────────────────────────────
type DatePreset = "today" | "week" | "month" | "custom";

interface SectionDateFilter {
  preset: DatePreset;
  start: string;
  end: string;
}

const isoDate = (d: Date) => d.toISOString().split("T")[0];

const getPresetRange = (preset: DatePreset): { start: string; end: string } => {
  const today = new Date();
  if (preset === "today") return { start: isoDate(today), end: isoDate(today) };
  if (preset === "week") {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { start: isoDate(d), end: isoDate(today) };
  }
  if (preset === "month") {
    return {
      start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
      end: isoDate(today),
    };
  }
  return { start: "", end: "" };
};

const makeFilter = (preset: DatePreset): SectionDateFilter => ({
  preset,
  ...getPresetRange(preset),
});

const effectiveDates = (f: SectionDateFilter) => {
  if (f.preset === "custom") return { start: f.start || undefined, end: f.end || undefined };
  return { start: f.start || undefined, end: f.end || undefined };
};

// ─── Per-card date filter component ──────────────────────────────────────────
const PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 Days" },
  { key: "month", label: "Month" },
  { key: "custom", label: "Custom" },
];

const CardDateFilter: React.FC<{
  value: SectionDateFilter;
  onChange: (f: SectionDateFilter) => void;
  presets?: Array<{ key: DatePreset; label: string }>;
}> = ({ value, onChange, presets = PRESETS }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
    {presets.map((p) => (
      <Chip
        key={p.key}
        label={p.label}
        size="small"
        onClick={() => onChange({ preset: p.key, ...getPresetRange(p.key) })}
        sx={{
          height: 22,
          fontSize: "11px",
          fontWeight: 700,
          borderRadius: "6px",
          cursor: "pointer",
          bgcolor: value.preset === p.key ? C.blue : C.blueGlass,
          color: value.preset === p.key ? "#fff" : C.muted,
          border: `1px solid ${value.preset === p.key ? C.blue : "rgba(37,99,235,0.18)"}`,
          "&:hover": {
            bgcolor: value.preset === p.key ? C.blueDark : "rgba(37,99,235,0.14)",
          },
        }}
      />
    ))}
    {value.preset === "custom" && (
      <Box sx={{ display: "flex", gap: 0.75 }}>
        <TextField
          type="date"
          size="small"
          value={value.start}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
          InputLabelProps={{ shrink: true }}
          inputProps={{ style: { fontSize: 11, padding: "3px 7px" } }}
          sx={{ width: 128, "& fieldset": { borderRadius: "6px" } }}
        />
        <TextField
          type="date"
          size="small"
          value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
          InputLabelProps={{ shrink: true }}
          inputProps={{ style: { fontSize: 11, padding: "3px 7px" } }}
          sx={{ width: 128, "& fieldset": { borderRadius: "6px" } }}
        />
      </Box>
    )}
  </Box>
);

// ─── Glassmorphic card shell ──────────────────────────────────────────────────
const GCard: React.FC<{ children: React.ReactNode; sx?: object }> = ({ children, sx }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: "20px",
      border: `1.5px solid ${C.cardBorder}`,
      background: C.cardBg,
      backdropFilter: "blur(16px)",
      boxShadow: "0 4px 24px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.55)",
      transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
      position: "relative",
      overflow: "hidden",
      "&:hover": {
        boxShadow: "0 8px 32px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
        borderColor: "rgba(255,255,255,0.7)",
        transform: "translateY(-2px)",
      },
      ...sx,
    }}
  >
    {children}
  </Card>
);

// ─── Card section header with optional date filter ────────────────────────────
const CardHeader: React.FC<{
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  dateFilter?: React.ReactNode;
}> = ({ title, icon, action, dateFilter }) => (
  <Box sx={{ mb: 2.5 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: dateFilter ? 1.5 : 0 }}>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 800, color: C.slateText, display: "flex", alignItems: "center", gap: 1, letterSpacing: "-0.1px" }}
      >
        {icon}
        {title}
      </Typography>
      {action}
    </Box>
    {dateFilter}
  </Box>
);

// ─── Metric snapshot card ─────────────────────────────────────────────────────
interface SnapCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor: string;
  glassBg: string;
  sub?: React.ReactNode;
  onClick?: () => void;
}
const genderChipLabelSx = {
  display: "inline-flex",
  alignItems: "center",
  px: 1,
  py: 0,
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.25,
};

const GenderCountChip = ({
  tooltip,
  count,
  variant,
}: {
  tooltip: string;
  count: number;
  variant: "boys" | "girls";
}) => {
  const isBoys = variant === "boys";
  const label = isBoys ? `♂ ${count}` : `♀ ${count}`;

  return (
    <Tooltip
      title={tooltip}
      arrow
      placement="bottom"
      enterDelay={150}
      slotProps={{
        popper: {
          sx: { zIndex: (theme) => theme.zIndex.tooltip + 2 },
        },
        tooltip: {
          sx: { fontSize: "12px", fontWeight: 600 },
        },
      }}
    >
      <Box
        component="span"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        sx={{ display: "inline-flex", cursor: "help" }}
      >
        <Chip
          label={label}
          size="small"
          aria-label={`${tooltip} ${label}`}
          sx={{
            height: 26,
            bgcolor: isBoys ? C.blueGlass : "rgba(236,72,153,0.12)",
            color: isBoys ? C.blue : "#EC4899",
            borderRadius: "6px",
            border: `1px solid ${isBoys ? "rgba(37,99,235,0.2)" : "rgba(236,72,153,0.25)"}`,
            "& .MuiChip-label": {
              ...genderChipLabelSx,
              color: "inherit",
            },
          }}
        />
      </Box>
    </Tooltip>
  );
};

const SnapCard: React.FC<SnapCardProps> = ({ title, value, icon, accentColor, glassBg, sub, onClick }) => (
  <GCard sx={{ cursor: onClick ? "pointer" : "default" }}>
    <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }} onClick={onClick}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Typography
          variant="caption"
          sx={{ color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.9px", display: "block" }}
        >
          {title}
        </Typography>
        <Avatar
          sx={{
            bgcolor: glassBg,
            color: accentColor,
            width: 40,
            height: 40,
            borderRadius: "12px",
            border: `1.5px solid ${accentColor}22`,
          }}
        >
          {icon}
        </Avatar>
      </Box>
      <Typography
        variant="h4"
        sx={{ fontWeight: 900, color: C.slateText, letterSpacing: "-1.5px", lineHeight: 1.1, mb: sub ? 1 : 0 }}
      >
        {value}
      </Typography>
      {sub}
    </CardContent>
  </GCard>
);

// ─── SVG donut attendance ring ────────────────────────────────────────────────
const AttRing: React.FC<{ pct: number; size?: number; color?: string; gradId: string }> = ({
  pct,
  size = 130,
  color = C.blue,
  gradId,
}) => (
  <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
    <svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color + "BB"} />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="3" />
      <circle cx="18" cy="18" r="15.9" fill="none" stroke={`${color}18`} strokeWidth="3.2" strokeDasharray="1 3" />
      <circle
        cx="18"
        cy="18"
        r="15.9"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray={`${Math.min(pct, 100)} ${100 - Math.min(pct, 100)}`}
        style={{ transition: "stroke-dasharray 1.1s ease" }}
      />
    </svg>
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography sx={{ fontWeight: 900, fontSize: size > 110 ? "1.45rem" : "1rem", color, letterSpacing: "-0.5px" }}>
        {pct.toFixed(1)}%
      </Typography>
      <Typography sx={{ fontSize: "9px", color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>
        Presence Rate
      </Typography>
    </Box>
  </Box>
);

// ─── Animated sparkline ───────────────────────────────────────────────────────
const Sparkline: React.FC<{ color: string; delay?: number }> = ({ color, delay = 0 }) => (
  <Box sx={{ width: "100%", height: 28, mt: 1, mb: 0.5, opacity: 0.8 }}>
    <svg width="100%" height="100%" viewBox="0 0 100 28" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 20 C12 16, 18 5, 28 13 C38 21, 42 7, 52 15 C62 23, 68 7, 78 10 C88 13, 92 2, 100 6 L100 28 L0 28 Z"
        fill={`url(#sg${color.replace("#", "")})`}
      />
      <path
        d="M0 20 C12 16, 18 5, 28 13 C38 21, 42 7, 52 15 C62 23, 68 7, 78 10 C88 13, 92 2, 100 6"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        style={{
          strokeDasharray: 150,
          strokeDashoffset: 150,
          animation: `drawLine 1.8s ease ${delay}s forwards`,
        }}
      />
    </svg>
  </Box>
);

// ─── Notice type legend components (reusable) ────────────────────────────────
const NOTICE_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  holiday:      { label: "Holiday",      color: "#D97706", bg: "rgba(217,119,6,0.1)"      },
  general:      { label: "General",      color: C.blue,    bg: C.blueGlass                },
  notice:       { label: "Notice",       color: C.blue,    bg: C.blueGlass                },
  announcement: { label: "Announcement", color: C.blue,    bg: C.blueGlass                },
  event:        { label: "Event",        color: C.green,   bg: C.greenGlass               },
  exam:         { label: "Exam",         color: C.purple,  bg: C.purpleGlass              },
  fee:          { label: "Fee",          color: C.red,     bg: C.redGlass                 },
};

// Filter definitions for the notices card
const NOTICE_FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: "all",     label: "All"     },
  { key: "holiday", label: "Holiday" },
  { key: "event",   label: "Event"   },
  { key: "exam",    label: "Exam"    },
  { key: "fee",     label: "Fee"     },
  { key: "general", label: "General" },
];

const NoticeTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const key = (type || "notice").toLowerCase();
  const cfg = NOTICE_TYPE_META[key] ?? { label: type || "Notice", color: C.muted, bg: "rgba(100,116,139,0.1)" };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: "10px", height: 20, borderRadius: "5px" }}
    />
  );
};

const NoticeLegend: React.FC<{ notices: RecentNoticeItem[] }> = ({ notices }) => {
  const types = [...new Set(notices.map((n) => (n.notice_type || "notice").toLowerCase()))];
  if (types.length <= 1) return null;
  return (
    <Box sx={{ display: "flex", gap: 1.5, mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
      <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Legend:
      </Typography>
      {types.map((key) => {
        const cfg = NOTICE_TYPE_META[key] ?? { label: key, color: C.muted, bg: "rgba(100,116,139,0.1)" };
        return (
          <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: cfg.color, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, fontSize: "11px" }}>
              {cfg.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

const openRecentNoticeItem = (
  notice: RecentNoticeItem,
  navigate: ReturnType<typeof useNavigate>
) => {
  if (notice.item_type === "holiday") {
    navigate("/calendar/academic");
    return;
  }
  navigate(`/communication/notices/${notice.id}`);
};

// ─── Notices table ────────────────────────────────────────────────────────────
const NoticesTable: React.FC<{ notices: RecentNoticeItem[]; navigate: ReturnType<typeof useNavigate> }> = ({
  notices,
  navigate,
}) => {
  if (notices.length === 0)
    return (
      <Typography variant="body2" sx={{ color: C.muted, py: 3, textAlign: "center" }}>
        No recent notices published.
      </Typography>
    );

  const chipStyle = (p: string | null) => {
    const m: Record<string, [string, string]> = {
      High: ["#FEF2F2", C.red],
      Medium: ["#FFFBEB", C.amber],
      Low: ["#F0FDF4", C.green],
      Normal: ["#EFF6FF", C.blue],
    };
    const [bg, col] = m[p || "Normal"] || m["Normal"];
    return { bgcolor: bg, color: col };
  };

  return (
    <>
      <NoticeLegend notices={notices} />
      <Table size="small">
        <TableHead>
          <TableRow>
            {["Title", "Type", "Date", "Priority", ""].map((h) => (
              <TableCell
                key={h}
                sx={{ fontWeight: 700, color: C.muted, fontSize: "11px", borderBottom: `1px solid ${C.border}`, py: 1 }}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {notices.map((n) => (
            <TableRow key={`${n.item_type ?? "notice"}_${n.id}`} sx={{ "& td": { borderBottom: `1px solid ${C.border}`, py: 1.2 }, "&:last-child td": { borderBottom: 0 } }}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600, color: C.slateText, maxWidth: 200 }} noWrap>
                  {n.title}
                </Typography>
              </TableCell>
              <TableCell>
                <NoticeTypeBadge type={n.notice_type} />
              </TableCell>
              <TableCell>
                <Typography variant="caption" sx={{ color: C.muted }}>{n.published_at || "—"}</Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={n.priority || "Normal"}
                  size="small"
                  sx={{ ...chipStyle(n.priority), fontWeight: 700, fontSize: "11px", height: 20, borderRadius: "5px" }}
                />
              </TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  onClick={() => openRecentNoticeItem(n, navigate)}
                  sx={{ color: C.blue, fontWeight: 700, fontSize: "11px", minWidth: 0, px: 1, textTransform: "none" }}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

// ─── Notices card content with type filter (reusable across all role views) ──
const NoticesCardContent: React.FC<{
  notices: RecentNoticeItem[];
  navigate: ReturnType<typeof useNavigate>;
}> = ({ notices, navigate }) => {
  const [activeFilter, setActiveFilter] = React.useState("all");

  // Only show tabs for types that actually exist in the data, plus "All"
  const presentTypes = React.useMemo(
    () => new Set(notices.map((n) => (n.notice_type || "general").toLowerCase())),
    [notices]
  );
  const visibleTabs = NOTICE_FILTER_TABS.filter(
    (t) => t.key === "all" || presentTypes.has(t.key)
  );

  const filtered =
    activeFilter === "all"
      ? notices
      : notices.filter((n) => (n.notice_type || "general").toLowerCase() === activeFilter);

  return (
    <>
      {/* Type filter chips */}
      {visibleTabs.length > 1 && (
        <Box sx={{ display: "flex", gap: 0.75, mb: 2, flexWrap: "wrap" }}>
          {visibleTabs.map((tab) => {
            const meta = NOTICE_TYPE_META[tab.key];
            const isActive = activeFilter === tab.key;
            const activeColor = meta?.color ?? C.blue;
            return (
              <Chip
                key={tab.key}
                label={tab.key === "holiday" ? `🏖 ${tab.label}` : tab.label}
                size="small"
                onClick={() => setActiveFilter(tab.key)}
                sx={{
                  height: 24,
                  fontSize: "11px",
                  fontWeight: 700,
                  borderRadius: "7px",
                  cursor: "pointer",
                  bgcolor: isActive ? activeColor : "transparent",
                  color: isActive ? "#fff" : C.muted,
                  border: `1.5px solid ${isActive ? activeColor : C.border}`,
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: isActive ? activeColor : meta?.bg ?? C.blueGlass,
                    color: isActive ? "#fff" : meta?.color ?? C.blue,
                    borderColor: meta?.color ?? C.blue,
                  },
                }}
              />
            );
          })}
          <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, alignSelf: "center", ml: 0.5 }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
      )}
      <NoticesTable notices={filtered} navigate={navigate} />
    </>
  );
};

// ─── Welcome banner ───────────────────────────────────────────────────────────
const WelcomeBanner: React.FC<{
  name: string;
  tenantName?: string;
  lastLoginLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
}> = ({ name, tenantName, lastLoginLabel, refreshing, onRefresh }) => {
  const hr = new Date().getHours();
  const greet =
    hr < 12
      ? { text: "Good morning", icon: <SunriseIcon sx={{ color: "#FDE68A", fontSize: 28 }} />, sub: "Have a productive day!" }
      : hr < 17
        ? { text: "Good afternoon", icon: <SunIcon sx={{ color: "#FCD34D", fontSize: 28 }} />, sub: "Keep up the great work!" }
        : { text: "Good evening", icon: <MoonIcon sx={{ color: "#C4B5FD", fontSize: 28 }} />, sub: "Hope your day went well." };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <Box
      sx={{
        mb: 3.5,
        borderRadius: "24px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 20px 60px -15px rgba(15,23,42,0.55)",
        background: "linear-gradient(135deg, #0D1B3E 0%, #1A2F6E 45%, #1E40AF 100%)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(ellipse 55% 120% at 100% 50%, rgba(99,102,241,0.28) 0%, transparent 60%)",
            "radial-gradient(ellipse 40% 80% at 15% 0%, rgba(96,165,250,0.18) 0%, transparent 55%)",
          ].join(", "),
          pointerEvents: "none",
        },
      }}
    >
      {/* top shimmer line */}
      <Box sx={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent 0%, #60A5FA 30%, #A78BFA 60%, #34D399 80%, transparent 100%)",
      }} />

      {/* decorative circle */}
      <Box sx={{
        position: "absolute", right: -60, top: "50%", transform: "translateY(-50%)",
        width: 340, height: 340, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <Box sx={{
        position: "relative", zIndex: 1,
        px: { xs: 3, md: 5 }, py: { xs: 3, md: 3.5 },
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: { xs: "flex-start", md: "center" },
        gap: { xs: 2.5, md: 0 },
      }}>

        {/* ── Left: greeting ── */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 2 }}>
          {/* icon bubble */}
          <Box sx={{
            flexShrink: 0,
            width: 62, height: 62,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "18px",
            background: "rgba(255,255,255,0.1)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}>
            {greet.icon}
          </Box>
          <Box>
            <Typography sx={{
              fontSize: { xs: "1.5rem", md: "1.75rem" },
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#fff",
            }}>
              {greet.text},{" "}
              <Box component="span" sx={{
                background: "linear-gradient(90deg, #93C5FD, #C4B5FD)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {firstName}
              </Box>
              {" "}
              <Box component="span" sx={{ display: "inline-block", animation: "waveHand 2s infinite", transformOrigin: "70% 70%" }}>
                👋
              </Box>
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", fontWeight: 500, mt: 0.4 }}>
              {today}
            </Typography>
          </Box>
        </Box>

        {/* ── Center: school name (only when we have it, hidden on mobile) ── */}
        {tenantName && (
          <Box sx={{
            display: { xs: "none", md: "flex" },
            flexShrink: 0,
            mx: 4,
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
            px: 4,
            py: 2,
            borderRadius: "16px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(12px)",
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SchoolIcon sx={{ fontSize: 20, color: "#93C5FD", opacity: 0.9 }} />
              <Typography sx={{
                fontSize: "1.2rem",
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: "linear-gradient(90deg, #FFFFFF 0%, #BFDBFE 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                whiteSpace: "nowrap",
              }}>
                {tenantName}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {greet.sub}
            </Typography>
          </Box>
        )}

        {/* ── Right: last login + live + refresh ── */}
        <Box sx={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: { xs: "flex-start", md: "flex-end" },
          gap: 1.25,
        }}>
          {/* last login */}
          <Box sx={{
            display: "inline-flex", alignItems: "center", gap: 0.75,
            px: 1.5, py: 0.6,
            borderRadius: "10px",
            bgcolor: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <AccessTimeIcon sx={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }} />
            <Typography sx={{ fontSize: "0.71rem", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
              Last login · {lastLoginLabel}
            </Typography>
          </Box>

          {/* live + refresh row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{
              display: "inline-flex", alignItems: "center", gap: 0.75,
              px: 1.5, py: 0.65,
              borderRadius: "999px",
              bgcolor: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(52,211,153,0.4)",
            }}>
              <Box sx={{
                width: 7, height: 7, borderRadius: "50%",
                bgcolor: "#34D399",
                boxShadow: "0 0 8px rgba(52,211,153,0.9)",
                animation: "pulseGreen 2s infinite",
              }} />
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: "#6EE7B7", letterSpacing: "0.1em" }}>
                LIVE
              </Typography>
            </Box>

            {refreshing && (
              <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
                Syncing…
              </Typography>
            )}

            <Tooltip title="Refresh dashboard">
              <IconButton
                onClick={onRefresh}
                disabled={refreshing}
                size="small"
                sx={{
                  width: 38, height: 38,
                  bgcolor: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.2)", transform: "rotate(180deg)" },
                  transition: "all 0.35s ease",
                }}
              >
                <RefreshIcon sx={{ fontSize: 18, animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const DashboardSkeleton: React.FC = () => (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3, mb: 3 }} />
    <Grid container spacing={3}>
      {[1, 2, 3, 4].map((i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: "20px" }} />
        </Grid>
      ))}
      <Grid item xs={12} md={7}>
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: "20px" }} />
      </Grid>
      <Grid item xs={12} md={5}>
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: "20px" }} />
      </Grid>
    </Grid>
  </Container>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
interface AdminViewProps {
  data: AdminDashboardData;
  attFilter: SectionDateFilter;
  feeFilter: SectionDateFilter;
  onAttFilterChange: (f: SectionDateFilter) => void;
  onFeeFilterChange: (f: SectionDateFilter) => void;
  /** Override from fast attendance endpoint — replaces data.attendance_overview when set */
  attOverride?: AttendanceOverview | null;
  attCardLoading?: boolean;
  /** Override from fast fees endpoint — replaces data.fee_collection when set */
  feeOverride?: FeeCollectionSummary | null;
  feeCardLoading?: boolean;
  classes: Array<{ id: number; name: string }>;
  selectedClassId: number | "";
  onClassChange: (classId: number | "") => void;
}

const AdminDashboardView: React.FC<AdminViewProps> = ({
  data,
  attFilter,
  feeFilter,
  onAttFilterChange,
  onFeeFilterChange,
  attOverride,
  attCardLoading = false,
  feeOverride,
  feeCardLoading = false,
  classes,
  selectedClassId,
  onClassChange,
}) => {
  const navigate = useNavigate();

  // Use fast-endpoint override if available, fall back to full-load data
  const attData = attOverride ?? data.attendance_overview;
  const { present, absent, half_day, leave } = attData;
  const totalAtt = present + absent + half_day + leave;
  const attPct = totalAtt > 0 ? ((present + half_day * 0.5) / totalAtt) * 100 : 0;

  const feeData = feeOverride ?? data.fee_collection;
  const { total_fee, total_paid, total_balance } = feeData;
  const feePct = total_fee > 0 ? (total_paid / total_fee) * 100 : 0;
  const totalLeads = data.lead_pipeline.reduce((a, c) => a + c.count, 0);

  const fmtINR = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getLeadIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("new") || s.includes("lead")) return <StarIcon sx={{ fontSize: 14 }} />;
    if (s.includes("contact") || s.includes("call")) return <CallIcon sx={{ fontSize: 14 }} />;
    if (s.includes("visit") || s.includes("tour") || s.includes("qualif") || s.includes("evalu")) return <AssignmentIndIcon sx={{ fontSize: 14 }} />;
    if (s.includes("enroll") || s.includes("admit") || s.includes("won") || s.includes("convert")) return <PresentIcon sx={{ fontSize: 14 }} />;
    if (s.includes("lost") || s.includes("drop")) return <AbsentIcon sx={{ fontSize: 14 }} />;
    if (s.includes("applic") || s.includes("submit")) return <HomeworkIcon sx={{ fontSize: 14 }} />;
    return <ContactPhoneIcon sx={{ fontSize: 14 }} />;
  };

  const quickActions = [
    {
      label: "Mark Attendance",
      desc: "Register today's student lists",
      icon: <AttendanceIcon />,
      color: C.blue,
      bg: C.blueGlass,
      path: "/attendance/mark",
    },
    {
      label: "Collect Payment",
      desc: "View and manage invoices",
      icon: <FeeIcon />,
      color: C.green,
      bg: C.greenGlass,
      path: "/fees/invoices",
    },
    {
      label: "Lead Pipeline",
      desc: "View new student admissions",
      icon: <PeopleIcon />,
      color: "#14B8A6",
      bg: "rgba(20,184,166,0.08)",
      path: "/admissions/leads",
    },
    {
      label: "Issue Notice",
      desc: "Publish system broadcasts",
      icon: <NoticeIcon />,
      color: C.red,
      bg: C.redGlass,
      path: "/communication/notices/new",
    },
  ];

  const ADMIN_KPI_DEFAULT     = ["admin_students", "admin_classes", "admin_fees", "admin_balance"];
  const ADMIN_SECTIONS_DEFAULT = ["notices", "attendance_fee", "leads", "quick_actions"];

  const kpiSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [kpiOrder, setKpiOrder] = useSectionOrder("admin_kpi_order", ADMIN_KPI_DEFAULT);
  function handleKpiDrag(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id)
      setKpiOrder(arrayMove(kpiOrder, kpiOrder.indexOf(String(active.id)), kpiOrder.indexOf(String(over.id))));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [sectionOrder, setSectionOrder] = useSectionOrder("admin_dash_order", ADMIN_SECTIONS_DEFAULT);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setSectionOrder(arrayMove(sectionOrder, sectionOrder.indexOf(String(active.id)), sectionOrder.indexOf(String(over.id))));
    }
  }

  const renderAdminSection = (id: string) => {
    switch (id) {
      case "notices":
        return (
          <SortableSection key={id} id={id}>
            <GCard>
              <CardContent sx={{ p: 3 }}>
                <CardHeader
                  title="Recent Notices & Holidays"
                  icon={<NoticeIcon color="error" sx={{ fontSize: 20 }} />}
                  action={
                    <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/communication/notices")}
                      sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                      View All
                    </Button>
                  }
                />
                <NoticesCardContent notices={data.recent_notices} navigate={navigate} />
              </CardContent>
            </GCard>
          </SortableSection>
        );

      case "attendance_fee":
        return (
          <SortableSection key={id} id={id}>
            <Grid container spacing={3}>
              {/* Attendance Overview */}
              <Grid item xs={12} md={7}>
                <GCard sx={{ height: "100%" }}>
                  <CardContent sx={{ p: 3 }}>
                    <CardHeader
                      title="Attendance Overview"
                      icon={<AttendanceIcon color="primary" sx={{ fontSize: 20 }} />}
                      action={
                        <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/attendance/report")}
                          sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                          View Details
                        </Button>
                      }
                      dateFilter={
                        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", width: "100%" }}>
                          <CardDateFilter value={attFilter} onChange={onAttFilterChange} />
                          <TextField select size="small" value={selectedClassId}
                            onChange={(e) => onClassChange(e.target.value as number | "")}
                            SelectProps={{ displayEmpty: true }}
                            sx={{
                              minWidth: 130,
                              "& .MuiOutlinedInput-root": {
                                height: 26, fontSize: "11px", fontWeight: 700, borderRadius: "6px",
                                bgcolor: C.blueGlass, color: C.slateText,
                                "& fieldset": { borderColor: "rgba(37,99,235,0.18)" },
                                "&:hover fieldset": { borderColor: C.blue },
                                "&.Mui-focused fieldset": { borderColor: C.blue },
                              },
                            }}
                          >
                            <MenuItem value="" sx={{ fontSize: "11px", fontWeight: 700, color: C.muted }}>All Classes</MenuItem>
                            {classes.map((cls) => (
                              <MenuItem key={cls.id} value={cls.id} sx={{ fontSize: "11px", fontWeight: 700 }}>{cls.name}</MenuItem>
                            ))}
                          </TextField>
                        </Box>
                      }
                    />
                    {attCardLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.blueGlass}`, borderTopColor: C.blue, animation: "spin 0.8s linear infinite" }} />
                          <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600 }}>Loading attendance…</Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <AttRing pct={attPct} size={140} color={attPct >= 75 ? C.green : C.amber} gradId="adminAttGrad" />
                        <Grid container spacing={1.5} sx={{ flex: 1, minWidth: 160 }}>
                          {[
                            { label: "Present",  value: present,  color: C.green, bg: C.greenGlass },
                            { label: "Absent",   value: absent,   color: C.red,   bg: C.redGlass   },
                            { label: "Half Day", value: half_day, color: C.amber, bg: C.amberGlass },
                            { label: "On Leave", value: leave,    color: C.blue,  bg: C.blueGlass  },
                          ].map((item) => (
                            <Grid item xs={6} key={item.label}>
                              <Box sx={{ p: 1.5, bgcolor: item.bg, borderRadius: "12px", borderLeft: `3px solid ${item.color}` }}>
                                <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, textTransform: "uppercase", display: "block", fontSize: "10px" }}>
                                  {item.label}
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: item.color, mt: 0.3 }}>{item.value}</Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </CardContent>
                </GCard>
              </Grid>

              {/* Fee Collection Progress */}
              <Grid item xs={12} md={5}>
                <GCard sx={{ height: "100%" }}>
                  <CardContent sx={{ p: 3 }}>
                    <CardHeader
                      title="Fee Collection Progress"
                      icon={<FeeIcon color="success" sx={{ fontSize: 20 }} />}
                      action={
                        <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/fees/invoices")}
                          sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                          Collect Fee
                        </Button>
                      }
                      dateFilter={
                        <CardDateFilter value={feeFilter} onChange={onFeeFilterChange}
                          presets={[
                            { key: "week", label: "7 Days" },
                            { key: "month", label: "Month" },
                            { key: "custom", label: "Custom" },
                          ]}
                        />
                      }
                    />
                    {feeCardLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.greenGlass}`, borderTopColor: C.green, animation: "spin 0.8s linear infinite" }} />
                          <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600 }}>Loading fees…</Typography>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ mb: 2.5 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                            <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600 }}>Recovery Rate</Typography>
                            <Typography variant="body2" sx={{ color: C.green, fontWeight: 800 }}>{feePct.toFixed(1)}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={feePct}
                            sx={{ height: 10, borderRadius: 5, bgcolor: C.greenGlass,
                              "& .MuiLinearProgress-bar": { background: `linear-gradient(90deg, ${C.green}, #34D399)`, borderRadius: 5 } }}
                          />
                        </Box>
                        {[
                          { label: "Total Projected",  value: fmtINR(total_fee),     color: C.slateText, icon: <TrendIcon sx={{ fontSize: 16, color: C.slateText }} /> },
                          { label: "Total Collected",  value: fmtINR(total_paid),    color: C.green,     icon: <PresentIcon sx={{ fontSize: 16, color: C.green }} /> },
                          { label: "Total Outstanding",value: fmtINR(total_balance), color: C.red,       icon: <WarningIcon sx={{ fontSize: 16, color: C.red }} /> },
                        ].map((row) => (
                          <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              {row.icon}
                              <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600 }}>{row.label}</Typography>
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: row.color }}>{row.value}</Typography>
                          </Box>
                        ))}
                      </>
                    )}
                  </CardContent>
                </GCard>
              </Grid>
            </Grid>
          </SortableSection>
        );

      case "leads":
        return (
          <SortableSection key={id} id={id}>
            <GCard>
              <CardContent sx={{ p: 3 }}>
                <CardHeader
                  title="Admissions Lead Pipeline"
                  icon={<PersonAddIcon color="primary" sx={{ fontSize: 20 }} />}
                  action={
                    <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/admissions/leads")}
                      sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                      View All
                    </Button>
                  }
                />
                <Grid container spacing={2}>
                  {data.lead_pipeline.map((lp, i) => {
                    const pct = totalLeads > 0 ? (lp.count / totalLeads) * 100 : 0;
                    return (
                      <Grid item xs={12} sm={6} md={3} key={i}>
                        <Box sx={{
                          p: 2, borderRadius: "14px", border: `1.5px solid ${C.border}`,
                          transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
                          "&:hover": { borderColor: (lp.color_code || C.blue) + "45", bgcolor: (lp.color_code || C.blue) + "08",
                            transform: "translateY(-2px)", boxShadow: `0 4px 16px ${lp.color_code || C.blue}12` },
                        }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <Box sx={{ color: lp.color_code || C.blue, display: "flex", alignItems: "center" }}>
                                {getLeadIcon(lp.status)}
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: lp.color_code || C.slateText, fontSize: "12px" }}>
                                {lp.status}
                              </Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: lp.color_code || C.slateText }}>{lp.count}</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: C.muted, display: "block", mb: 1 }}>
                            {totalLeads > 0 ? `${pct.toFixed(0)}% of pipeline` : "0% of pipeline"}
                          </Typography>
                          <LinearProgress variant="determinate" value={pct}
                            sx={{ height: 4, borderRadius: 2, bgcolor: "rgba(0,0,0,0.04)",
                              "& .MuiLinearProgress-bar": { bgcolor: lp.color_code || C.blue, borderRadius: 2 } }}
                          />
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </GCard>
          </SortableSection>
        );

      case "quick_actions":
        return (
          <SortableSection key={id} id={id}>
            <GCard>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1"
                  sx={{ fontWeight: 800, color: C.slateText, mb: 2.5, display: "flex", alignItems: "center", gap: 1, letterSpacing: "-0.1px" }}>
                  <TrendIcon color="primary" sx={{ fontSize: 20 }} />
                  Quick Administrative Actions
                </Typography>
                <Grid container spacing={2}>
                  {quickActions.map((qa) => (
                    <Grid item xs={12} sm={6} md={3} key={qa.label}>
                      <Box onClick={() => navigate(qa.path)} sx={{
                        display: "flex", alignItems: "center", gap: 2, p: 2,
                        borderRadius: "14px", border: `1px solid ${C.border}`, cursor: "pointer",
                        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                        "&:hover": { bgcolor: qa.bg, borderColor: qa.color + "35", transform: "translateX(3px)", boxShadow: `0 4px 14px ${qa.color}12` },
                      }}>
                        <Avatar sx={{ bgcolor: qa.bg, color: qa.color, width: 44, height: 44, borderRadius: "12px", flexShrink: 0 }}>
                          {qa.icon}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: C.slateText, lineHeight: 1.3 }}>{qa.label}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted, lineHeight: 1.3, display: "block" }}>{qa.desc}</Typography>
                        </Box>
                        <ArrowIcon sx={{ color: C.muted, fontSize: 18, flexShrink: 0 }} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GCard>
          </SortableSection>
        );

      default:
        return null;
    }
  };

  const renderAdminKpi = (id: string) => {
    switch (id) {
      case "admin_students":
        return (
          <SnapCard title="Active Students" value={data.student_snapshot.active_students}
            icon={<PeopleIcon fontSize="small" />} accentColor={C.blue} glassBg={C.blueGlass}
            onClick={() => navigate("/students")}
            sub={<><Sparkline color={C.blue} delay={0} /><Typography variant="caption" sx={{ color: C.green, fontWeight: 700 }}>+2.5% since last week</Typography></>}
          />
        );
      case "admin_classes":
        return (
          <SnapCard title="Total Classes" value={data.student_snapshot.total_classes}
            icon={<SchoolIcon fontSize="small" />} accentColor={C.purple} glassBg={C.purpleGlass}
            sub={<><Sparkline color={C.purple} delay={0.2} /><Typography variant="caption" sx={{ color: C.green, fontWeight: 700 }}>+1.2% since last week</Typography></>}
          />
        );
      case "admin_fees":
        return (
          <SnapCard title="Collected Fees" value={fmtINR(total_paid)}
            icon={<MoneyIcon fontSize="small" />} accentColor={C.green} glassBg={C.greenGlass}
            onClick={() => navigate("/fees/report")}
            sub={
              <><Sparkline color={C.green} delay={0.4} />
                <Chip label={feePct >= 75 ? "On Track" : `${feePct.toFixed(0)}% Collected`} size="small"
                  sx={{ bgcolor: feePct >= 75 ? C.greenGlass : C.amberGlass, color: feePct >= 75 ? C.green : C.amber, fontWeight: 700, height: 18, fontSize: "11px", borderRadius: "5px" }} />
              </>
            }
          />
        );
      case "admin_balance":
        return (
          <SnapCard title="Pending Balance" value={fmtINR(total_balance)}
            icon={<WarningIcon fontSize="small" />} accentColor={C.red} glassBg={C.redGlass}
            sub={<><Sparkline color={C.red} delay={0.6} /><Typography variant="caption" sx={{ color: total_balance > 0 ? C.red : C.green, fontWeight: 700 }}>{total_balance > 0 ? "-4.8% since last week" : "All dues cleared ✓"}</Typography></>}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Grid container spacing={3}>
      {/* ─ Row 1: KPI snap cards — individually draggable ─ */}
      <Grid item xs={12}>
        <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDrag}>
          <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
            <Grid container spacing={3}>
              {kpiOrder.map((id) => (
                <Grid item xs={12} sm={6} md={3} key={id}>
                  <SortableSection id={id}>{renderAdminKpi(id)}</SortableSection>
                </Grid>
              ))}
            </Grid>
          </SortableContext>
        </DndContext>
      </Grid>

      {/* ─ Draggable sections ─ */}
      <Grid item xs={12}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {sectionOrder.map((id) => renderAdminSection(id))}
            </Box>
          </SortableContext>
        </DndContext>
      </Grid>
    </Grid>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TEACHER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
interface TeacherViewProps {
  data: TeacherDashboardData;
  attFilter: SectionDateFilter;
  onAttFilterChange: (f: SectionDateFilter) => void;
  attOverride?: AttendanceOverview | null;
  attCardLoading?: boolean;
  classes: Array<{ id: number; name: string }>;
  selectedClassId: number | "";
  onClassChange: (classId: number | "") => void;
}

const TEACHER_KPI_DEFAULT   = ["kpi_students", "kpi_att", "kpi_classes", "kpi_new"];
const TEACHER_CARDS_DEFAULT = ["card_att", "card_classes", "card_homework", "card_notices"];
const TEACHER_CARDS_SUBJECT = ["card_homework", "card_classes", "card_att", "card_notices"];

function aggregateTeacherDivisionStats(classes: TeacherDashboardData["assigned_classes"]) {
  const seen = new Set<string>();
  let students = 0;
  let boys = 0;
  let girls = 0;
  let newMonth = 0;
  classes.forEach((c) => {
    const key = `${c.class_id}-${c.division_id}`;
    if (seen.has(key)) return;
    seen.add(key);
    students += c.student_count;
    boys += c.boys_count;
    girls += c.girls_count;
    newMonth += c.new_this_month;
  });
  return { students, boys, girls, newMonth, divisions: seen.size };
}

const TeacherDashboardView: React.FC<TeacherViewProps> = ({
  data,
  attFilter,
  onAttFilterChange,
  attOverride,
  attCardLoading = false,
  classes,
  selectedClassId,
  onClassChange,
}) => {
  const navigate = useNavigate();

  const isSubjectFocused = data.dashboard_mode === "subject_focused";
  const canMarkAttendance = data.can_mark_attendance !== false && !isSubjectFocused;
  const subjectSlots = data.assigned_classes.filter((c) => c.designation === "Subject Teacher");
  const classTeacherSlots = data.assigned_classes.filter((c) => c.designation === "Class Teacher");
  const divisionStats = aggregateTeacherDivisionStats(data.assigned_classes);

  // ── KPI cards — individually draggable (grid) ──────────────────────────────
  const kpiSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [kpiOrder, setKpiOrder] = useSectionOrder("teacher_kpi_v2", TEACHER_KPI_DEFAULT);
  function handleKpiDrag(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id)
      setKpiOrder(arrayMove(kpiOrder, kpiOrder.indexOf(String(active.id)), kpiOrder.indexOf(String(over.id))));
  }

  // ── Main cards — each individually draggable (vertical list) ───────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [cardOrder, setCardOrder] = useSectionOrder(
    "teacher_cards_v3",
    isSubjectFocused ? TEACHER_CARDS_SUBJECT : TEACHER_CARDS_DEFAULT
  );
  function handleCardDrag(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id)
      setCardOrder(arrayMove(cardOrder, cardOrder.indexOf(String(active.id)), cardOrder.indexOf(String(over.id))));
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const attData = attOverride ?? data.today_attendance;
  const { present, absent, half_day, leave } = attData;
  const totalAtt  = present + absent + half_day + leave;
  const attPct    = totalAtt > 0 ? ((present + half_day * 0.5) / totalAtt) * 100 : 0;

  const totalStudents  = divisionStats.students;
  const totalBoys      = divisionStats.boys;
  const totalGirls     = divisionStats.girls;
  const newThisMonth   = divisionStats.newMonth;
  const totalClasses   = isSubjectFocused
    ? subjectSlots.length
    : classTeacherSlots.length || divisionStats.divisions;

  // ── KPI renderer ───────────────────────────────────────────────────────────
  const renderKpi = (id: string) => {
    switch (id) {
      case "kpi_students":
        return (
          <SnapCard title="My Students" value={totalStudents} icon={<PeopleIcon fontSize="small" />}
            accentColor={C.purple} glassBg={C.purpleGlass} onClick={() => navigate("/students")}
            sub={
              <>
                <Sparkline color={C.purple} delay={0} />
                <Box
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  sx={{
                    display: "flex",
                    gap: 1,
                    flexWrap: "wrap",
                    alignItems: "center",
                    mt: 0.25,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <GenderCountChip tooltip="Boys" count={totalBoys} variant="boys" />
                  <GenderCountChip tooltip="Girls" count={totalGirls} variant="girls" />
                </Box>
              </>
            }
          />
        );
      case "kpi_att":
        return (
          <SnapCard title="Present Today" value={`${present}/${totalAtt || "—"}`}
            icon={<AttendanceIcon fontSize="small" />}
            accentColor={attPct >= 80 ? C.green : C.amber}
            glassBg={attPct >= 80 ? C.greenGlass : C.amberGlass}
            onClick={() => navigate("/attendance/mark")}
            sub={
              <>
                <Sparkline color={attPct >= 80 ? C.green : C.amber} delay={0.2} />
                <Chip
                  label={totalAtt === 0 ? "Not marked yet" : `${attPct.toFixed(0)}% attendance`}
                  size="small"
                  sx={{
                    bgcolor: attPct >= 80 ? C.greenGlass : C.amberGlass,
                    color: attPct >= 80 ? C.green : C.amber,
                    fontWeight: 700, height: 18, fontSize: "11px", borderRadius: "5px",
                  }}
                />
              </>
            }
          />
        );
      case "kpi_classes":
        return (
          <SnapCard
            title={isSubjectFocused ? "My Subjects" : "My Classes"}
            value={totalClasses}
            icon={isSubjectFocused ? <SubjectIcon fontSize="small" /> : <ClassIcon fontSize="small" />}
            accentColor={C.blue}
            glassBg={C.blueGlass}
            onClick={() => navigate(isSubjectFocused ? "/homework" : "/students")}
            sub={
              <>
                <Sparkline color={C.blue} delay={0.4} />
                <Typography variant="caption" sx={{ color: C.blue, fontWeight: 700 }}>
                  {isSubjectFocused
                    ? `${subjectSlots.length} subject assignment${subjectSlots.length === 1 ? "" : "s"}`
                    : "Assigned to you"}
                </Typography>
              </>
            }
          />
        );
      case "kpi_new":
        return (
          <SnapCard title="New This Month" value={newThisMonth} icon={<PersonAddIcon fontSize="small" />}
            accentColor={C.green} glassBg={C.greenGlass}
            sub={
              <>
                <Sparkline color={C.green} delay={0.6} />
                <Typography variant="caption" sx={{ color: C.green, fontWeight: 700 }}>
                  {newThisMonth > 0 ? "Students enrolled this month" : "No new enrollments yet"}
                </Typography>
              </>
            }
          />
        );
      default:
        return null;
    }
  };

  // ── Card content renderer (SortableSection is applied in the return loop) ──
  const renderCardContent = (id: string) => {
    switch (id) {

      // ── Attendance (compact) ───────────────────────────────────────────────
      case "card_att":
        return (
          <GCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <CardHeader
                title={isSubjectFocused ? "Division Attendance" : "Today's Attendance"}
                icon={<AttendanceIcon color="primary" sx={{ fontSize: 18 }} />}
                action={
                  canMarkAttendance ? (
                    <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/attendance/mark")}
                      sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 11 }}>
                      Mark
                    </Button>
                  ) : null
                }
                dateFilter={
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <CardDateFilter value={attFilter} onChange={onAttFilterChange}
                      presets={[
                        { key: "today",  label: "Today"  },
                        { key: "week",   label: "7 Days" },
                        { key: "custom", label: "Custom" },
                      ]}
                    />
                    {classes.length > 0 && (
                      <TextField select size="small" value={selectedClassId}
                        onChange={(e) => onClassChange(e.target.value as number | "")}
                        SelectProps={{ displayEmpty: true }}
                        sx={{
                          minWidth: 105,
                          "& .MuiOutlinedInput-root": {
                            height: 24, fontSize: "10px", fontWeight: 700, borderRadius: "6px",
                            bgcolor: C.blueGlass, color: C.slateText,
                            "& fieldset": { borderColor: "rgba(37,99,235,0.18)" },
                            "&:hover fieldset": { borderColor: C.blue },
                          },
                        }}>
                        <MenuItem value="" sx={{ fontSize: "11px" }}>All Classes</MenuItem>
                        {classes.map((c) => <MenuItem key={c.id} value={c.id} sx={{ fontSize: "11px" }}>{c.name}</MenuItem>)}
                      </TextField>
                    )}
                  </Box>
                }
              />
              {attCardLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${C.blueGlass}`, borderTopColor: C.blue, animation: "spin 0.8s linear infinite" }} />
                </Box>
              ) : totalAtt === 0 ? (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <AttendanceIcon sx={{ fontSize: 36, color: C.muted, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600, mb: 1.5, fontSize: "12px" }}>
                    {isSubjectFocused
                      ? "Attendance not marked yet for your division."
                      : "Not marked yet."}
                  </Typography>
                  {canMarkAttendance && (
                    <Button variant="contained" size="small" onClick={() => navigate("/attendance/mark")}
                      sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, bgcolor: C.blue, boxShadow: "none", fontSize: "11px" }}>
                      Mark Now
                    </Button>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mt: 1 }}>
                  <AttRing pct={attPct} size={96} color={attPct >= 80 ? C.green : C.amber} gradId="teacherAttRing" />
                  <Grid container spacing={1} sx={{ flex: 1 }}>
                    {[
                      { label: "Present",  value: present,  color: C.green, bg: C.greenGlass },
                      { label: "Absent",   value: absent,   color: C.red,   bg: C.redGlass   },
                      { label: "Half Day", value: half_day, color: C.amber, bg: C.amberGlass },
                      { label: "On Leave", value: leave,    color: C.blue,  bg: C.blueGlass  },
                    ].map((s) => (
                      <Grid item xs={6} key={s.label}>
                        <Box sx={{ p: 1, bgcolor: s.bg, borderRadius: "10px", borderLeft: `3px solid ${s.color}` }}>
                          <Typography sx={{ fontSize: "9px", color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            {s.label}
                          </Typography>
                          <Typography sx={{ fontWeight: 900, color: s.color, fontSize: "1.2rem", lineHeight: 1.2 }}>{s.value}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </GCard>
        );

      // ── My Classes (compact) ───────────────────────────────────────────────
      case "card_classes":
        return (
          <GCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <CardHeader
                title={isSubjectFocused ? "My Teaching Assignments" : "My Classes"}
                icon={isSubjectFocused ? <SubjectIcon color="primary" sx={{ fontSize: 18 }} /> : <ClassIcon color="primary" sx={{ fontSize: 18 }} />}
                action={
                  <Button
                    size="small"
                    endIcon={<ArrowIcon />}
                    onClick={() => navigate(isSubjectFocused ? "/homework" : "/students")}
                    sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 11 }}
                  >
                    {isSubjectFocused ? "Homework" : "Students"}
                  </Button>
                }
              />
              {data.assigned_classes.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <SchoolIcon sx={{ fontSize: 36, color: C.muted, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: C.muted, fontSize: "12px", fontWeight: 600 }}>
                    No assignments yet.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                  {data.assigned_classes.map((cls, i) => {
                    const isClassTeacher = cls.designation === "Class Teacher";
                    const accent = isClassTeacher ? C.green : C.purple;
                    const accentGlass = isClassTeacher ? C.greenGlass : C.purpleGlass;
                    return (
                      <Box
                        key={`${cls.class_id}-${cls.division_id}-${cls.subject_id ?? "ct"}-${i}`}
                        onClick={() => navigate(isClassTeacher ? "/students" : "/homework")}
                        sx={{
                          display: "flex", alignItems: "center", gap: 1.5, p: 1.25,
                          borderRadius: "12px", border: `1px solid ${C.border}`, cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": { bgcolor: accentGlass, borderColor: accent + "35", transform: "translateX(2px)" },
                        }}
                      >
                        <Avatar sx={{ bgcolor: accentGlass, color: accent, width: 36, height: 36, borderRadius: "10px", flexShrink: 0 }}>
                          {isClassTeacher ? <SchoolIcon sx={{ fontSize: 16 }} /> : <SubjectIcon sx={{ fontSize: 16 }} />}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            <Typography sx={{ fontWeight: 800, color: C.slateText, fontSize: "12px", lineHeight: 1.3 }}>
                              {cls.class_name} — {cls.division_name}
                            </Typography>
                            <Chip
                              label={cls.designation || "Class Teacher"}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "9px",
                                fontWeight: 800,
                                bgcolor: accentGlass,
                                color: accent,
                              }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ color: C.muted, fontSize: "10px", display: "block" }}>
                            {cls.subject_name
                              ? `Subject: ${cls.subject_name}`
                              : "All subjects (class in-charge)"}
                            {" · "}
                            {cls.student_count} students · ♂{cls.boys_count} ♀{cls.girls_count}
                            {cls.new_this_month > 0 && ` · +${cls.new_this_month} new`}
                          </Typography>
                        </Box>
                        <ArrowIcon sx={{ color: C.muted, fontSize: 15, flexShrink: 0 }} />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </GCard>
        );

      // ── Homework list ──────────────────────────────────────────────────────
      case "card_homework": {
        const hw = data.recent_homework ?? [];
        return (
          <GCard>
            <CardContent sx={{ p: 3 }}>
              <CardHeader
                title={isSubjectFocused ? "My Subject Homework" : "Homework"}
                icon={<HomeworkIcon color="primary" sx={{ fontSize: 20 }} />}
                action={
                  <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/homework/assign")}
                    sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                    + Assign
                  </Button>
                }
              />
              {hw.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <HomeworkIcon sx={{ fontSize: 44, color: C.muted, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600, mb: 2 }}>
                    No homework assigned yet.
                  </Typography>
                  <Button variant="contained" size="small" onClick={() => navigate("/homework/assign")}
                    sx={{ borderRadius: "9px", textTransform: "none", fontWeight: 700, bgcolor: C.blue, boxShadow: "none" }}>
                    Assign Now
                  </Button>
                </Box>
              ) : (
                <Box sx={{ mt: 1 }}>
                  {/* Header row */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", gap: 1, px: 1.5, mb: 0.75 }}>
                    {["Title / Subject", "Class", "Due Date", "Status"].map((h) => (
                      <Typography key={h} sx={{ fontSize: "10px", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        {h}
                      </Typography>
                    ))}
                  </Box>
                  {/* Rows */}
                  {hw.map((item, i) => {
                    const isDraft = item.status?.toLowerCase() === "draft";
                    return (
                      <Box key={item.id} onClick={() => navigate("/homework")} sx={{
                        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", gap: 1,
                        px: 1.5, py: 1.2, borderRadius: "10px", cursor: "pointer", alignItems: "center",
                        borderBottom: i < hw.length - 1 ? `1px solid ${C.border}` : "none",
                        "&:hover": { bgcolor: C.blueGlass },
                      }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, color: C.slateText, fontSize: "13px" }} noWrap>
                            {item.title}
                          </Typography>
                          {item.subject_name && (
                            <Typography variant="caption" sx={{ color: C.muted, fontSize: "11px" }}>
                              {item.subject_name}
                            </Typography>
                          )}
                        </Box>
                        <Typography sx={{ fontSize: "12px", color: C.slateText, fontWeight: 600 }} noWrap>
                          {item.class_name}{item.division_name ? ` — ${item.division_name}` : ""}
                        </Typography>
                        <Typography sx={{ fontSize: "12px", color: C.muted }}>
                          {item.submission_date ?? "—"}
                        </Typography>
                        <Chip
                          label={item.status}
                          size="small"
                          sx={{
                            bgcolor: isDraft ? C.amberGlass : C.greenGlass,
                            color: isDraft ? C.amber : C.green,
                            fontWeight: 700, fontSize: "10px", borderRadius: "6px", height: 20,
                          }}
                        />
                      </Box>
                    );
                  })}
                  <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end" }}>
                    <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/homework")}
                      sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 11 }}>
                      View All
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </GCard>
        );
      }

      // ── Notices & Holidays (full-width) ───────────────────────────────────
      case "card_notices":
        return (
          <GCard>
            <CardContent sx={{ p: 3 }}>
              <CardHeader
                title="Recent Notices & Holidays"
                icon={<NoticeIcon color="error" sx={{ fontSize: 20 }} />}
                action={
                  <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/communication/notices")}
                    sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                    View All
                  </Button>
                }
              />
              <NoticesCardContent notices={data.recent_notices} navigate={navigate} />
            </CardContent>
          </GCard>
        );

      default:
        return null;
    }
  };

  return (
    <Grid container spacing={3}>
      {isSubjectFocused && (
        <Grid item xs={12}>
          <Alert severity="info" sx={{ borderRadius: "12px", fontSize: "0.85rem" }}>
            You are logged in as a <strong>subject teacher</strong>. Homework and assignments are scoped to your
            subjects. When you are assigned as a <strong>class teacher</strong>, this dashboard expands automatically
            (all subjects, attendance marking, and full class view).
          </Alert>
        </Grid>
      )}
      {!isSubjectFocused && classTeacherSlots.length > 0 && subjectSlots.length > 0 && (
        <Grid item xs={12}>
          <Alert severity="success" sx={{ borderRadius: "12px", fontSize: "0.85rem" }}>
            You have both <strong>class teacher</strong> and <strong>subject teacher</strong> roles. Class in-charge
            divisions show all subjects; subject rows are limited to that subject.
          </Alert>
        </Grid>
      )}
      {/* ── Row 1: KPI snap cards — individually draggable ── */}
      <Grid item xs={12}>
        <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDrag}>
          <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
            <Grid container spacing={3}>
              {kpiOrder.map((id) => (
                <Grid item xs={12} sm={6} md={3} key={id}>
                  <SortableSection id={id}>{renderKpi(id)}</SortableSection>
                </Grid>
              ))}
            </Grid>
          </SortableContext>
        </DndContext>
      </Grid>

      {/* ── Main cards — 2-column grid, each individually draggable ── */}
      <Grid item xs={12}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCardDrag}>
          <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
              {cardOrder.map((id) => (
                <SortableSection
                  key={id}
                  id={id}
                  sx={{ gridColumn: (id === "card_notices" || id === "card_homework") ? "1 / -1" : "auto" }}
                >
                  {renderCardContent(id)}
                </SortableSection>
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      </Grid>
    </Grid>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const STUDENT_KPI_DEFAULT  = ["s_kpi_att", "s_kpi_present", "s_kpi_hw", "s_kpi_fees"];
const STUDENT_CARDS_DEFAULT = ["s_att", "s_fee", "s_homework", "s_notices"];

const StudentDashboardView: React.FC<{ data: StudentDashboardData }> = ({ data }) => {
  const navigate = useNavigate();
  const { profile, attendance, fee_status, class_teacher, homework, recent_notices } = data;
  const { total_fee, total_paid, total_balance, is_overdue, next_due_date } = fee_status;
  const feePct = total_fee > 0 ? (total_paid / total_fee) * 100 : 0;
  const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const kpiSensors  = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const cardSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [kpiOrder,  setKpiOrder]  = useSectionOrder("student_kpi_order",   STUDENT_KPI_DEFAULT);
  const [cardOrder, setCardOrder] = useSectionOrder("student_cards_order", STUDENT_CARDS_DEFAULT);

  function handleKpiDrag(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id)
      setKpiOrder(arrayMove(kpiOrder, kpiOrder.indexOf(String(active.id)), kpiOrder.indexOf(String(over.id))));
  }
  function handleCardDrag(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id)
      setCardOrder(arrayMove(cardOrder, cardOrder.indexOf(String(active.id)), cardOrder.indexOf(String(over.id))));
  }

  const renderKpi = (id: string) => {
    const totalDays = attendance.present + attendance.absent;
    switch (id) {
      case "s_kpi_att":
        return (
          <SnapCard
            title="Attendance"
            value={`${attendance.percentage.toFixed(0)}%`}
            icon={<AttendanceIcon fontSize="small" />}
            accentColor={attendance.percentage >= 75 ? C.green : C.red}
            glassBg={attendance.percentage >= 75 ? C.greenGlass : C.redGlass}
            onClick={() => navigate("/attendance/report")}
            sub={
              <>
                <Sparkline color={attendance.percentage >= 75 ? C.green : C.red} delay={0} />
                <Chip
                  label={attendance.percentage >= 75 ? "On Track" : "Needs Improvement"}
                  size="small"
                  sx={{
                    bgcolor: attendance.percentage >= 75 ? C.greenGlass : C.redGlass,
                    color: attendance.percentage >= 75 ? C.green : C.red,
                    fontWeight: 700, height: 18, fontSize: "11px", borderRadius: "5px",
                  }}
                />
              </>
            }
          />
        );
      case "s_kpi_present":
        return (
          <SnapCard
            title="Present Days"
            value={String(attendance.present)}
            icon={<PresentIcon fontSize="small" />}
            accentColor={C.green}
            glassBg={C.greenGlass}
            onClick={() => navigate("/attendance/report")}
            sub={
              <>
                <Sparkline color={C.green} delay={0.2} />
                <Typography variant="caption" sx={{ color: C.green, fontWeight: 700 }}>
                  of {totalDays} school days
                </Typography>
              </>
            }
          />
        );
      case "s_kpi_hw":
        return (
          <SnapCard
            title="Pending HW"
            value={String(homework.pending_count)}
            icon={<HomeworkIcon fontSize="small" />}
            accentColor={homework.pending_count > 0 ? C.amber : C.green}
            glassBg={homework.pending_count > 0 ? C.amberGlass : C.greenGlass}
            onClick={() => navigate("/homework")}
            sub={
              <>
                <Sparkline color={homework.pending_count > 0 ? C.amber : C.green} delay={0.4} />
                <Chip
                  label={homework.pending_count === 0 ? "All Done ✓" : `${homework.pending_count} assignment${homework.pending_count !== 1 ? "s" : ""}`}
                  size="small"
                  sx={{
                    bgcolor: homework.pending_count > 0 ? C.amberGlass : C.greenGlass,
                    color: homework.pending_count > 0 ? C.amber : C.green,
                    fontWeight: 700, height: 18, fontSize: "11px", borderRadius: "5px",
                  }}
                />
              </>
            }
          />
        );
      case "s_kpi_fees":
        return (
          <SnapCard
            title="Fee Balance"
            value={fmtINR(total_balance)}
            icon={<FeeIcon fontSize="small" />}
            accentColor={total_balance > 0 ? C.red : C.green}
            glassBg={total_balance > 0 ? C.redGlass : C.greenGlass}
            onClick={() => navigate("/fees/student-ledger")}
            sub={
              <>
                <Sparkline color={total_balance > 0 ? C.red : C.green} delay={0.6} />
                <Chip
                  label={is_overdue ? "Dues Pending" : "Cleared ✓"}
                  size="small"
                  sx={{
                    bgcolor: is_overdue ? C.amberGlass : C.greenGlass,
                    color: is_overdue ? C.amber : C.green,
                    fontWeight: 700, height: 18, fontSize: "11px", borderRadius: "5px",
                  }}
                />
              </>
            }
          />
        );
      default: return null;
    }
  };

  const renderCard = (id: string) => {
    switch (id) {
      case "s_att":
        return (
          <SortableSection key={id} id={id}>
            <GCard>
              <CardContent sx={{ p: 3 }}>
                <CardHeader
                  title="My Attendance"
                  action={
                    <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/attendance/report")}
                      sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                      View History
                    </Button>
                  }
                />
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <AttRing
                    pct={attendance.percentage}
                    size={110}
                    color={attendance.percentage >= 75 ? C.green : C.red}
                    gradId="studAttGrad"
                  />
                </Box>
                <Grid container spacing={1}>
                  {[
                    { label: "Present", value: `${attendance.present} Days`, color: C.green, bg: C.greenGlass },
                    { label: "Absent",  value: `${attendance.absent} Days`,  color: C.red,   bg: C.redGlass  },
                  ].map((s) => (
                    <Grid item xs={6} key={s.label}>
                      <Box sx={{ p: 1, bgcolor: s.bg, borderRadius: "10px", textAlign: "center", borderLeft: `3px solid ${s.color}` }}>
                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, display: "block" }}>{s.label}</Typography>
                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 900, color: s.color }}>{s.value}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GCard>
          </SortableSection>
        );

      case "s_fee":
        return (
          <SortableSection key={id} id={id}>
            <GCard>
              <CardContent sx={{ p: 3 }}>
                <CardHeader
                  title="Fee Status"
                  action={
                    <Chip
                      label={is_overdue ? "Dues Pending" : "Cleared ✓"}
                      size="small"
                      sx={{ bgcolor: is_overdue ? C.amberGlass : C.greenGlass, color: is_overdue ? C.amber : C.green, fontWeight: 800, fontSize: "11px", height: 20, borderRadius: "5px" }}
                    />
                  }
                />
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                    <Typography variant="caption" sx={{ color: C.muted }}>Total: {fmtINR(total_fee)}</Typography>
                    <Typography variant="caption" sx={{ color: C.green, fontWeight: 800 }}>{feePct.toFixed(0)}% paid</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={feePct}
                    sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(0,0,0,0.04)",
                      "& .MuiLinearProgress-bar": { background: is_overdue ? `linear-gradient(90deg, ${C.amber}, #FCD34D)` : `linear-gradient(90deg, ${C.green}, #34D399)`, borderRadius: 4 } }} />
                </Box>
                <Divider sx={{ mb: 2 }} />
                {[
                  { label: "Total Fees", value: fmtINR(total_fee),      color: C.slateText },
                  { label: "Paid",       value: fmtINR(total_paid),     color: C.green },
                  { label: "Balance",    value: fmtINR(total_balance),  color: total_balance > 0 ? C.red : C.green },
                ].map((row) => (
                  <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                    <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600 }}>{row.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: row.color }}>{row.value}</Typography>
                  </Box>
                ))}
                {next_due_date && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: C.amberGlass, borderRadius: "8px", border: `1px solid rgba(217,119,6,0.2)` }}>
                    <Typography variant="caption" sx={{ color: C.amber, fontWeight: 700 }}>
                      Next Due: {fmtINR(total_balance)} by {next_due_date}
                    </Typography>
                  </Box>
                )}
                <Button variant="text" size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/fees/student-ledger")}
                  sx={{ mt: 2, color: C.blue, fontWeight: 700, textTransform: "none" }}>
                  View Details
                </Button>
              </CardContent>
            </GCard>
          </SortableSection>
        );

      case "s_homework":
        return (
          <SortableSection key={id} id={id} sx={{ gridColumn: "1 / -1" }}>
            <GCard>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Avatar sx={{ bgcolor: homework.pending_count > 0 ? C.amberGlass : C.greenGlass, color: homework.pending_count > 0 ? C.amber : C.green, width: 52, height: 52, borderRadius: "14px", flexShrink: 0 }}>
                    <HomeworkIcon sx={{ fontSize: 26 }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>Homework</Typography>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.25 }}>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: homework.pending_count > 0 ? C.amber : C.green, letterSpacing: "-1px", lineHeight: 1 }}>
                        {homework.pending_count}
                      </Typography>
                      <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600 }}>
                        {homework.pending_count === 0 ? "All assignments done — great going! 🎉" : `pending assignment${homework.pending_count !== 1 ? "s" : ""}`}
                      </Typography>
                    </Box>
                  </Box>
                  <Button variant="outlined" size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/homework")}
                    sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, borderColor: C.border, color: C.slateText, flexShrink: 0 }}>
                    View All
                  </Button>
                </Box>
              </CardContent>
            </GCard>
          </SortableSection>
        );

      case "s_notices":
        return (
          <SortableSection key={id} id={id} sx={{ gridColumn: "1 / -1" }}>
            <GCard>
              <CardContent sx={{ p: 3 }}>
                <CardHeader
                  title="Latest Notices & Holidays"
                  icon={<NoticeIcon color="error" sx={{ fontSize: 20 }} />}
                  action={
                    <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/communication/notices")}
                      sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                      View All
                    </Button>
                  }
                />
                <NoticesCardContent notices={recent_notices} navigate={navigate} />
              </CardContent>
            </GCard>
          </SortableSection>
        );

      default: return null;
    }
  };

  return (
    <Grid container spacing={3}>
      {/* ── KPI snap cards — individually draggable ── */}
      <Grid item xs={12}>
        <DndContext sensors={kpiSensors} collisionDetection={closestCenter} onDragEnd={handleKpiDrag}>
          <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
            <Grid container spacing={3}>
              {kpiOrder.map((id) => (
                <Grid item xs={12} sm={6} md={3} key={id}>
                  <SortableSection id={id}>{renderKpi(id)}</SortableSection>
                </Grid>
              ))}
            </Grid>
          </SortableContext>
        </DndContext>
      </Grid>

      {/* ── Main cards ── */}
      <Grid item xs={12}>
        <DndContext sensors={cardSensors} collisionDetection={closestCenter} onDragEnd={handleCardDrag}>
          <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
              {cardOrder.map(renderCard)}
            </Box>
          </SortableContext>
        </DndContext>
      </Grid>
    </Grid>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD SHELL
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth();
  const { roles } = useRBAC();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Per-section date filters — each card controls its own range
  const [attFilter, setAttFilter] = useState<SectionDateFilter>(makeFilter("week"));
  const [feeFilter, setFeeFilter] = useState<SectionDateFilter>(makeFilter("month"));

  // ── Card-specific override state (populated by fast endpoints) ──────────────
  const [attOverride, setAttOverride] = useState<AttendanceOverview | null>(null);
  const [attCardLoading, setAttCardLoading] = useState(false);
  const [feeOverride, setFeeOverride] = useState<FeeCollectionSummary | null>(null);
  const [feeCardLoading, setFeeCardLoading] = useState(false);

  // ── Class filter state ───────────────────────────────────────────────────────
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [attClassId, setAttClassId] = useState<number | "">("");

  const seqRef = useRef(0);
  const attSeqRef = useRef(0);
  const feeSeqRef = useRef(0);

  // ── Unified attendance-only fetch ───────────────────────────────────────────
  const fetchAttCardData = useCallback(
    async (f: SectionDateFilter, classId: number | "") => {
      if (f.preset === "custom" && (!f.start || !f.end)) return; // wait for both dates
      const seq = ++attSeqRef.current;
      setAttCardLoading(true);
      try {
        const { start, end } = effectiveDates(f);
        const cid = classId === "" ? undefined : classId;
        const result = await dashboardService.getAttendanceCard(start, end, cid);
        if (seq === attSeqRef.current) setAttOverride(result);
      } catch {
        // silently keep previous data on error
      } finally {
        if (seq === attSeqRef.current) setAttCardLoading(false);
      }
    },
    []
  );

  const handleAttFilterChange = useCallback(
    (f: SectionDateFilter) => {
      setAttFilter(f);
      fetchAttCardData(f, attClassId);
    },
    [attClassId, fetchAttCardData]
  );

  const handleAttClassChange = useCallback(
    (classId: number | "") => {
      setAttClassId(classId);
      fetchAttCardData(attFilter, classId);
    },
    [attFilter, fetchAttCardData]
  );

  // Full dashboard fetch — used only on initial load and global refresh
  const fetchData = useCallback(
    async (isRefresh = false) => {
      const seq = ++seqRef.current;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const attDates = effectiveDates(attFilter);
        const feeDates = effectiveDates(feeFilter);

        const params: DashboardFetchParams = {
          attStart: attDates.start,
          attEnd: attDates.end,
          feeStart: feeDates.start,
          feeEnd: feeDates.end,
        };

        const res = await dashboardService.getDashboardData(params);
        if (seq === seqRef.current) {
          setData(res);
          // Sync or re-fetch card if specific class is selected
          if (attClassId !== "") {
            fetchAttCardData(attFilter, attClassId);
          } else {
            setAttOverride(null);
          }
          setFeeOverride(null);
        }
      } catch {
        if (seq === seqRef.current) setError("Failed to load dashboard. Please try again.");
      } finally {
        if (seq === seqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [attFilter, feeFilter, attClassId, fetchAttCardData]
  );

  // Initial load + 5-minute auto-refresh
  useEffect(() => {
    let active = true;
    fetchData();
    const id = setInterval(() => { if (active) fetchData(true); }, 5 * 60 * 1000);
    return () => { active = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load tenant classes for Admins
  useEffect(() => {
    if (data && (data.role === "SYSTEM_ADMIN" || data.role === "TENANT_ADMIN")) {
      schoolClassService.getAll()
        .then((res) => {
          setClasses(res.map(c => ({ id: c.id, name: c.name })));
        })
        .catch(err => console.error("Failed to load classes", err));
    }
  }, [data]);

  // Extract unique assigned classes for Teachers
  const teacherClasses = React.useMemo(() => {
    if (data?.role !== "TEACHER" || !data.data) return [];
    const teacherData = data.data as TeacherDashboardData;
    const unique: { id: number; name: string }[] = [];
    const seen = new Set<number>();
    teacherData.assigned_classes?.forEach((c) => {
      if (!seen.has(c.class_id)) {
        seen.add(c.class_id);
        unique.push({ id: c.class_id, name: c.class_name });
      }
    });
    return unique;
  }, [data]);

  // ── Fast fee-only fetch — only this card refreshes ─────────────────────────
  const handleFeeFilterChange = useCallback(
    async (f: SectionDateFilter) => {
      setFeeFilter(f);
      if (f.preset === "custom" && (!f.start || !f.end)) return; // wait for both dates
      const seq = ++feeSeqRef.current;
      setFeeCardLoading(true);
      try {
        const { start, end } = effectiveDates(f);
        const result = await dashboardService.getFeesCard(start, end);
        if (seq === feeSeqRef.current) setFeeOverride(result);
      } catch {
        // silently keep previous data on error
      } finally {
        if (seq === feeSeqRef.current) setFeeCardLoading(false);
      }
    },
    []
  );

  const lastLoginLabel = user?.id
    ? formatLastLoginLabel(getPreviousLoginIso(user.id))
    : "—";

  if (loading) return <DashboardSkeleton />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ── Welcome banner ── */}
      <WelcomeBanner
        name={user?.full_name || "User"}
        tenantName={user?.tenant?.name}
        lastLoginLabel={lastLoginLabel}
        refreshing={refreshing}
        onRefresh={() => fetchData(true)}
      />

      {/* ── Error banner ── */}
      {error && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: "12px",
            bgcolor: C.redGlass,
            border: `1px solid rgba(220,38,38,0.2)`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" sx={{ color: C.red, fontWeight: 700 }}>⚠ {error}</Typography>
          <Button size="small" variant="contained" color="error" onClick={() => fetchData()}
            sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700 }}>
            Retry
          </Button>
        </Box>
      )}

      {/* ── Role-based content ── */}
      {data &&
        (data.role === "SYSTEM_ADMIN" || data.role === "TENANT_ADMIN" ? (
          <AdminDashboardView
            data={data.data as AdminDashboardData}
            attFilter={attFilter}
            feeFilter={feeFilter}
            onAttFilterChange={handleAttFilterChange}
            onFeeFilterChange={handleFeeFilterChange}
            attOverride={attOverride}
            attCardLoading={attCardLoading}
            feeOverride={feeOverride}
            feeCardLoading={feeCardLoading}
            classes={classes}
            selectedClassId={attClassId}
            onClassChange={handleAttClassChange}
          />
        ) : data.role === "TEACHER" ? (
          <TeacherDashboardView
            data={data.data as TeacherDashboardData}
            attFilter={attFilter}
            onAttFilterChange={handleAttFilterChange}
            attOverride={attOverride}
            attCardLoading={attCardLoading}
            classes={teacherClasses}
            selectedClassId={attClassId}
            onClassChange={handleAttClassChange}
          />
        ) : (
          <StudentDashboardView data={data.data as StudentDashboardData} />
        ))}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes drawLine { to { stroke-dashoffset: 0; } }
        @keyframes riseUp { from { height: 0 !important; opacity: 0; } }
        @keyframes pulseGreen {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          70% { transform: scale(1.15); box-shadow: 0 0 0 8px rgba(16,185,129,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        @keyframes waveHand {
          0%  { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100%{ transform: rotate(0deg); }
        }
      `}</style>
    </Container>
  );
}
