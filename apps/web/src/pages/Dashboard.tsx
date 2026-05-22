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
  WbSunny as SunIcon,
  WbTwilight as SunriseIcon,
  NightsStay as MoonIcon,
  Star as StarIcon,
  Call as CallIcon,
  AssignmentInd as AssignmentIndIcon,
  ContactPhone as ContactPhoneIcon,
  Assignment as HomeworkIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  CheckBox as QuickMarkIcon,
} from "@mui/icons-material";
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
} from "../api/services/dashboardService";
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
    <Table size="small">
      <TableHead>
        <TableRow>
          {["Title", "Date", "Priority", ""].map((h) => (
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
          <TableRow key={n.id} sx={{ "& td": { borderBottom: `1px solid ${C.border}`, py: 1.2 }, "&:last-child td": { borderBottom: 0 } }}>
            <TableCell>
              <Typography variant="body2" sx={{ fontWeight: 600, color: C.slateText, maxWidth: 240 }} noWrap>
                {n.title}
              </Typography>
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
                onClick={() => navigate("/communication/notices")}
                sx={{ color: C.blue, fontWeight: 700, fontSize: "11px", minWidth: 0, px: 1, textTransform: "none" }}
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
      ? { text: "Good morning", icon: <SunriseIcon sx={{ color: "#FBBF24", fontSize: 26 }} /> }
      : hr < 17
      ? { text: "Good afternoon", icon: <SunIcon sx={{ color: "#F59E0B", fontSize: 26 }} /> }
      : { text: "Good evening", icon: <MoonIcon sx={{ color: "#A78BFA", fontSize: 24 }} /> };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: "24px",
        background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)",
        color: "#fff",
        mb: 3.5,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 20px 40px -15px rgba(15,23,42,0.5)",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 2.5,
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-40%",
          right: "-5%",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
          filter: "blur(25px)",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: "-30%",
          left: "15%",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)",
          filter: "blur(18px)",
        },
      }}
    >
      {/* Wave decoration */}
      <svg
        style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.12, pointerEvents: "none", width: 320, height: 100 }}
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
      >
        <path d="M0,75 Q50,35 100,75 T200,75 L200,100 L0,100 Z" fill="rgba(59,130,246,0.5)" />
        <path d="M0,85 Q60,55 120,85 T200,85 L200,100 L0,100 Z" fill="rgba(236,72,153,0.3)" />
      </svg>

      <Box sx={{ zIndex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255,255,255,0.1)",
              p: 0.75,
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {greet.icon}
          </Box>
          <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: "-0.3px" }}>
            {greet.text}, {name}!{" "}
            <span style={{ display: "inline-block", animation: "waveHand 2s infinite", transformOrigin: "70% 70%" }}>
              👋
            </span>
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.75, fontWeight: 500 }}>
          {today}
        </Typography>
        {tenantName && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.25 }}>
            <SchoolIcon sx={{ fontSize: 22, opacity: 0.9 }} />
            <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: "0.2px", lineHeight: 1.2 }}>
              {tenantName}
            </Typography>
          </Box>
        )}
        <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 500, mt: 0.75, display: "block" }}>
          Last login: {lastLoginLabel}
        </Typography>
      </Box>

      <Box
        sx={{
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          alignSelf: { xs: "flex-start", sm: "center" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 8, height: 8, bgcolor: "#34D399", borderRadius: "50%", animation: "pulseGreen 2s infinite" }} />
          <Typography variant="caption" sx={{ color: "#34D399", fontWeight: 800, letterSpacing: "1.2px" }}>
            LIVE
          </Typography>
        </Box>
        {refreshing && (
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>
            Syncing…
          </Typography>
        )}
        <Tooltip title="Refresh dashboard">
          <IconButton
            onClick={onRefresh}
            disabled={refreshing}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)", transform: "rotate(180deg)" },
              transition: "all 0.4s ease",
            }}
          >
            <RefreshIcon fontSize="small" sx={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
        </Tooltip>
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
}

