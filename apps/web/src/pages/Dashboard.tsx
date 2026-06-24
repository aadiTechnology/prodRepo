import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
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
  Star as StarIcon,
  Call as CallIcon,
  AssignmentInd as AssignmentIndIcon,
  ContactPhone as ContactPhoneIcon,
  Assignment as HomeworkIcon,
  MenuBook as SubjectIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  CheckBox as QuickMarkIcon,
  DragIndicator as DragHandleIcon,
} from "@mui/icons-material";
import {
  DndContext,
  closestCenter,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
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
import academicYearService, { AcademicYear } from "../api/services/academicYearService";
import profileService from "../api/services/profileService";
import { formatLastLoginLabel, getPreviousLoginIso } from "../utils/lastLoginStorage";
import { toRoleLabel } from "../utils/formatters";
import { toMediaUrl } from "../utils/mediaUrl";

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  brand: "#1E40AF",
  brandLight: "#3B82F6",
  brandDark: "#1E3A8A",
  blue: "#2563EB",
  blueDark: "#1D4ED8",
  blueGlass: "rgba(37,99,235,0.08)",
  green: "#059669",
  greenGlass: "rgba(5,150,105,0.1)",
  amber: "#D97706",
  amberGlass: "rgba(217,119,6,0.1)",
  red: "#DC2626",
  redGlass: "rgba(220,38,38,0.08)",
  purple: "#7C3AED",
  purpleGlass: "rgba(124,58,237,0.08)",
  slate: "#0F172A",
  slateText: "#1E293B",
  muted: "#64748B",
  mutedLight: "#94A3B8",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  cardBg: "#FFFFFF",
  cardBorder: "#E2E8F0",
  white: "#FFFFFF",
  pageBg: "transparent",
  navyStart: "#0F172A",
  navyMid: "#1E3A8A",
  navyEnd: "#2563EB",
  shadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)",
  shadowMd: "0 4px 6px rgba(15,23,42,0.04), 0 12px 32px rgba(15,23,42,0.07)",
  radius: { sm: "10px", md: "14px", lg: "16px", xl: "20px" },
};

const filterChipSx = (active: boolean) => ({
  height: 28,
  fontSize: "0.72rem",
  fontWeight: 700,
  borderRadius: "8px",
  cursor: "pointer",
  bgcolor: active ? C.brand : C.surface,
  color: active ? "#fff" : C.muted,
  border: `1.5px solid ${active ? C.brand : C.border}`,
  transition: "all 0.15s ease",
  "&:hover": {
    bgcolor: active ? C.brandDark : C.surfaceMuted,
    borderColor: active ? C.brandDark : C.brandLight,
    color: active ? "#fff" : C.slateText,
  },
});

const dateFieldSx = {
  width: { xs: "100%", sm: 132 },
  minWidth: 120,
  "& .MuiOutlinedInput-root": {
    height: 28,
    fontSize: "0.72rem",
    fontWeight: 600,
    borderRadius: "8px",
    bgcolor: C.surface,
    "& fieldset": { borderColor: C.border },
    "&:hover fieldset": { borderColor: C.brandLight },
    "&.Mui-focused fieldset": { borderColor: C.brand },
  },
  "& input": { py: "4px !important", px: "8px !important" },
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

/** KPI row — columns expand evenly for 1–4 cards (no empty slot). */
const kpiGridSx = (count: number) => {
  const n = Math.max(count, 1);
  const rowCols = `repeat(${n}, minmax(0, 1fr))`;
  return {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: n === 1 ? "1fr" : n === 2 ? "repeat(2, minmax(0, 1fr))" : rowCols,
      md: rowCols,
      lg: rowCols,
    },
    gap: 3,
    width: "100%",
  };
};

/** 2-column draggable grid — compact tiles + full-width rows. */
const sortableGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
  gap: { xs: 2, md: 2.5 },
  width: "100%",
  alignItems: "stretch",
};

const sortableGridFullSx = {
  gridColumn: { xs: "1", md: "1 / -1" },
};

const sortableGridTileSx = {
  minWidth: 0,
  height: "100%",
  "& .sortable-content": {
    height: "100%",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    "& > *": { flex: 1, width: "100%", minWidth: 0 },
  },
};

const dragOverlayWrapSx = {
  cursor: "grabbing",
  boxShadow: C.shadowMd,
  borderRadius: C.radius.lg,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  bgcolor: "transparent",
  pointerEvents: "none" as const,
};

const SortableSection: React.FC<{ id: string; children: React.ReactNode; sx?: object }> = ({ id, children, sx }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0 : 1,
        position: "relative",
        minWidth: 0,
        width: "100%",
        "@media (hover: hover)": {
          "&:hover .drag-handle": { opacity: 0.55 },
        },
        ...sx,
      }}
    >
      <Box
        className="drag-handle"
        {...attributes}
        {...listeners}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 20,
          opacity: 0,
          transition: "opacity 0.15s ease",
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px !important",
          height: "24px !important",
          minWidth: "24px !important",
          maxWidth: "24px !important",
          flex: "none !important",
          p: 0,
          m: 0,
          bgcolor: "transparent",
          border: "none",
          boxShadow: "none",
          color: C.mutedLight,
          "&:active": { cursor: "grabbing", opacity: 0.85 },
        }}
      >
        <DragHandleIcon sx={{ fontSize: 18 }} />
      </Box>
      <Box className="sortable-content">{children}</Box>
    </Box>
  );
};

const useKpiDragSensors = () =>
  useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

const useCardDragSensors = () =>
  useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

function useSortableDrag(storageKey: string, defaultOrder: string[]) {
  const [order, setOrder] = useSectionOrder(storageKey, defaultOrder);
  const [activeId, setActiveId] = useState<string | null>(null);

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  }, []);

  const onDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (over && active.id !== over.id) {
        setOrder(arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id))));
      }
      setActiveId(null);
    },
    [order, setOrder]
  );

  return { order, activeId, onDragStart, onDragEnd, onDragCancel };
}

const getSortableGridItemSx = (id: string, fullWidthIds: Set<string>) =>
  fullWidthIds.has(id) ? sortableGridFullSx : sortableGridTileSx;

const SortableKpiRow: React.FC<{
  items: string[];
  activeId: string | null;
  onDragStart: (e: DragStartEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onDragCancel: () => void;
  renderItem: (id: string) => React.ReactNode;
}> = ({ items, activeId, onDragStart, onDragEnd, onDragCancel, renderItem }) => {
  const sensors = useKpiDragSensors();
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <Box sx={kpiGridSx(items.length)}>
          {items.map((id) => (
            <SortableSection key={id} id={id} sx={{ minWidth: 0 }}>
              {renderItem(id)}
            </SortableSection>
          ))}
        </Box>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <Box sx={{ ...dragOverlayWrapSx, minWidth: 160 }}>{renderItem(activeId)}</Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

const SortableCardGrid: React.FC<{
  items: string[];
  activeId: string | null;
  onDragStart: (e: DragStartEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onDragCancel: () => void;
  fullWidthIds: Set<string>;
  compactOverlayIds?: Set<string>;
  renderItem: (id: string) => React.ReactNode;
}> = ({
  items,
  activeId,
  onDragStart,
  onDragEnd,
  onDragCancel,
  fullWidthIds,
  compactOverlayIds,
  renderItem,
}) => {
  const sensors = useCardDragSensors();
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <Box sx={sortableGridSx}>
          {items.map((id) => (
            <SortableSection key={id} id={id} sx={getSortableGridItemSx(id, fullWidthIds)}>
              {renderItem(id)}
            </SortableSection>
          ))}
        </Box>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <Box
            sx={{
              ...dragOverlayWrapSx,
              ...(compactOverlayIds?.has(activeId) ? { maxWidth: { xs: "100%", md: 420 } } : {}),
            }}
          >
            {renderItem(activeId)}
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
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
        sx={filterChipSx(value.preset === p.key)}
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
          sx={dateFieldSx}
        />
        <TextField
          type="date"
          size="small"
          value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
          InputLabelProps={{ shrink: true }}
          inputProps={{ style: { fontSize: 11, padding: "3px 7px" } }}
          sx={dateFieldSx}
        />
      </Box>
    )}
  </Box>
);

// ─── Attendance date filter: Custom (single day) + Weekly ───────────────
// Unlike CardDateFilter (which uses a start/end range for "custom"), attendance
// "custom" selects ONE day. It defaults to today and disallows future dates.
const ATT_PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: "week", label: "Weekly" },
  { key: "custom", label: "Custom" },
];

const makeAttDefaultFilter = (): SectionDateFilter => {
  const today = isoDate(new Date());
  return { preset: "custom", start: today, end: today };
};

const classFilterSelectSx = {
  width: { xs: "100%", sm: 140 },
  minWidth: 105,
  "& .MuiOutlinedInput-root": {
    height: 28,
    fontSize: "0.72rem",
    fontWeight: 600,
    borderRadius: "8px",
    bgcolor: C.surface,
    color: C.slateText,
    "& fieldset": { borderColor: C.border },
    "&:hover fieldset": { borderColor: C.brandLight },
    "&.Mui-focused fieldset": { borderColor: C.brand },
    "& .MuiSelect-icon": { color: C.muted },
  },
};

const clampDate = (d: string, min?: string, max?: string) => {
  let v = d;
  if (min && v < min) v = min;
  if (max && v > max) v = max;
  return v;
};

const AttendanceDateFilter: React.FC<{
  value: SectionDateFilter;
  onChange: (f: SectionDateFilter) => void;
  /** Academic-year lower bound (YYYY-MM-DD) — earliest selectable day. */
  minDate?: string;
  /** Upper bound (YYYY-MM-DD) — defaults to today; future days disabled. */
  maxDate?: string;
}> = ({ value, onChange, minDate, maxDate }) => {
  const todayIso = isoDate(new Date());
  const max = maxDate || todayIso;
  // Custom always defaults to TODAY (clamped to the academic year), not the
  // Month preset's start date.
  const defaultDay = clampDate(todayIso, minDate, max);
  const selectedDay =
    value.preset === "custom" && value.start ? clampDate(value.start, minDate, max) : defaultDay;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
      {ATT_PRESETS.map((p) => {
        const active = value.preset === p.key;
        return (
          <Chip
            key={p.key}
            label={p.label}
            size="small"
            onClick={() =>
              p.key === "custom"
                ? onChange({ preset: "custom", start: defaultDay, end: defaultDay })
                : onChange({ preset: p.key, ...getPresetRange(p.key) })
            }
            sx={filterChipSx(active)}
          />
        );
      })}
      {value.preset === "custom" && (
        <TextField
          type="date"
          size="small"
          value={selectedDay}
          onChange={(e) => {
            const d = e.target.value;
            if (!d) return;
            const clamped = clampDate(d, minDate, max);
            onChange({ preset: "custom", start: clamped, end: clamped });
          }}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: minDate, max, style: { fontSize: 11, padding: "3px 7px" } }}
          sx={dateFieldSx}
        />
      )}
    </Box>
  );
};

// ─── Card shell + shared UI primitives ───────────────────────────────────────
const GCard: React.FC<{ children: React.ReactNode; sx?: object }> = ({ children, sx }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: C.radius.lg,
      border: `1px solid ${C.cardBorder}`,
      background: C.cardBg,
      boxShadow: C.shadow,
      transition: "box-shadow 0.2s ease, border-color 0.2s ease",
      position: "relative",
      overflow: "hidden",
      "@media (hover: hover)": {
        "&:hover": {
          boxShadow: C.shadowMd,
          borderColor: "#CBD5E1",
        },
      },
      ...sx,
    }}
  >
    {children}
  </Card>
);

const ActionLink: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <Button
    size="small"
    endIcon={<ArrowIcon sx={{ fontSize: "14px !important" }} />}
    onClick={onClick}
    sx={{
      color: C.brand,
      fontWeight: 700,
      textTransform: "none",
      fontSize: { xs: "0.75rem", sm: "0.8rem" },
      px: { xs: 0.5, sm: 1 },
      minWidth: 0,
      whiteSpace: "nowrap",
      "&:hover": { bgcolor: C.blueGlass },
    }}
  >
    {label}
  </Button>
);

const StatPill: React.FC<{ label: string; value: string | number; color: string; bg: string }> = ({
  label, value, color, bg,
}) => (
  <Box
    sx={{
      p: { xs: 1.25, sm: 1.5 },
      bgcolor: bg,
      borderRadius: C.radius.md,
      border: `1px solid ${color}22`,
    }}
  >
    <Typography
      sx={{
        color: C.muted,
        fontWeight: 700,
        textTransform: "uppercase",
        fontSize: "0.65rem",
        letterSpacing: "0.06em",
        display: "block",
        mb: 0.35,
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontWeight: 800, color, fontSize: { xs: "1.05rem", sm: "1.2rem" }, lineHeight: 1.1 }}>
      {value}
    </Typography>
  </Box>
);

/** Muted inset panel for paired dashboard tiles (teacher attendance / profile). */
const dashTilePanelSx = {
  flex: 1,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  p: 1.25,
  bgcolor: C.surfaceMuted,
  borderRadius: C.radius.md,
  border: `1px solid ${C.borderLight}`,
  minWidth: 0,
};