const AdminDashboardView: React.FC<AdminViewProps> = ({
  data,
  attFilter,
  feeFilter,
  onAttFilterChange,
  onFeeFilterChange,
}) => {
  const navigate = useNavigate();

  const { present, absent, half_day, leave } = data.attendance_overview;
  const totalAtt = present + absent + half_day + leave;
  const attPct = totalAtt > 0 ? ((present + half_day * 0.5) / totalAtt) * 100 : 0;

  const { total_fee, total_paid, total_balance } = data.fee_collection;
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
      desc: "Log tuition and admission fees",
      icon: <FeeIcon />,
      color: C.green,
      bg: C.greenGlass,
      path: "/fees/collect",
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

  return (
    <Grid container spacing={3}>
      {/* ─ Row 1: Snap cards with sparklines ─ */}
      <Grid item xs={12} sm={6} md={3}>
        <SnapCard
          title="Active Students"
          value={data.student_snapshot.active_students}
          icon={<PeopleIcon fontSize="small" />}
          accentColor={C.blue}
          glassBg={C.blueGlass}
          onClick={() => navigate("/students")}
          sub={
            <>
              <Sparkline color={C.blue} delay={0} />
              <Typography variant="caption" sx={{ color: C.green, fontWeight: 700 }}>
                +2.5% since last week
              </Typography>
            </>
          }
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <SnapCard
          title="Total Classes"
          value={data.student_snapshot.total_classes}
          icon={<SchoolIcon fontSize="small" />}
          accentColor={C.purple}
          glassBg={C.purpleGlass}
          sub={
            <>
              <Sparkline color={C.purple} delay={0.2} />
              <Typography variant="caption" sx={{ color: C.green, fontWeight: 700 }}>
                +1.2% since last week
              </Typography>
            </>
          }
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <SnapCard
          title="Collected Fees"
          value={fmtINR(total_paid)}
          icon={<MoneyIcon fontSize="small" />}
          accentColor={C.green}
          glassBg={C.greenGlass}
          onClick={() => navigate("/fees/report")}
          sub={
            <>
              <Sparkline color={C.green} delay={0.4} />
              <Chip
                label={feePct >= 75 ? "On Track" : `${feePct.toFixed(0)}% Collected`}
                size="small"
                sx={{
                  bgcolor: feePct >= 75 ? C.greenGlass : C.amberGlass,
                  color: feePct >= 75 ? C.green : C.amber,
                  fontWeight: 700,
                  height: 18,
                  fontSize: "11px",
                  borderRadius: "5px",
                }}
              />
            </>
          }
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <SnapCard
          title="Pending Balance"
          value={fmtINR(total_balance)}
          icon={<WarningIcon fontSize="small" />}
          accentColor={C.red}
          glassBg={C.redGlass}
          sub={
            <>
              <Sparkline color={C.red} delay={0.6} />
              <Typography variant="caption" sx={{ color: total_balance > 0 ? C.red : C.green, fontWeight: 700 }}>
                {total_balance > 0 ? "-4.8% since last week" : "All dues cleared ✓"}
              </Typography>
            </>
          }
        />
      </Grid>

      {/* ─ Row 2: Quick Administrative Actions ─ */}
      <Grid item xs={12}>
        <GCard>
          <CardContent sx={{ p: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 800, color: C.slateText, mb: 2.5, display: "flex", alignItems: "center", gap: 1, letterSpacing: "-0.1px" }}
            >
              <TrendIcon color="primary" sx={{ fontSize: 20 }} />
              Quick Administrative Actions
            </Typography>
            <Grid container spacing={2}>
              {quickActions.map((qa) => (
                <Grid item xs={12} sm={6} md={3} key={qa.label}>
                  <Box
                    onClick={() => navigate(qa.path)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 2,
                      borderRadius: "14px",
                      border: `1px solid ${C.border}`,
                      cursor: "pointer",
                      transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                      "&:hover": {
                        bgcolor: qa.bg,
                        borderColor: qa.color + "35",
                        transform: "translateX(3px)",
                        boxShadow: `0 4px 14px ${qa.color}12`,
                      },
                    }}
                  >
                    <Avatar sx={{ bgcolor: qa.bg, color: qa.color, width: 44, height: 44, borderRadius: "12px", flexShrink: 0 }}>
                      {qa.icon}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: C.slateText, lineHeight: 1.3 }}>
                        {qa.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: C.muted, lineHeight: 1.3, display: "block" }}>
                        {qa.desc}
                      </Typography>
                    </Box>
                    <ArrowIcon sx={{ color: C.muted, fontSize: 18, flexShrink: 0 }} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </GCard>
      </Grid>

      {/* ─ Row 3: Attendance Overview + Fee Collection Progress ─ */}
      <Grid item xs={12} md={7}>
        <GCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <CardHeader
              title="Attendance Overview"
              icon={<AttendanceIcon color="primary" sx={{ fontSize: 20 }} />}
              action={
                <Button
                  size="small"
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate("/attendance/report")}
                  sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}
                >
                  View Details
                </Button>
              }
              dateFilter={<CardDateFilter value={attFilter} onChange={onAttFilterChange} />}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <AttRing pct={attPct} size={140} color={attPct >= 75 ? C.green : C.amber} gradId="adminAttGrad" />
              <Grid container spacing={1.5} sx={{ flex: 1, minWidth: 160 }}>
                {[
                  { label: "Present", value: present, color: C.green, bg: C.greenGlass },
                  { label: "Absent", value: absent, color: C.red, bg: C.redGlass },
                  { label: "Half Day", value: half_day, color: C.amber, bg: C.amberGlass },
                  { label: "On Leave", value: leave, color: C.blue, bg: C.blueGlass },
                ].map((item) => (
                  <Grid item xs={6} key={item.label}>
                    <Box sx={{ p: 1.5, bgcolor: item.bg, borderRadius: "12px", borderLeft: `3px solid ${item.color}` }}>
                      <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, textTransform: "uppercase", display: "block", fontSize: "10px" }}>
                        {item.label}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: item.color, mt: 0.3 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </CardContent>
        </GCard>
      </Grid>

      <Grid item xs={12} md={5}>
        <GCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <CardHeader
              title="Fee Collection Progress"
              icon={<FeeIcon color="success" sx={{ fontSize: 20 }} />}
              action={
                <Button
                  size="small"
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate("/fees/collect")}
                  sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}
                >
                  Collect Fee
                </Button>
              }
              dateFilter={
                <CardDateFilter
                  value={feeFilter}
                  onChange={onFeeFilterChange}
                  presets={[
                    { key: "week", label: "7 Days" },
                    { key: "month", label: "Month" },
                    { key: "custom", label: "Custom" },
                  ]}
                />
              }
            />
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600 }}>Recovery Rate</Typography>
                <Typography variant="body2" sx={{ color: C.green, fontWeight: 800 }}>{feePct.toFixed(1)}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={feePct}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: C.greenGlass,
                  "& .MuiLinearProgress-bar": { background: `linear-gradient(90deg, ${C.green}, #34D399)`, borderRadius: 5 },
                }}
              />
            </Box>
            {[
              { label: "Total Projected", value: fmtINR(total_fee), color: C.slateText, icon: <TrendIcon sx={{ fontSize: 16, color: C.slateText }} /> },
              { label: "Total Collected", value: fmtINR(total_paid), color: C.green, icon: <PresentIcon sx={{ fontSize: 16, color: C.green }} /> },
              { label: "Total Outstanding", value: fmtINR(total_balance), color: C.red, icon: <WarningIcon sx={{ fontSize: 16, color: C.red }} /> },
            ].map((row) => (
              <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {row.icon}
                  <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600 }}>{row.label}</Typography>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: row.color }}>{row.value}</Typography>
              </Box>
            ))}
          </CardContent>
        </GCard>
      </Grid>

      {/* ─ Row 4: Admissions Lead Pipeline ─ */}
      <Grid item xs={12}>
        <GCard>
          <CardContent sx={{ p: 3 }}>
            <CardHeader
              title="Admissions Lead Pipeline"
              icon={<PersonAddIcon color="primary" sx={{ fontSize: 20 }} />}
              action={
                <Button
                  size="small"
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate("/admissions/leads")}
                  sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}
                >
                  View All
                </Button>
              }
            />
            <Grid container spacing={2}>
              {data.lead_pipeline.map((lp, i) => {
                const pct = totalLeads > 0 ? (lp.count / totalLeads) * 100 : 0;
                return (
                  <Grid item xs={12} sm={6} md={3} key={i}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "14px",
                        border: `1.5px solid ${C.border}`,
                        transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
                        "&:hover": {
                          borderColor: (lp.color_code || C.blue) + "45",
                          bgcolor: (lp.color_code || C.blue) + "08",
                          transform: "translateY(-2px)",
                          boxShadow: `0 4px 16px ${lp.color_code || C.blue}12`,
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Box sx={{ color: lp.color_code || C.blue, display: "flex", alignItems: "center" }}>
                            {getLeadIcon(lp.status)}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: lp.color_code || C.slateText, fontSize: "12px" }}
                          >
                            {lp.status}
                          </Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: lp.color_code || C.slateText }}>
                          {lp.count}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: C.muted, display: "block", mb: 1 }}>
                        {totalLeads > 0 ? `${pct.toFixed(0)}% of pipeline` : "0% of pipeline"}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: "rgba(0,0,0,0.04)",
                          "& .MuiLinearProgress-bar": { bgcolor: lp.color_code || C.blue, borderRadius: 2 },
                        }}
                      />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </GCard>
      </Grid>

      {/* ─ Row 5: Recent Notices ─ */}
      <Grid item xs={12}>
        <GCard>
          <CardContent sx={{ p: 3 }}>
            <CardHeader
              title="Recent Notices"
              icon={<NoticeIcon color="error" sx={{ fontSize: 20 }} />}
              action={
                <Button
                  size="small"
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate("/communication/notices")}
                  sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}
                >
                  View All
                </Button>
              }
            />
            <NoticesTable notices={data.recent_notices} navigate={navigate} />
          </CardContent>
        </GCard>
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
}