const dashTileCardContentSx = {
  p: 1.75,
  flex: 1,
  display: "flex",
  flexDirection: "column" as const,
  gap: 1,
  minHeight: 0,
};

const dashFilterBarSx = {
  display: "flex",
  flexWrap: "wrap" as const,
  alignItems: "center",
  gap: 0.5,
  p: 0.75,
  bgcolor: C.surfaceMuted,
  borderRadius: C.radius.sm,
  border: `1px solid ${C.borderLight}`,
};

const DashStatRow: React.FC<{ label: string; value: string | number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, minWidth: 0 }}>
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: C.muted }}>{label}</Typography>
    </Box>
    <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color, flexShrink: 0, lineHeight: 1 }}>{value}</Typography>
  </Box>
);

const CardHeader: React.FC<{
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  dateFilter?: React.ReactNode;
  compact?: boolean;
}> = ({ title, icon, action, dateFilter, compact }) => (
  <Box sx={{ mb: compact ? 1.25 : 2 }}>
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1,
        mb: dateFilter ? (compact ? 0.75 : 1.25) : 0,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: compact ? 0.75 : 1, minWidth: 0 }}>
        {icon && (
          <Box
            sx={{
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              borderRadius: C.radius.sm,
              bgcolor: C.blueGlass,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              "& .MuiSvgIcon-root": { fontSize: compact ? 15 : 17 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant={compact ? "subtitle2" : "subtitle1"}
          sx={{
            fontWeight: 800,
            color: C.slateText,
            letterSpacing: "-0.1px",
            lineHeight: 1.25,
            fontSize: compact ? "0.88rem" : undefined,
          }}
        >
          {title}
        </Typography>
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
    {dateFilter && (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        {dateFilter}
      </Box>
    )}
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
        sx={{ display: "inline-flex", cursor: "default" }}
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
  <GCard sx={{ cursor: onClick ? "pointer" : "default", height: "100%" }}>
    <Box
      sx={{
        height: 2,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
      }}
    />
    <CardContent
      sx={{ p: { xs: 1.75, sm: 2 }, "&:last-child": { pb: { xs: 1.75, sm: 2 } } }}
      onClick={onClick}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1 }}>
        <Typography
          sx={{
            color: C.muted,
            fontWeight: 600,
            textTransform: "uppercase",
            fontSize: "0.68rem",
            letterSpacing: "0.05em",
            lineHeight: 1.35,
            minWidth: 0,
            pt: 0.15,
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: C.radius.sm,
            bgcolor: glassBg,
            color: accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: `1px solid ${accentColor}20`,
            "& .MuiSvgIcon-root": { fontSize: 17 },
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography
        sx={{
          fontWeight: 700,
          color: C.slateText,
          fontSize: { xs: "1.2rem", sm: "1.3rem" },
          letterSpacing: "-0.4px",
          lineHeight: 1.15,
          mb: sub ? 0.65 : 0,
          wordBreak: "break-word",
        }}
      >
        {value}
      </Typography>
      {sub}
    </CardContent>
  </GCard>
);

// ─── SVG donut attendance ring ────────────────────────────────────────────────
const AttRing: React.FC<{
  pct: number;
  size?: number;
  color?: string;
  gradId: string;
  /** Hide "Presence Rate" caption — use on compact dashboard tiles. */
  hideLabel?: boolean;
}> = ({ pct, size = 130, color = C.blue, gradId, hideLabel = false }) => {
  const showLabel = !hideLabel && size >= 100;
  const pctFontSize = size > 110 ? "1.25rem" : size > 88 ? "0.95rem" : size > 76 ? "0.78rem" : "0.72rem";

  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color + "BB"} />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="3"
          strokeLinecap="butt"
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
          px: 0.5,
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: pctFontSize, color, letterSpacing: "-0.4px", lineHeight: 1 }}>
          {pct.toFixed(1)}%
        </Typography>
        {showLabel && (
          <Typography
            sx={{
              fontSize: "8px",
              color: C.muted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              lineHeight: 1.15,
              mt: 0.25,
              maxWidth: size * 0.62,
            }}
          >
            Presence Rate
          </Typography>
        )}
      </Box>
    </Box>
  );
};

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

// ─── Dashboard page header (greeting lives in MainLayout app bar) ─────────────
const WelcomeBanner: React.FC<{
  schoolName: string;
  lastLoginLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
}> = ({ schoolName, lastLoginLabel, refreshing, onRefresh }) => {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Box
      sx={{
        mb: { xs: 2.5, md: 3 },
        borderRadius: { xs: C.radius.lg, md: C.radius.xl },
        overflow: "hidden",
        background: `linear-gradient(125deg, ${C.navyStart} 0%, ${C.navyMid} 48%, ${C.navyEnd} 100%)`,
        boxShadow: "0 16px 48px rgba(15,23,42,0.22)",
        border: "1px solid rgba(255,255,255,0.08)",
        position: "relative",
        px: { xs: 2, sm: 2.5, md: 3 },
        py: { xs: 2, sm: 2.5, md: 3 },
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          right: -60,
          top: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, minWidth: 0, position: "relative", zIndex: 1 }}>
        <Box
          sx={{
            width: { xs: 44, sm: 48 },
            height: { xs: 44, sm: 48 },
            borderRadius: C.radius.md,
            bgcolor: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            mt: 0.25,
          }}
        >
          <SchoolIcon sx={{ color: "#FBBF24", fontSize: 26 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: { xs: "0.95rem", sm: "1.05rem", md: "1.15rem" },
              fontWeight: 800,
              letterSpacing: "0.02em",
              color: "#FFFFFF",
              textTransform: "uppercase",
              lineHeight: 1.3,
            }}
          >
            {schoolName}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.75 }}>
            <Typography
              sx={{
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                fontSize: { xs: "0.75rem", sm: "0.82rem" },
                lineHeight: 1.3,
              }}
            >
              {today}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: "#4ADE80",
                  boxShadow: "0 0 8px rgba(74,222,128,0.8)",
                  animation: "pulseGreen 2s infinite",
                }}
              />
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: "#86EFAC", letterSpacing: "0.1em" }}>
                LIVE
              </Typography>
            </Box>
          </Box>
          {refreshing && (
            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", fontWeight: 600, mt: 0.5 }}>
              Syncing latest data…
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          position: "relative",
          zIndex: 1,
          alignSelf: { xs: "flex-end", sm: "center" },
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: C.radius.md,
            bgcolor: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }} />
          <Box>
            <Typography sx={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", fontWeight: 800, letterSpacing: "0.08em", lineHeight: 1 }}>
              LAST LOGIN
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.9)", fontWeight: 700, lineHeight: 1.3 }}>
              {lastLoginLabel}
            </Typography>
          </Box>
        </Box>
        <Tooltip title={refreshing ? "Syncing…" : "Refresh dashboard"}>
          <IconButton
            onClick={onRefresh}
            disabled={refreshing}
            size="small"
            sx={{
              width: 34,
              height: 34,
              bgcolor: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.15)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.18)" },
            }}
          >
            <RefreshIcon sx={{ fontSize: 16, animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const DashboardSkeleton: React.FC = () => (
  <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto", py: { xs: 1.5, md: 2.5 } }}>
    <Skeleton variant="rectangular" height={120} sx={{ borderRadius: C.radius.lg, mb: 3 }} />
    <Grid container spacing={{ xs: 2, md: 2.5 }}>
      {[1, 2, 3, 4].map((i) => (
        <Grid item xs={12} sm={6} lg={3} key={i}>
          <Skeleton variant="rectangular" height={130} sx={{ borderRadius: C.radius.lg }} />
        </Grid>
      ))}
      <Grid item xs={12} lg={7}>
        <Skeleton variant="rectangular" height={340} sx={{ borderRadius: C.radius.lg }} />
      </Grid>
      <Grid item xs={12} lg={5}>
        <Skeleton variant="rectangular" height={340} sx={{ borderRadius: C.radius.lg }} />
      </Grid>
    </Grid>
  </Box>
);

type ProfileDetailLine = { icon?: React.ReactNode; text: string };

function useProfileAvatarSrc(userId?: number, profileImagePath?: string | null) {
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(() => toMediaUrl(profileImagePath));
  const [avatarKey, setAvatarKey] = useState(0);

  const refreshAvatar = useCallback(async () => {
    try {
      const data = await profileService.getProfile();
      if (typeof data?.profile_image_path === "string") {
        setAvatarSrc(toMediaUrl(data.profile_image_path));
        setAvatarKey((k) => k + 1);
      }
    } catch {
      // fall back to initials
    }
  }, []);

  useEffect(() => {
    if (profileImagePath) {
      setAvatarSrc(toMediaUrl(profileImagePath));
      return;
    }
    if (userId) void refreshAvatar();
  }, [userId, profileImagePath, refreshAvatar]);

  useEffect(() => {
    const handler = () => void refreshAvatar();
    window.addEventListener("profile-image-updated", handler);
    window.addEventListener("profile-updated", handler);
    return () => {
      window.removeEventListener("profile-image-updated", handler);
      window.removeEventListener("profile-updated", handler);
    };
  }, [refreshAvatar]);

  return { avatarSrc, avatarKey };
}

const DashboardProfileCard: React.FC<{
  details?: ProfileDetailLine[];
  displayName?: string;
  avatarOverride?: string;
  /** card = grid widget (teacher/student); strip = full-width banner (admin) */
  variant?: "card" | "strip";
  metaChips?: string[];
  /** Stretch to match sibling card height (attendance + profile row). */
  fillHeight?: boolean;
  /** Compact vertical tile — pairs with attendance in a 2-col grid. */
  compact?: boolean;
}> = ({ details = [], displayName, avatarOverride, variant = "card", metaChips = [], fillHeight = false, compact = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles: rbacRoles } = useRBAC();
  const { avatarSrc, avatarKey } = useProfileAvatarSrc(user?.id, user?.profile_image_path);
  const resolvedAvatar = avatarOverride || avatarSrc;
  const name = displayName || user?.full_name || "User";
  const roleLabel =
    rbacRoles.length > 0
      ? toRoleLabel(rbacRoles[0])
      : user?.role === "SUPER_ADMIN"
        ? "System Admin"
        : user?.role || "User";

  const avatarSize = variant === "strip" ? 56 : compact ? 48 : 72;

  const avatarEl = (
    <Avatar
      key={avatarKey}
      src={resolvedAvatar || ""}
      imgProps={{ style: { objectFit: "cover" } }}
      sx={{
        width: avatarSize,
        height: avatarSize,
        bgcolor: C.brand,
        fontSize: variant === "strip" ? "1.1rem" : "1.5rem",
        fontWeight: 800,
        border: `3px solid ${C.borderLight}`,
        boxShadow: C.shadow,
        flexShrink: 0,
      }}
    >
      {!resolvedAvatar && name.charAt(0).toUpperCase()}
    </Avatar>
  );

  const roleChip = (
    <Chip
      label={roleLabel}
      size="small"
      sx={{
        height: 22,
        fontSize: "0.65rem",
        fontWeight: 800,
        letterSpacing: "0.06em",
        bgcolor: C.blueGlass,
        color: C.brand,
      }}
    />
  );

  if (variant === "strip") {
    const chips = metaChips.filter(Boolean);
    return (
      <GCard>
        <CardContent sx={{ p: { xs: 1.75, sm: 2, md: 2.25 } }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "stretch", md: "center" },
              gap: { xs: 1.5, md: 2 },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
              {avatarEl}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 800, color: C.slateText, fontSize: { xs: "0.9rem", sm: "0.95rem" } }}>
                    {name}
                  </Typography>
                  {roleChip}
                </Box>
                {user?.email && (
                  <Typography sx={{ fontSize: "0.8rem", color: C.muted, fontWeight: 600, mt: 0.4 }} noWrap>
                    {user.email}
                  </Typography>
                )}
                {chips.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                    {chips.map((chip) => (
                      <Chip
                        key={chip}
                        label={chip}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          bgcolor: C.surfaceMuted,
                          color: C.slateText,
                          border: `1px solid ${C.border}`,
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              endIcon={<ArrowIcon sx={{ fontSize: "14px !important" }} />}
              onClick={() => navigate("/profile")}
              sx={{
                alignSelf: { xs: "stretch", md: "center" },
                borderRadius: C.radius.sm,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.8rem",
                color: C.brand,
                borderColor: C.border,
                px: 2,
                "&:hover": { bgcolor: C.blueGlass, borderColor: C.brandLight },
              }}
            >
              View Profile
            </Button>
          </Box>
        </CardContent>
      </GCard>
    );
  }

  if (compact) {
    return (
      <GCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent sx={dashTileCardContentSx}>
          <CardHeader
            compact
            title="My Profile"
            icon={<PersonIcon sx={{ color: C.brand, fontSize: 16 }} />}
            action={<ActionLink label="View" onClick={() => navigate("/profile")} />}
          />
          <Box sx={dashTilePanelSx}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, width: "100%" }}>
              {avatarEl}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.65, flexWrap: "wrap", mb: 0.75 }}>
                  <Typography
                    sx={{ fontWeight: 700, color: C.slateText, fontSize: "0.86rem", lineHeight: 1.25 }}
                    noWrap
                    title={name}
                  >
                    {name}
                  </Typography>
                  {roleChip}
                </Box>
                <Divider sx={{ borderColor: C.borderLight, mb: 0.75 }} />
                {user?.email && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.5, minWidth: 0 }}>
                    <EmailIcon sx={{ fontSize: 14, color: C.muted, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: "0.7rem", color: C.muted, fontWeight: 600 }} noWrap title={user.email}>
                      {user.email}
                    </Typography>
                  </Box>
                )}
                {details.map((line, index) => (
                  <Box key={`${line.text}-${index}`} sx={{ display: "flex", alignItems: "center", gap: 0.6, minWidth: 0, mt: index === 0 ? 0 : 0.45 }}>
                    {line.icon}
                    <Typography sx={{ fontSize: "0.7rem", color: C.slateText, fontWeight: 600 }} noWrap title={line.text}>
                      {line.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </GCard>
    );
  }

  return (
    <GCard sx={fillHeight ? { height: "100%", display: "flex", flexDirection: "column" } : undefined}>
      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          ...(fillHeight ? { flex: 1, display: "flex", flexDirection: "column" } : {}),
        }}
      >
        <CardHeader
          title="My Profile"
          icon={<PersonIcon sx={{ color: C.brand }} />}
          action={<ActionLink label="View Profile" onClick={() => navigate("/profile")} />}
        />
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "center", sm: fillHeight ? "center" : "flex-start" },
            gap: 2,
            ...(fillHeight ? { flex: 1 } : {}),
          }}
        >
          {avatarEl}
          <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", sm: "left" } }}>
            <Typography sx={{ fontWeight: 800, color: C.slateText, fontSize: "0.95rem", lineHeight: 1.25 }}>
              {name}
            </Typography>
            <Box sx={{ mt: 0.75, display: "flex", justifyContent: { xs: "center", sm: "flex-start" } }}>
              {roleChip}
            </Box>
            {user?.email && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  mt: 1.25,
                  justifyContent: { xs: "center", sm: "flex-start" },
                }}
              >
                <EmailIcon sx={{ fontSize: 15, color: C.muted }} />
                <Typography sx={{ fontSize: "0.8rem", color: C.muted, fontWeight: 600 }} noWrap>
                  {user.email}
                </Typography>
              </Box>
            )}
            {details.map((line, index) => (
              <Box
                key={`${line.text}-${index}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  mt: 1,
                  justifyContent: { xs: "center", sm: "flex-start" },
                }}
              >
                {line.icon}
                <Typography sx={{ fontSize: "0.8rem", color: C.slateText, fontWeight: 600 }}>
                  {line.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </GCard>
  );
};

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
  /** Academic-year bounds for the attendance single-date picker. */
  attMinDate?: string;
  attMaxDate?: string;
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
  attMinDate,
  attMaxDate,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const ADMIN_SECTIONS_DEFAULT = ["admin_profile", "attendance_overview", "fee_collection", "notices", "leads", "quick_actions"];
  const ADMIN_FULL_WIDTH_SECTIONS = new Set(["admin_profile", "notices", "leads", "quick_actions"]);
  const ADMIN_COMPACT_SECTIONS = new Set(["attendance_overview", "fee_collection"]);

  const kpiDrag = useSortableDrag("admin_kpi_order", ADMIN_KPI_DEFAULT);
  const sectionDrag = useSortableDrag("admin_dash_order_v6", ADMIN_SECTIONS_DEFAULT);

  const renderAdminSection = (id: string) => {
    switch (id) {
      case "admin_profile":
        return (
          <DashboardProfileCard
            variant="strip"
            metaChips={[
              `${data.student_snapshot.active_students} Students`,
              `${data.student_snapshot.total_classes} Classes`,
            ]}
          />
        );

      case "notices":
        return (
          <GCard>
            <CardContent sx={{ p: 3 }}>
              <CardHeader
                title="Recent Notices & Holidays"
                icon={<NoticeIcon sx={{ color: C.red }} />}
                action={<ActionLink label="View All" onClick={() => navigate("/communication/notices")} />}
              />
              <NoticesCardContent notices={data.recent_notices} navigate={navigate} />
            </CardContent>
          </GCard>
        );

      case "attendance_overview":
        return (
          <GCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={dashTileCardContentSx}>
              <CardHeader
                compact
                title="Attendance Overview"
                icon={<AttendanceIcon sx={{ color: C.brand }} />}
                action={<ActionLink label="Details" onClick={() => navigate("/attendance/report")} />}
              />
              <Box sx={dashFilterBarSx}>
                <AttendanceDateFilter value={attFilter} onChange={onAttFilterChange} minDate={attMinDate} maxDate={attMaxDate} />
                {classes.length > 0 && (
                  <TextField
                    select
                    size="small"
                    value={selectedClassId || classes[0]?.id || ""}
                    onChange={(e) => onClassChange(Number(e.target.value))}
                    sx={{ ...classFilterSelectSx, width: 108, minWidth: 96 }}
                  >
                    {classes.map((cls) => (
                      <MenuItem key={cls.id} value={cls.id} sx={{ fontSize: "11px", fontWeight: 700 }}>
                        {cls.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Box>
              <Box sx={dashTilePanelSx}>
                {attCardLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: `3px solid ${C.blueGlass}`,
                        borderTopColor: C.blue,
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <AttRing pct={attPct} size={84} hideLabel color={attPct >= 75 ? C.green : C.amber} gradId="adminAttGrad" />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.85 }}>
                      <DashStatRow label="Present" value={present} color={C.green} />
                      <DashStatRow label="Absent" value={absent} color={C.red} />
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </GCard>
        );

      case "fee_collection":
        return (
          <GCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={dashTileCardContentSx}>
              <CardHeader
                compact
                title="Fee Collection"
                icon={<FeeIcon sx={{ color: C.green }} />}
                action={<ActionLink label="Collect" onClick={() => navigate("/fees/invoices")} />}
              />
              <Box sx={dashFilterBarSx}>
                <CardDateFilter
                  value={feeFilter}
                  onChange={onFeeFilterChange}
                  presets={[
                    { key: "week", label: "7 Days" },
                    { key: "month", label: "Month" },
                    { key: "custom", label: "Custom" },
                  ]}
                />
              </Box>
              <Box sx={dashTilePanelSx}>
                {feeCardLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: `3px solid ${C.greenGlass}`,
                        borderTopColor: C.green,
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography sx={{ color: C.muted, fontWeight: 600, fontSize: "0.72rem" }}>Recovery</Typography>
                        <Typography sx={{ color: C.green, fontWeight: 800, fontSize: "0.82rem" }}>{feePct.toFixed(1)}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={feePct}
                        sx={{
                          height: 7,
                          borderRadius: 4,
                          bgcolor: C.greenGlass,
                          "& .MuiLinearProgress-bar": {
                            background: `linear-gradient(90deg, ${C.green}, #34D399)`,
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                    <DashStatRow label="Projected" value={fmtINR(total_fee)} color={C.slateText} />
                    <DashStatRow label="Collected" value={fmtINR(total_paid)} color={C.green} />
                    <DashStatRow label="Outstanding" value={fmtINR(total_balance)} color={C.red} />
                  </Box>
                )}
              </Box>
            </CardContent>
          </GCard>
        );

      case "leads":
        return (
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
        );

      case "quick_actions":
        return (
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
    <Grid container spacing={{ xs: 2, md: 2.5 }}>
      {/* ─ Row 1: KPI snap cards — individually draggable ─ */}
      <Grid item xs={12}>
        <SortableKpiRow
          items={kpiDrag.order}
          activeId={kpiDrag.activeId}
          onDragStart={kpiDrag.onDragStart}
          onDragEnd={kpiDrag.onDragEnd}
          onDragCancel={kpiDrag.onDragCancel}
          renderItem={renderAdminKpi}
        />
      </Grid>

      <Grid item xs={12}>
        <SortableCardGrid
          items={sectionDrag.order}
          activeId={sectionDrag.activeId}
          onDragStart={sectionDrag.onDragStart}
          onDragEnd={sectionDrag.onDragEnd}
          onDragCancel={sectionDrag.onDragCancel}
          fullWidthIds={ADMIN_FULL_WIDTH_SECTIONS}
          compactOverlayIds={ADMIN_COMPACT_SECTIONS}
          renderItem={renderAdminSection}
        />
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
  /** Academic-year bounds for the attendance single-date picker. */
  attMinDate?: string;
  attMaxDate?: string;
}

const TEACHER_KPI_DEFAULT   = ["kpi_students", "kpi_present", "kpi_absent", "kpi_pct"];
const TEACHER_CARDS_DEFAULT = ["card_att", "card_profile", "card_homework", "card_notices"];
const TEACHER_CARDS_SUBJECT = ["card_homework", "card_profile", "card_att", "card_notices"];
const TEACHER_FULL_WIDTH_CARDS = new Set(["card_homework", "card_notices"]);
const TEACHER_COMPACT_CARDS = new Set(["card_att", "card_profile"]);

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
  attMinDate,
  attMaxDate,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isSubjectFocused = data.dashboard_mode === "subject_focused";
  const canMarkAttendance = data.can_mark_attendance !== false && !isSubjectFocused;
  const classTeacherSlots = data.assigned_classes.filter((c) => c.designation === "Class Teacher");

  const scopedClasses = React.useMemo(() => {
    const activeClassId = selectedClassId || classes[0]?.id;
    if (!activeClassId) return data.assigned_classes;
    return data.assigned_classes.filter((c) => c.class_id === activeClassId);
  }, [data.assigned_classes, selectedClassId, classes]);

  const divisionStats = aggregateTeacherDivisionStats(scopedClasses);
  const primaryAssignment = classTeacherSlots[0] ?? scopedClasses[0];

  const kpiDrag = useSortableDrag("teacher_kpi_v3", TEACHER_KPI_DEFAULT);
  const cardDrag = useSortableDrag(
    "teacher_cards_v9",
    isSubjectFocused ? TEACHER_CARDS_SUBJECT : TEACHER_CARDS_DEFAULT
  );

  // ── Derived stats ──────────────────────────────────────────────────────────
  const attData = attOverride ?? data.today_attendance;
  const { present, absent, half_day, leave } = attData;
  const presentBoys = attData.present_boys ?? 0;
  const presentGirls = attData.present_girls ?? 0;
  const absentBoys = attData.absent_boys ?? 0;
  const absentGirls = attData.absent_girls ?? 0;
  const presentTotal = present + half_day;
  const totalAtt = present + absent + half_day + leave;
  const attPct = totalAtt > 0 ? ((present + half_day * 0.5) / totalAtt) * 100 : 0;

  const totalStudents = divisionStats.students;
  const totalBoys = divisionStats.boys;
  const totalGirls = divisionStats.girls;

  const kpiGenderRow = (boys: number, girls: number) => (
    <Box
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mt: 0.25 }}
    >
      <GenderCountChip tooltip="Boys" count={boys} variant="boys" />
      <GenderCountChip tooltip="Girls" count={girls} variant="girls" />
    </Box>
  );

  // ── KPI renderer ───────────────────────────────────────────────────────────
  const renderKpi = (id: string) => {
    switch (id) {
      case "kpi_students":
        return (
          <SnapCard
            title="Total Students"
            value={totalStudents}
            icon={<PeopleIcon fontSize="small" />}
            accentColor={C.purple}
            glassBg={C.purpleGlass}
            onClick={() => navigate("/students")}
            sub={
              <>
                <Sparkline color={C.purple} delay={0} />
                {kpiGenderRow(totalBoys, totalGirls)}
              </>
            }
          />
        );
      case "kpi_present":
        return (
          <SnapCard
            title="Present Students"
            value={totalAtt === 0 ? "—" : presentTotal}
            icon={<PresentIcon fontSize="small" />}
            accentColor={C.green}
            glassBg={C.greenGlass}
            onClick={() => navigate("/attendance/mark")}
            sub={
              <>
                <Sparkline color={C.green} delay={0.2} />
                {totalAtt === 0 ? (
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>
                    Not marked yet
                  </Typography>
                ) : (
                  kpiGenderRow(presentBoys, presentGirls)
                )}
              </>
            }
          />
        );
      case "kpi_absent":
        return (
          <SnapCard
            title="Absent Students"
            value={totalAtt === 0 ? "—" : absent}
            icon={<AbsentIcon fontSize="small" />}
            accentColor={C.red}
            glassBg={C.redGlass}
            onClick={() => navigate("/attendance/report")}
            sub={
              <>
                <Sparkline color={C.red} delay={0.4} />
                {totalAtt === 0 ? (
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700 }}>
                    Not marked yet
                  </Typography>
                ) : (
                  kpiGenderRow(absentBoys, absentGirls)
                )}
              </>
            }
          />
        );
      case "kpi_pct":
        return (
          <SnapCard
            title="Attendance Rate"
            value={totalAtt === 0 ? "—" : `${attPct.toFixed(1)}%`}
            icon={<AttendanceIcon fontSize="small" />}
            accentColor={attPct >= 75 ? C.green : C.amber}
            glassBg={attPct >= 75 ? C.greenGlass : C.amberGlass}
            onClick={() => navigate("/attendance/report")}
            sub={
              <>
                <Sparkline color={attPct >= 75 ? C.green : C.amber} delay={0.6} />
                <Chip
                  label={totalAtt === 0 ? "Not marked yet" : attPct >= 75 ? "On track" : "Needs attention"}
                  size="small"
                  sx={{
                    bgcolor: attPct >= 75 ? C.greenGlass : C.amberGlass,
                    color: attPct >= 75 ? C.green : C.amber,
                    fontWeight: 700,
                    height: 18,
                    fontSize: "11px",
                    borderRadius: "5px",
                  }}
                />
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
          <GCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={dashTileCardContentSx}>
              <CardHeader
                compact
                title={isSubjectFocused ? "Division Attendance" : "Attendance"}
                icon={<AttendanceIcon color="primary" sx={{ fontSize: 16 }} />}
                action={canMarkAttendance ? <ActionLink label="Mark" onClick={() => navigate("/attendance/mark")} /> : undefined}
              />
              <Box sx={dashFilterBarSx}>
                <AttendanceDateFilter value={attFilter} onChange={onAttFilterChange} minDate={attMinDate} maxDate={attMaxDate} />
                {classes.length > 0 && (
                  <TextField
                    select
                    size="small"
                    value={selectedClassId || classes[0]?.id || ""}
                    onChange={(e) => onClassChange(Number(e.target.value))}
                    sx={{ ...classFilterSelectSx, width: 108, minWidth: 96 }}
                  >
                    {classes.map((c) => (
                      <MenuItem key={c.id} value={c.id} sx={{ fontSize: "11px" }}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Box>
              <Box sx={dashTilePanelSx}>
                {attCardLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: `3px solid ${C.blueGlass}`,
                        borderTopColor: C.blue,
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  </Box>
                ) : totalAtt === 0 ? (
                  <Box>
                    <AttendanceIcon sx={{ fontSize: 24, color: C.muted, mb: 0.5 }} />
                    <Typography sx={{ color: C.muted, fontWeight: 600, fontSize: "0.7rem", lineHeight: 1.35 }}>
                      {isSubjectFocused ? "Not marked for your division." : "Not marked yet."}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <AttRing
                      pct={attPct}
                      size={84}
                      hideLabel
                      color={attPct >= 80 ? C.green : C.amber}
                      gradId="teacherAttRing"
                    />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.85 }}>
                      <DashStatRow label="Present" value={present} color={C.green} />
                      <DashStatRow label="Absent" value={absent} color={C.red} />
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </GCard>
        );

      case "card_profile": {
        const profileDetails: ProfileDetailLine[] = [];
        if (primaryAssignment) {
          profileDetails.push({
            icon: <ClassIcon sx={{ fontSize: 14, color: C.muted }} />,
            text: `${primaryAssignment.class_name} — ${primaryAssignment.division_name}${
              primaryAssignment.subject_name ? ` · ${primaryAssignment.subject_name}` : ""
            }`,
          });
        }
        return <DashboardProfileCard compact details={profileDetails} fillHeight />;
      }

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
                icon={<NoticeIcon sx={{ color: C.red }} />}
                action={<ActionLink label="View All" onClick={() => navigate("/communication/notices")} />}
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
    <Grid container spacing={{ xs: 2, md: 2.5 }}>
      {/* ── Row 1: KPI snap cards — individually draggable ── */}
      <Grid item xs={12}>
        <SortableKpiRow
          items={kpiDrag.order}
          activeId={kpiDrag.activeId}
          onDragStart={kpiDrag.onDragStart}
          onDragEnd={kpiDrag.onDragEnd}
          onDragCancel={kpiDrag.onDragCancel}
          renderItem={renderKpi}
        />
      </Grid>

      <Grid item xs={12}>
        <SortableCardGrid
          items={cardDrag.order}
          activeId={cardDrag.activeId}
          onDragStart={cardDrag.onDragStart}
          onDragEnd={cardDrag.onDragEnd}
          onDragCancel={cardDrag.onDragCancel}
          fullWidthIds={TEACHER_FULL_WIDTH_CARDS}
          compactOverlayIds={TEACHER_COMPACT_CARDS}
          renderItem={renderCardContent}
        />
      </Grid>
    </Grid>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const STUDENT_KPI_DEFAULT  = ["s_kpi_att", "s_kpi_present"];
// Pending HW KPI removed per QA — homework status remains on the s_homework card below.
// const STUDENT_KPI_DEFAULT  = ["s_kpi_att", "s_kpi_present", "s_kpi_hw"];
const STUDENT_CARDS_DEFAULT = ["s_att", "s_profile", "s_homework", "s_notices"];
const STUDENT_FULL_WIDTH_CARDS = new Set(["s_homework", "s_notices"]);
const STUDENT_COMPACT_CARDS = new Set(["s_att", "s_profile"]);
// Fee card hidden for students — restore when fee module is enabled:
// const STUDENT_CARDS_DEFAULT = ["s_att", "s_profile", "s_fee", "s_homework", "s_notices"];

const StudentDashboardView: React.FC<{ data: StudentDashboardData }> = ({ data }) => {
  const navigate = useNavigate();
  const { profile, attendance, /* fee_status, */ class_teacher, homework, recent_notices } = data;
  // Fee fields — uncomment with s_kpi_fees / s_fee cards below
  // const { total_fee, total_paid, total_balance, is_overdue, next_due_date } = fee_status;
  // const feePct = total_fee > 0 ? (total_paid / total_fee) * 100 : 0;
  // const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const kpiDrag = useSortableDrag("student_kpi_v2", STUDENT_KPI_DEFAULT);
  const cardDrag = useSortableDrag("student_cards_v6", STUDENT_CARDS_DEFAULT);

  const renderKpi = (id: string) => {
    const totalDays = attendance.present + attendance.absent;
    switch (id) {
      case "s_kpi_att":
        return (
          <SnapCard
            title="Attendance"
            value={`${attendance.percentage.toFixed(1)}%`}
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
      /* Pending HW KPI removed — see s_homework card for homework status.
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
      */
      /* Fee KPI — hidden for students; restore when fee module is enabled
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
      */
      default: return null;
    }
  };

  const renderCard = (id: string) => {
    switch (id) {
      case "s_att":
        return (
          <GCard sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={dashTileCardContentSx}>
              <CardHeader
                compact
                title="My Attendance"
                action={
                  <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/attendance/report")}
                    sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 11 }}>
                    History
                  </Button>
                }
              />
              <Box sx={dashTilePanelSx}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <AttRing
                    pct={attendance.percentage}
                    size={84}
                    hideLabel
                    color={attendance.percentage >= 75 ? C.green : C.red}
                    gradId="studAttGrad"
                  />
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.85 }}>
                    <DashStatRow label="Present" value={`${attendance.present}d`} color={C.green} />
                    <DashStatRow label="Absent" value={`${attendance.absent}d`} color={C.red} />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </GCard>
        );

      case "s_profile": {
        const studentProfileDetails: ProfileDetailLine[] = [];
        if (profile.class_name && profile.division_name) {
          studentProfileDetails.push({
            icon: <ClassIcon sx={{ fontSize: 15, color: C.muted }} />,
            text: `${profile.class_name} — ${profile.division_name}`,
          });
        }
        if (profile.roll_no) {
          studentProfileDetails.push({
            icon: <AssignmentIndIcon sx={{ fontSize: 15, color: C.muted }} />,
            text: `Roll No: ${profile.roll_no}`,
          });
        }
        if (class_teacher) {
          studentProfileDetails.push({
            icon: <PersonIcon sx={{ fontSize: 15, color: C.muted }} />,
            text: `Class Teacher: ${class_teacher}`,
          });
        }
        return (
          <DashboardProfileCard
            compact
            displayName={profile.student_name}
            avatarOverride={toMediaUrl(profile.photo_url)}
            details={studentProfileDetails}
            fillHeight
          />
        );
      }

      /* Fee Status card — hidden for students; restore when fee module is enabled
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
      */

      case "s_homework":
        return (
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: { xs: 1.5, sm: 1.75 },
              borderRadius: C.radius.md,
              bgcolor: homework.pending_count > 0 ? "#FEF2F2" : "#F0FDF4",
              border: `1px solid ${homework.pending_count > 0 ? "#FECACA" : "#BBF7D0"}`,
              boxShadow: C.shadow,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: C.radius.sm,
                  bgcolor: homework.pending_count > 0 ? C.redGlass : C.greenGlass,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <HomeworkIcon sx={{ fontSize: 18, color: homework.pending_count > 0 ? C.red : C.green }} />
              </Box>
              <Typography sx={{ fontSize: { xs: "0.82rem", sm: "0.9rem" }, fontWeight: 700, color: C.slateText, lineHeight: 1.45 }}>
                {homework.pending_count > 0
                  ? `You have ${homework.pending_count} pending assignment${homework.pending_count !== 1 ? "s" : ""}`
                  : "All homework assignments are complete — great going!"}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate("/homework")}
              sx={{
                borderRadius: C.radius.sm,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.8rem",
                bgcolor: C.brand,
                boxShadow: "none",
                flexShrink: 0,
                px: 2,
                "&:hover": { bgcolor: C.brandDark },
              }}
            >
              Go to Homework
            </Button>
          </Box>
        );

      case "s_notices":
        return (
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
        );

      default: return null;
    }
  };

  return (
    <Grid container spacing={{ xs: 2, md: 2.5 }}>
      <Grid item xs={12}>
        <SortableKpiRow
          items={kpiDrag.order}
          activeId={kpiDrag.activeId}
          onDragStart={kpiDrag.onDragStart}
          onDragEnd={kpiDrag.onDragEnd}
          onDragCancel={kpiDrag.onDragCancel}
          renderItem={renderKpi}
        />
      </Grid>

      <Grid item xs={12}>
        <SortableCardGrid
          items={cardDrag.order}
          activeId={cardDrag.activeId}
          onDragStart={cardDrag.onDragStart}
          onDragEnd={cardDrag.onDragEnd}
          onDragCancel={cardDrag.onDragCancel}
          fullWidthIds={STUDENT_FULL_WIDTH_CARDS}
          compactOverlayIds={STUDENT_COMPACT_CARDS}
          renderItem={renderCard}
        />
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

  // Per-section date filters — attendance: Custom (today) | Weekly; fee: 7 Days | Month | Custom
  const [attFilter, setAttFilter] = useState<SectionDateFilter>(makeAttDefaultFilter);
  const [feeFilter, setFeeFilter] = useState<SectionDateFilter>(makeFilter("month"));

  // ── Card-specific override state (populated by fast endpoints) ──────────────
  const [attOverride, setAttOverride] = useState<AttendanceOverview | null>(null);
  const [attCardLoading, setAttCardLoading] = useState(false);
  const [feeOverride, setFeeOverride] = useState<FeeCollectionSummary | null>(null);
  const [feeCardLoading, setFeeCardLoading] = useState(false);

  // ── Class filter state ───────────────────────────────────────────────────────
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [attClassId, setAttClassId] = useState<number | "">("");

  // ── Active academic year — constrains the attendance single-date picker ──────
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);

  const seqRef = useRef(0);
  const attSeqRef = useRef(0);
  const feeSeqRef = useRef(0);

  // ── Unified attendance-only fetch ───────────────────────────────────────────
  const fetchAttCardData = useCallback(
    async (f: SectionDateFilter, classId: number | "") => {
      // Attendance custom = single date; only the start (selected day) is required.
      if (f.preset === "custom" && !f.start) return;
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

  // Load active academic year to bound the attendance custom-date picker
  useEffect(() => {
    academicYearService.listActive()
      .then((years) => {
        if (!years.length) return;
        const today = isoDate(new Date());
        const current =
          years.find((y) => {
            const s = y.start_date?.slice(0, 10);
            const e = y.end_date?.slice(0, 10);
            return s && e && s <= today && today <= e;
          }) ?? years[0];
        setAcademicYear(current);
      })
      .catch(() => { /* picker falls back to "no lower bound, max = today" */ });
  }, []);

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

  const attendanceClassList = React.useMemo(
    () => (data?.role === "TEACHER" ? teacherClasses : classes),
    [data?.role, teacherClasses, classes]
  );

  // Default attendance class to the first available class
  useEffect(() => {
    if (attendanceClassList.length === 0 || attClassId !== "") return;
    const firstId = attendanceClassList[0].id;
    setAttClassId(firstId);
    fetchAttCardData(attFilter, firstId);
  }, [attendanceClassList, attClassId, attFilter, fetchAttCardData]);

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

  // Attendance single-date picker bounds: within the active academic year,
  // never beyond today.
  const attTodayIso = isoDate(new Date());
  const attMinDate = academicYear?.start_date?.slice(0, 10) || undefined;
  const ayEndIso = academicYear?.end_date?.slice(0, 10);
  const attMaxDate = ayEndIso && ayEndIso < attTodayIso ? ayEndIso : attTodayIso;

  if (loading) return <DashboardSkeleton />;

  return (
    <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto", py: { xs: 1.5, sm: 2, md: 2.5 } }}>
      <WelcomeBanner
        schoolName={user?.tenant?.name || "School"}
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
            attMinDate={attMinDate}
            attMaxDate={attMaxDate}
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
            attMinDate={attMinDate}
            attMaxDate={attMaxDate}
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
      `}</style>
    </Box>
  );
}