const TeacherDashboardView: React.FC<TeacherViewProps> = ({ data, attFilter, onAttFilterChange }) => {
  const navigate = useNavigate();
  const { present, absent, half_day, leave } = data.today_attendance;
  const totalAtt = present + absent + half_day + leave;
  const attPct = totalAtt > 0 ? ((present + half_day * 0.5) / totalAtt) * 100 : 0;

  const totalStudents = data.assigned_classes.reduce((a, c) => a + c.student_count, 0);
  const totalBoys = data.assigned_classes.reduce((a, c) => a + c.boys_count, 0);
  const totalGirls = data.assigned_classes.reduce((a, c) => a + c.girls_count, 0);
  const newThisMonth = data.assigned_classes.reduce((a, c) => a + c.new_this_month, 0);
  const weekAvg =
    data.weekly_trend.length > 0
      ? Math.round(data.weekly_trend.reduce((a, p) => a + p.present_rate, 0) / data.weekly_trend.length)
      : 0;

  return (
    <Grid container spacing={3}>
      {/* ─ Snapshot cards ─ */}
      <Grid item xs={12} sm={6} md={3}>
        <SnapCard
          title="Today's Attendance"
          value={`${present}/${totalAtt || "—"}`}
          icon={<AttendanceIcon fontSize="small" />}
          accentColor={C.blue}
          glassBg={C.blueGlass}
          onClick={() => navigate("/attendance/mark")}
          sub={
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: attPct >= 80 ? C.green : C.amber, fontWeight: 700 }}>
                {attPct.toFixed(0)}% Present
              </Typography>
              <Typography variant="caption" sx={{ color: C.red, fontWeight: 700 }}>
                {absent} Absent
              </Typography>
            </Box>
          }
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <SnapCard
          title="My Students"
          value={totalStudents}
          icon={<PeopleIcon fontSize="small" />}
          accentColor={C.purple}
          glassBg={C.purpleGlass}
          onClick={() => navigate("/students")}
          sub={
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: C.blue, fontWeight: 700 }}>♂ {totalBoys} Boys</Typography>
              <Typography variant="caption" sx={{ color: "#EC4899", fontWeight: 700 }}>♀ {totalGirls} Girls</Typography>
            </Box>
          }
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <SnapCard
          title="Week Avg Attendance"
          value={`${weekAvg}%`}
          icon={<TrendIcon fontSize="small" />}
          accentColor={weekAvg >= 80 ? C.green : C.amber}
          glassBg={weekAvg >= 80 ? C.greenGlass : C.amberGlass}
          sub={
            <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600 }}>
              Based on last 5 school days
            </Typography>
          }
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <SnapCard
          title="New This Month"
          value={newThisMonth}
          icon={<PersonAddIcon fontSize="small" />}
          accentColor={C.green}
          glassBg={C.greenGlass}
          sub={
            <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600 }}>
              New student{newThisMonth !== 1 ? "s" : ""} enrolled
            </Typography>
          }
        />
      </Grid>

      {/* ─ Attendance detail (with date filter) + Classes ─ */}
      <Grid item xs={12} md={5}>
        <GCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <CardHeader
              title="Class Attendance"
              icon={<AttendanceIcon color="primary" sx={{ fontSize: 20 }} />}
              action={
                <Button
                  size="small"
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate("/attendance/mark")}
                  sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}
                >
                  Edit
                </Button>
              }
              dateFilter={
                <CardDateFilter
                  value={attFilter}
                  onChange={onAttFilterChange}
                  presets={[
                    { key: "today", label: "Today" },
                    { key: "week", label: "7 Days" },
                    { key: "custom", label: "Custom" },
                  ]}
                />
              }
            />

            {totalAtt === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <AttendanceIcon sx={{ fontSize: 48, color: C.muted, mb: 1 }} />
                <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600, mb: 2 }}>
                  No attendance marked for this period.
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate("/attendance/mark")}
                  sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, bgcolor: C.blue }}
                >
                  Mark Now
                </Button>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2.5, flexWrap: "wrap" }}>
                  <AttRing pct={attPct} size={110} color={attPct >= 80 ? C.green : C.amber} gradId="teacherAttGrad" />
                  <Box sx={{ flex: 1 }}>
                    {[
                      { label: "Present", value: present, color: C.green },
                      { label: "Absent", value: absent, color: C.red },
                      { label: "Half Day", value: half_day, color: C.amber },
                      { label: "On Leave", value: leave, color: C.blue },
                    ].map((row) => (
                      <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                        <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600 }}>{row.label}</Typography>
                        <Typography variant="body2" sx={{ color: row.color, fontWeight: 800 }}>{row.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </>
            )}

            {/* Absentees */}
            {data.absentees_list.length > 0 && (
              <>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", mb: 1.5 }}>
                  Absent Students ({data.absentees_list.length})
                </Typography>
                <Box sx={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                  {data.absentees_list.map((s, i) => {
                    const colors = ["#EF4444","#3B82F6","#8B5CF6","#10B981","#F59E0B"];
                    const bc = colors[s.student_name.charCodeAt(0) % colors.length];
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1,
                          bgcolor: C.redGlass,
                          borderRadius: "10px",
                          border: `1px solid rgba(220,38,38,0.1)`,
                          transition: "all 0.2s",
                          "&:hover": { borderColor: "rgba(220,38,38,0.22)", transform: "translateX(2px)" },
                        }}
                      >
                        <Avatar sx={{ width: 30, height: 30, bgcolor: bc, fontSize: "12px", fontWeight: 800 }}>
                          {s.student_name.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: C.slateText, lineHeight: 1.2 }}>{s.student_name}</Typography>
                          <Typography variant="caption" sx={{ color: C.muted }}>{s.class_name} · {s.division_name}</Typography>
                        </Box>
                        {s.remarks && (
                          <Tooltip title={s.remarks}>
                            <Chip label="Remark" size="small" sx={{ bgcolor: C.amberGlass, color: C.amber, fontSize: "10px", fontWeight: 700, height: 18, borderRadius: "4px" }} />
                          </Tooltip>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </>
            )}
          </CardContent>
        </GCard>
      </Grid>

      <Grid item xs={12} md={7}>
        <Grid container spacing={3} sx={{ height: "100%" }}>
          {/* My Assigned Classes */}
          <Grid item xs={12}>
            <GCard>
              <CardContent sx={{ p: 3 }}>
                <CardHeader title="My Assigned Classes" icon={<ClassIcon color="primary" sx={{ fontSize: 20 }} />} />
                {data.assigned_classes.length === 0 ? (
                  <Typography variant="body2" sx={{ color: C.muted }}>No assigned classes. Contact administration.</Typography>
                ) : (
                  <Grid container spacing={1.5}>
                    {data.assigned_classes.map((cls, i) => (
                      <Grid item xs={12} sm={6} key={i}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: "12px",
                            border: `1px solid ${C.border}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            transition: "all 0.22s",
                            "&:hover": { borderColor: C.blue + "35", bgcolor: C.blueGlass },
                          }}
                        >
                          <Avatar sx={{ bgcolor: C.blueGlass, color: C.blue, borderRadius: "10px", width: 40, height: 40 }}>
                            <SchoolIcon fontSize="small" />
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.slateText }} noWrap>
                              {cls.class_name} — {cls.division_name}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1.5, mt: 0.25 }}>
                              <Typography variant="caption" sx={{ color: C.blue, fontWeight: 700 }}>{cls.student_count} Students</Typography>
                              <Typography variant="caption" sx={{ color: C.muted }}>♂{cls.boys_count} ♀{cls.girls_count}</Typography>
                            </Box>
                          </Box>
                          {cls.new_this_month > 0 && (
                            <Chip label={`+${cls.new_this_month}`} size="small"
                              sx={{ bgcolor: C.greenGlass, color: C.green, fontWeight: 700, fontSize: "10px", height: 18, borderRadius: "5px" }} />
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </GCard>
          </Grid>

          {/* Weekly Trend */}
          <Grid item xs={12}>
            <GCard>
              <CardContent sx={{ p: 3 }}>
                <CardHeader
                  title="Weekly Attendance Trend"
                  action={
                    <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600 }}>
                      Avg: <strong style={{ color: weekAvg >= 80 ? C.green : C.amber }}>{weekAvg}%</strong>
                    </Typography>
                  }
                />
                <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 120, position: "relative" }}>
                  {[25, 50, 75, 100].map((line) => (
                    <Box
                      key={line}
                      sx={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: `${line}%`,
                        height: 1,
                        borderTop: "1px dashed rgba(0,0,0,0.05)",
                        zIndex: 0,
                      }}
                    />
                  ))}
                  {data.weekly_trend.map((pt, i) => {
                    const h = Math.max((pt.present_rate / 100) * 100, 4);
                    const good = pt.present_rate >= 80;
                    return (
                      <Box key={i} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75, zIndex: 1 }}>
                        <Typography variant="caption" sx={{ color: good ? C.green : C.amber, fontWeight: 800, fontSize: "11px" }}>
                          {pt.present_rate > 0 ? `${pt.present_rate}%` : "—"}
                        </Typography>
                        <Tooltip title={`${pt.date}: ${pt.present_rate}%`}>
                          <Box
                            sx={{
                              width: "100%",
                              height: `${h}px`,
                              borderRadius: "6px 6px 0 0",
                              background: good ? `linear-gradient(to top, ${C.green}, #4ADE80)` : `linear-gradient(to top, ${C.amber}, #FCD34D)`,
                              boxShadow: `0 2px 8px ${good ? C.green : C.amber}25`,
                              animation: `riseUp 1s ease ${i * 0.08}s both`,
                            }}
                          />
                        </Tooltip>
                        <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, fontSize: "11px" }}>
                          {pt.date}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </GCard>
          </Grid>
        </Grid>
      </Grid>

      {/* ─ Quick Mark CTA + Notices ─ */}
      <Grid item xs={12} md={4}>
        <Card
          elevation={0}
          sx={{
            borderRadius: "20px",
            background: `linear-gradient(135deg, ${C.blue} 0%, ${C.blueDark} 100%)`,
            color: "#fff",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 12px 30px -10px rgba(37,99,235,0.4)",
            "&::before": {
              content: '""',
              position: "absolute",
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              filter: "blur(12px)",
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <QuickMarkIcon sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>Quick Mark</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mb: 0.5 }}>
              {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Typography>
            {data.assigned_classes[0] && (
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5 }}>
                {data.assigned_classes[0].class_name} — {data.assigned_classes[0].division_name}
              </Typography>
            )}
            <Chip
              label={totalAtt > 0 ? "✓ Marked Today" : "Not Marked Yet"}
              size="small"
              sx={{ bgcolor: totalAtt > 0 ? "rgba(74,222,128,0.25)" : "rgba(252,211,77,0.25)", color: totalAtt > 0 ? "#4ADE80" : "#FCD34D", fontWeight: 700, mb: 2, borderRadius: "6px", fontSize: "11px" }}
            />
            <Button
              variant="contained"
              endIcon={<ArrowIcon />}
              onClick={() => navigate("/attendance/mark")}
              sx={{ bgcolor: "#fff", color: C.blue, fontWeight: 800, borderRadius: "10px", textTransform: "none", "&:hover": { bgcolor: "rgba(255,255,255,0.9)" } }}
            >
              Go to Attendance
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <GCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <CardHeader
              title="Recent Notices"
              icon={<NoticeIcon color="error" sx={{ fontSize: 20 }} />}
              action={
                <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/communication/notices")}
                  sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                  View All
                </Button>
              }
            />
            <NoticesTable notices={data.recent_notices} navigate={navigate} />
          </CardContent>
        </GCard>
      </Grid>
    </Grid>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const StudentDashboardView: React.FC<{ data: StudentDashboardData }> = ({ data }) => {
  const navigate = useNavigate();
  const { profile, attendance, fee_status, class_teacher, homework, recent_notices } = data;
  const { total_fee, total_paid, total_balance, is_overdue, next_due_date } = fee_status;
  const feePct = total_fee > 0 ? (total_paid / total_fee) * 100 : 0;
  const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <Grid container spacing={3}>
      {/* ─ Profile hero banner ─ */}
      <Grid item xs={12}>
        <Card
          elevation={0}
          sx={{
            borderRadius: "24px",
            background: "linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)",
            color: "#fff",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 20px 40px -15px rgba(15,23,42,0.4)",
          }}
        >
          <Box sx={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", filter: "blur(20px)" }} />
          <svg style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.12, pointerEvents: "none", width: 320, height: 100 }} viewBox="0 0 200 100" preserveAspectRatio="none">
            <path d="M0,75 Q50,35 100,75 T200,75 L200,100 L0,100 Z" fill="rgba(59,130,246,0.5)" />
            <path d="M0,85 Q60,55 120,85 T200,85 L200,100 L0,100 Z" fill="rgba(236,72,153,0.3)" />
          </svg>
          <CardContent sx={{ p: { xs: 3, sm: 4.5 }, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", gap: 3.5, position: "relative", zIndex: 1 }}>
            <Avatar
              src={profile.photo_url || ""}
              sx={{ width: 96, height: 96, border: "3px solid rgba(255,255,255,0.22)", bgcolor: "#fff", color: "#1E3A8A", fontSize: "34px", fontWeight: 900, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
            >
              {profile.student_name.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1, textAlign: { xs: "center", sm: "left" } }}>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.75, letterSpacing: "-0.3px" }}>
                Hi, {profile.student_name}! 👋
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", opacity: 0.85, mb: 1.5, justifyContent: { xs: "center", sm: "flex-start" } }}>
                {profile.roll_no && <Typography variant="body2">Roll: <strong>{profile.roll_no}</strong></Typography>}
                {profile.admission_no && <Typography variant="body2">Adm No: <strong>{profile.admission_no}</strong></Typography>}
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: { xs: "center", sm: "flex-start" } }}>
                {profile.class_name && (
                  <Chip label={profile.class_name + (profile.division_name ? ` — ${profile.division_name}` : "")} size="small"
                    sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 700, borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)" }} />
                )}
                <Chip label="2025–26" size="small"
                  sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 700, borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)" }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ─ My Profile ─ */}
      <Grid item xs={12} md={3}>
        <GCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <CardHeader
              title="My Profile"
              action={
                <Tooltip title="Edit Profile">
                  <IconButton size="small" onClick={() => navigate("/profile")} sx={{ color: C.blue }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {[
                { label: "Name", value: profile.student_name },
                { label: "Class", value: profile.class_name ? `${profile.class_name}${profile.division_name ? ` — ${profile.division_name}` : ""}` : "N/A" },
                { label: "Roll No", value: profile.roll_no || "—" },
                { label: "Adm No", value: profile.admission_no || "—" },
                { label: "Adm Date", value: profile.admission_date || "—" },
                { label: "Parent", value: profile.parent_name || "—" },
                { label: "Contact", value: profile.parent_phone || "—" },
              ].map((row) => (
                <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, flexShrink: 0 }}>{row.label}</Typography>
                  <Typography variant="caption" sx={{ color: C.slateText, fontWeight: 700, textAlign: "right", maxWidth: 140 }} noWrap>
                    {row.value}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Button variant="outlined" size="small" fullWidth onClick={() => navigate("/profile")}
              sx={{ mt: 2.5, borderRadius: "8px", textTransform: "none", fontWeight: 700, borderColor: C.border, color: C.slateText }}>
              View / Edit Profile
            </Button>
          </CardContent>
        </GCard>
      </Grid>

      {/* ─ Attendance ─ */}
      <Grid item xs={12} md={3}>
        <GCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <CardHeader title="My Attendance" />
            <AttRing
              pct={attendance.percentage}
              size={130}
              color={attendance.percentage >= 75 ? C.green : C.red}
              gradId="studAttGrad"
            />
            <Grid container spacing={1.5} sx={{ mt: 2, width: "100%" }}>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: C.greenGlass, borderRadius: "10px", textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, display: "block" }}>Present</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: C.green }}>{attendance.present} Days</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: C.redGlass, borderRadius: "10px", textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: C.muted, fontWeight: 700, display: "block" }}>Absent</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: C.red }}>{attendance.absent} Days</Typography>
                </Box>
              </Grid>
            </Grid>
            <Button variant="text" size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/attendance/report")}
              sx={{ mt: 2, color: C.blue, fontWeight: 700, textTransform: "none" }}>
              View History
            </Button>
          </CardContent>
        </GCard>
      </Grid>

      {/* ─ Fee Status ─ */}
      <Grid item xs={12} md={3}>
        <GCard sx={{ height: "100%" }}>
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
              <LinearProgress
                variant="determinate"
                value={feePct}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "rgba(0,0,0,0.04)",
                  "& .MuiLinearProgress-bar": {
                    background: is_overdue ? `linear-gradient(90deg, ${C.amber}, #FCD34D)` : `linear-gradient(90deg, ${C.green}, #34D399)`,
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            {[
              { label: "Total Fees", value: fmtINR(total_fee), color: C.slateText },
              { label: "Paid", value: fmtINR(total_paid), color: C.green },
              { label: "Balance", value: fmtINR(total_balance), color: total_balance > 0 ? C.red : C.green },
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
      </Grid>

      {/* ─ Homework ─ */}
      <Grid item xs={12} md={3}>
        <GCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3, display: "flex", flexDirection: "column" }}>
            <CardHeader title="Homework" />
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 2 }}>
              <Avatar
                sx={{
                  bgcolor: homework.pending_count > 0 ? C.amberGlass : C.greenGlass,
                  color: homework.pending_count > 0 ? C.amber : C.green,
                  width: 60,
                  height: 60,
                  borderRadius: "14px",
                  mb: 2,
                }}
              >
                <HomeworkIcon sx={{ fontSize: 30 }} />
              </Avatar>
              {homework.pending_count === 0 ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: C.green, textAlign: "center" }}>
                    No homework assigned
                  </Typography>
                  <Typography variant="caption" sx={{ color: C.muted, mt: 0.5, textAlign: "center" }}>
                    Great going! 🎉
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: C.amber, letterSpacing: "-1px" }}>
                    {homework.pending_count}
                  </Typography>
                  <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600, textAlign: "center" }}>
                    Pending assignment{homework.pending_count !== 1 ? "s" : ""}
                  </Typography>
                </>
              )}
            </Box>
            <Button variant="text" size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/homework")}
              sx={{ color: C.blue, fontWeight: 700, textTransform: "none" }}>
              View All
            </Button>
          </CardContent>
        </GCard>
      </Grid>

      {/* ─ Notices + Academic Info ─ */}
      <Grid item xs={12} md={7}>
        <GCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <CardHeader
              title="Latest Notices"
              icon={<NoticeIcon color="error" sx={{ fontSize: 20 }} />}
              action={
                <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate("/communication/notices")}
                  sx={{ color: C.blue, fontWeight: 700, textTransform: "none", fontSize: 12 }}>
                  View All
                </Button>
              }
            />
            <NoticesTable notices={recent_notices} navigate={navigate} />
          </CardContent>
        </GCard>
      </Grid>

      <Grid item xs={12} md={5}>
        <GCard sx={{ height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <CardHeader title="Academic Info" icon={<SchoolIcon color="primary" sx={{ fontSize: 20 }} />} />
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {[
                { label: "Class", value: profile.class_name ? `${profile.class_name}${profile.division_name ? ` — ${profile.division_name}` : ""}` : "N/A" },
                { label: "Academic Year", value: "2025–26" },
                { label: "Admission Date", value: profile.admission_date || "—" },
                { label: "Class Teacher", value: class_teacher || "Not Assigned" },
                { label: "Admission No", value: profile.admission_no || "—" },
              ].map((row, i, arr) => (
                <Box
                  key={row.label}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 1.5,
                    borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 0,
                  }}
                >
                  <Typography variant="body2" sx={{ color: C.muted, fontWeight: 600 }}>{row.label}</Typography>
                  <Typography variant="body2" sx={{ color: C.slateText, fontWeight: 700 }}>{row.value}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </GCard>
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

  const seqRef = useRef(0);

  const fetchData = useCallback(
    async (isRefresh = false, af: SectionDateFilter = attFilter, ff: SectionDateFilter = feeFilter) => {
      const seq = ++seqRef.current;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const attDates = effectiveDates(af);
        const feeDates = effectiveDates(ff);

        const params: DashboardFetchParams = {
          attStart: attDates.start,
          attEnd: attDates.end,
          feeStart: feeDates.start,
          feeEnd: feeDates.end,
        };

        const res = await dashboardService.getDashboardData(params);
        if (seq === seqRef.current) setData(res);
      } catch {
        if (seq === seqRef.current) setError("Failed to load dashboard. Please try again.");
      } finally {
        if (seq === seqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [attFilter, feeFilter]
  );

  // Initial load + 5-minute auto-refresh
  useEffect(() => {
    let active = true;
    fetchData();
    const id = setInterval(() => { if (active) fetchData(true); }, 5 * 60 * 1000);
    return () => { active = false; clearInterval(id); };
  }, [fetchData]);

  const handleAttFilterChange = useCallback(
    (f: SectionDateFilter) => {
      setAttFilter(f);
      fetchData(false, f, feeFilter);
    },
    [feeFilter, fetchData]
  );

  const handleFeeFilterChange = useCallback(
    (f: SectionDateFilter) => {
      setFeeFilter(f);
      fetchData(false, attFilter, f);
    },
    [attFilter, fetchData]
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
          />
        ) : data.role === "TEACHER" ? (
          <TeacherDashboardView
            data={data.data as TeacherDashboardData}
            attFilter={attFilter}
            onAttFilterChange={handleAttFilterChange}
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
