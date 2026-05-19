import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Snackbar,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Paper,
  alpha,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import {
  Add as AddIcon,
  Assignment as HomeworkIcon,
  CalendarMonth as CalendarIcon,
  Book as SubjectIcon,
  Person as PersonIcon,
  CheckCircle as ActiveIcon,
  Warning as OverdueIcon,
  ChevronRight as ViewIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { PageHeader } from "../../components/layout";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
} from "../../components/reusable";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useHomeworkListController } from "../../hooks/useHomeworkListController";
import { useRBAC } from "../../context/RBACContext";
import { useAuth } from "../../context/AuthContext";
import studentService from "../../api/services/studentService";
import { colorTokens } from "../../tokens/colors";
import {
  isStudentHomeworkUser,
  isParentHomeworkUser,
} from "../../utils/homeworkAudience";
import {
  createHomeworkListConfig,
  type HomeworkRow,
} from "./HomeworkList.listConfig";

// Subject pill color helper
const getSubjectColor = (subjectName: string | null) => {
  const name = subjectName || "General";
  const colors = [
    { bg: "rgba(255, 107, 107, 0.1)", text: "#FF6B6B" }, // Coral
    { bg: "rgba(78, 205, 196, 0.1)", text: "#3AB8AF" }, // Turquoise
    { bg: "rgba(159, 122, 234, 0.1)", text: "#9F7AEA" }, // Lavender
    { bg: "rgba(246, 173, 85, 0.1)", text: "#ED8936" }, // Peach
    { bg: "rgba(72, 187, 120, 0.1)", text: "#38A169" }, // Mint
    { bg: "rgba(66, 153, 225, 0.1)", text: "#3182CE" }, // Blue
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function HomeworkList() {
  const navigate = useNavigate();
  const controller = useHomeworkListController();
  const { hasPermission, roles } = useRBAC();
  const { user } = useAuth();
  const canView = hasPermission("HOMEWORK_MGMT:view");

  const isStudent = useMemo(() => isStudentHomeworkUser(user?.role, roles), [user?.role, roles]);
  const isParent = useMemo(() => isParentHomeworkUser(user?.role, roles), [user?.role, roles]);

  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [tabValue, setTabValue] = useState(0); // 0: All, 1: Active, 2: Overdue

  // Fetch student profile or parent's children info
  useEffect(() => {
    if (!controller.readOnlyAudience) return;

    studentService.list({ limit: 100 })
      .then((res) => {
        if (isStudent) {
          const matched = res.items.find(
            (s: any) =>
              s.email?.toLowerCase() === user?.email?.toLowerCase() ||
              s.name?.toLowerCase() === user?.full_name?.toLowerCase()
          );
          if (matched) {
            setChildren([matched]);
            setSelectedChild(matched);
          } else {
            const fallbackStudent = {
              id: "fallback-student",
              name: user?.full_name || "Student",
              roll_no: "N/A",
              class_name: "Active Student",
              class_division_name: "",
            };
            setChildren([fallbackStudent]);
            setSelectedChild(fallbackStudent);
          }
        } else if (isParent) {
          const matched = res.items.filter(
            (s: any) =>
              s.parent_name?.toLowerCase() === user?.full_name?.toLowerCase() ||
              (user?.phone_number && s.parent_mobile === user?.phone_number)
          );

          if (matched.length > 0) {
            setChildren(matched);
            setSelectedChild(matched[0]);
          } else {
            if (controller.homework.length > 0) {
              const uniqueChildrenFromHomework = Array.from(
                new Set(controller.homework.map(h => h.class_name))
              ).map((className, idx) => ({
                id: `hw-child-${idx}`,
                name: `Child ${idx + 1}`,
                roll_no: "—",
                class_name: className,
                class_division_name: controller.homework.find(h => h.class_name === className)?.division_name || "",
              }));
              setChildren(uniqueChildrenFromHomework);
              setSelectedChild(uniqueChildrenFromHomework[0]);
            } else {
              const fallbackChild = {
                id: "fallback-child",
                name: "Your Child",
                roll_no: "—",
                class_name: "Assigned Class",
                class_division_name: "",
              };
              setChildren([fallbackChild]);
              setSelectedChild(fallbackChild);
            }
          }
        }
      })
      .catch((err) => {
        console.error("Error loading student/child info:", err);
        const fallback = {
          id: "fallback-err",
          name: user?.full_name || "Student",
          roll_no: "N/A",
          class_name: "Assigned Class",
          class_division_name: "",
        };
        setChildren([fallback]);
        setSelectedChild(fallback);
      });
  }, [controller.readOnlyAudience, isStudent, isParent, user, controller.homework]);

  // Locally filtered homework based on child selection
  const filteredHomeworkByChild = useMemo(() => {
    if (!selectedChild || selectedChild.id?.toString().startsWith("fallback")) {
      return controller.homework;
    }

    if (selectedChild.id?.toString().startsWith("hw-child")) {
      return controller.homework.filter(h => h.class_name === selectedChild.class_name);
    }

    return controller.homework.filter((h) => {
      const childClassId = Number(selectedChild.classId || selectedChild.class_id);
      const childClassName = (selectedChild.className || selectedChild.class_name || selectedChild.class_)?.toLowerCase();

      if (!isNaN(childClassId) && childClassId > 0 && h.class_id === childClassId) {
        return true;
      }

      if (childClassName && h.class_name && childClassName.includes(h.class_name.toLowerCase())) {
        return true;
      }

      return false;
    });
  }, [controller.homework, selectedChild]);

  // Compute metrics and active ratio
  const stats = useMemo(() => {
    const list = filteredHomeworkByChild;
    const totalCount = list.length;

    let activeCount = 0;
    let overdueCount = 0;
    const subjects = new Set<string>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    list.forEach((h) => {
      if (h.subject_name) {
        subjects.add(h.subject_name);
      }

      const submission = new Date(h.submission_date);
      if (submission < today) {
        overdueCount++;
      } else {
        activeCount++;
      }
    });

    const activeRatio = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

    return {
      total: totalCount,
      active: activeCount,
      overdue: overdueCount,
      subjectsCount: subjects.size,
      activeRatio,
    };
  }, [filteredHomeworkByChild]);

  // Filter homework by tab (All, Active, Overdue)
  const finalHomeworkList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return filteredHomeworkByChild.filter((h) => {
      const submission = new Date(h.submission_date);
      const isOverdue = submission < today;

      if (tabValue === 1) return !isOverdue;
      if (tabValue === 2) return isOverdue;
      return true;
    });
  }, [filteredHomeworkByChild, tabValue]);

  const listConfig = createHomeworkListConfig({
    navigate,
    onDeleteClick: controller.handleDeleteClick,
    canEdit: hasPermission("HOMEWORK_MGMT:edit"),
    canDelete: hasPermission("HOMEWORK_MGMT:delete"),
    emptyMessage: controller.readOnlyAudience
      ? "No homework assigned for your class yet."
      : "No homework found. Click 'Assign Homework' to create one.",
  });

  if (!canView) {
    return (
      <ListPageLayout
        header={
          <PageHeader
            links={[{ title: "Homework", path: "#" }]}
            homePath="/"
          />
        }
      >
        <Alert severity="error" sx={{ m: 2 }}>
          Access Denied: You do not have permission to view this page.
        </Alert>
      </ListPageLayout>
    );
  }

  // Render Premium Student/Parent Dashboard View
  if (controller.readOnlyAudience) {
    return (
      <ListPageLayout
        pageBackground
        contentPaddingSize="none"
        header={
          <PageHeader
            links={[{ title: "Homework", path: "#" }]}
            homePath="/"
          />
        }
      >
        <Box
          sx={{
            px: { xs: 1.5, sm: 3 },
            py: { xs: 2, sm: 3 },
            mt: { xs: -0.5, sm: -1.5 },
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2.5, sm: 3.5 },
            width: "100%",
            maxWidth: 1400,
            mx: "auto",
          }}
        >
          {/* Child Switcher Pill row for Parents */}
          {isParent && children.length > 1 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: colorTokens.sidebar.text.primary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Select Child:
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {children.map((child) => (
                  <Chip
                    key={child.id}
                    label={child.name}
                    onClick={() => setSelectedChild(child)}
                    variant={selectedChild?.id === child.id ? "filled" : "outlined"}
                    avatar={
                      <Avatar src={child.photo_url || undefined} sx={{ bgcolor: selectedChild?.id === child.id ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.05)" }}>
                        {child.name[0]}
                      </Avatar>
                    }
                    sx={{
                      fontWeight: 700,
                      px: 1,
                      py: 2.5,
                      borderRadius: "16px",
                      bgcolor: selectedChild?.id === child.id ? colorTokens.primary.main : "#ffffff",
                      color: selectedChild?.id === child.id ? "#ffffff" : colorTokens.sidebar.text.primary,
                      border: `1.5px solid ${selectedChild?.id === child.id ? colorTokens.primary.main : colorTokens.border.default}`,
                      boxShadow: selectedChild?.id === child.id ? `0 6px 16px ${alpha(colorTokens.primary.main, 0.3)}` : "none",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 6px 12px ${alpha(colorTokens.primary.main, 0.15)}`,
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Student Profile Overview Banner */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: "24px",
              border: "none",
              background: `linear-gradient(135deg, ${colorTokens.primary.main} 0%, ${colorTokens.preschool.turquoise.main} 100%)`,
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
              boxShadow: `0 12px 30px ${alpha(colorTokens.primary.main, 0.25)}`,
              color: "#ffffff",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background Decorative Elements */}
            <Box sx={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.1)", zIndex: 0 }} />
            <Box sx={{ position: "absolute", bottom: -80, left: '20%', width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.05)", zIndex: 0 }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 3, width: { xs: "100%", md: "auto" }, zIndex: 1 }}>
              <Avatar
                src={selectedChild?.photo_url || undefined}
                sx={{
                  width: 100,
                  height: 100,
                  border: "4px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  color: "#ffffff"
                }}
              >
                {selectedChild?.name?.[0] || "S"}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: "-0.5px" }}>
                  {selectedChild?.name || "Student Profile"}
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
                  <Chip
                    size="small"
                    label={`Roll No. ${selectedChild?.roll_no || "—"}`}
                    sx={{ fontWeight: 800, bgcolor: "rgba(255, 255, 255, 0.2)", color: "#ffffff", backdropFilter: "blur(10px)" }}
                  />
                  <Typography variant="body1" sx={{ fontWeight: 700, opacity: 0.9 }}>
                    Class {selectedChild?.class_name || selectedChild?.className || "—"} {[selectedChild?.class_division_name, selectedChild?.division_name].filter(Boolean).join(" - ") ? `- ${[selectedChild?.class_division_name, selectedChild?.division_name].filter(Boolean).join(" - ")}` : ""}
                  </Typography>
                </Stack>
                {selectedChild?.admission_no && (
                  <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mt: 1, fontWeight: 600 }}>
                    Admission No: {selectedChild?.admission_no}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 4, md: 6 }, zIndex: 1, flexDirection: { xs: "row", sm: "row" }, width: { xs: "100%", md: "auto" }, justifyContent: "space-around" }}>
              {/* Circular Gauge Ring */}
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Box sx={{ position: "relative", display: "inline-flex" }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={110}
                    thickness={5}
                    sx={{ color: "rgba(255, 255, 255, 0.2)" }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={stats.activeRatio || 1}
                    size={110}
                    thickness={5}
                    sx={{
                      color: "#ffffff",
                      position: "absolute",
                      left: 0,
                      strokeLinecap: "round",
                    }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: "absolute",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="h5" component="div" sx={{ fontWeight: 800, color: "#ffffff" }}>
                      {stats.activeRatio}%
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ mt: 1, fontWeight: 700, color: "rgba(255,255,255,0.9)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Completion Rate
                </Typography>
              </Box>

              {/* Attendance-style Homework Metrics inside Banner */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", display: "block", fontWeight: 700, textTransform: "uppercase" }}>
                    Total Tasks
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {stats.total}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", display: "block", fontWeight: 700, textTransform: "uppercase" }}>
                    Subjects
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {stats.subjectsCount}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Metrics Quick Cards Row */}
          <Grid container spacing={3}>
            {/* Total Assigned */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: `1.5px solid ${colorTokens.border.subtle}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 25px rgba(0,0,0,0.06)" }
                }}
              >
                <Avatar sx={{ bgcolor: "rgba(66, 153, 225, 0.1)", color: "#3182CE", width: 64, height: 64 }}>
                  <HomeworkIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: "#718096", fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                    TOTAL ASSIGNED
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: "#2D3748" }}>
                    {stats.total}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Active */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: `1.5px solid ${colorTokens.border.subtle}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 25px rgba(0,0,0,0.06)" }
                }}
              >
                <Avatar sx={{ bgcolor: "rgba(72, 187, 120, 0.1)", color: "#38A169", width: 64, height: 64 }}>
                  <ActiveIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: "#718096", fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                    DUE SOON
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: "#38A169" }}>
                    {stats.active}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Overdue */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: `1.5px solid ${colorTokens.border.subtle}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.02)",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 25px rgba(0,0,0,0.06)" }
                }}
              >
                <Avatar sx={{ bgcolor: "rgba(255, 107, 107, 0.1)", color: "#FF6B6B", width: 64, height: 64 }}>
                  <OverdueIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: "#718096", fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                    OVERDUE TASKS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: "#FF6B6B" }}>
                    {stats.overdue}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Homework list container card */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 4 },
              borderRadius: "24px",
              border: `1px solid ${colorTokens.border.default}`,
              background: "#FFFFFF",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              minHeight: 400,
            }}
          >
            {/* Tab header controller */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
                mb: 4,
                borderBottom: `2px solid ${alpha(colorTokens.border.subtle, 0.5)}`,
                pb: 1.5,
              }}
            >
              <Tabs
                value={tabValue}
                onChange={(e, v) => setTabValue(v)}
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  "& .MuiTab-root": { fontWeight: 800, px: 3, fontSize: "0.95rem", color: colorTokens.sidebar.text.secondary, textTransform: "none", minWidth: 120 },
                  "& .Mui-selected": { color: `${colorTokens.primary.main} !important` },
                  "& .MuiTabs-indicator": { height: "4px", borderRadius: "4px 4px 0 0" },
                }}
              >
                <Tab label="All Tasks" />
                <Tab label={`Active (${stats.active})`} />
                <Tab label={`Overdue (${stats.overdue})`} />
              </Tabs>
              <Typography variant="body2" sx={{ color: colorTokens.sidebar.text.secondary, fontWeight: 700, px: 2, py: 1, bgcolor: alpha(colorTokens.border.subtle, 0.3), borderRadius: "12px" }}>
                Showing {finalHomeworkList.length} of {filteredHomeworkByChild.length} items
              </Typography>
            </Box>

            {/* Main Homework List view */}
            {controller.loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexGrow: 1, py: 8 }}>
                <CircularProgress size={48} thickness={4} />
              </Box>
            ) : finalHomeworkList.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 10, px: 2, flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <HomeworkIcon sx={{ fontSize: 80, color: "rgba(0, 0, 0, 0.08)", mb: 3 }} />
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#2D3748", mb: 1 }}>
                  No Tasks Found
                </Typography>
                <Typography variant="body1" sx={{ color: colorTokens.sidebar.text.secondary, maxWidth: 400, mx: "auto" }}>
                  {tabValue === 1
                    ? "Great job! There are no pending homework tasks for this child right now."
                    : tabValue === 2
                      ? "Awesome! No overdue homework tasks to worry about."
                      : "No homework has been assigned yet."}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {finalHomeworkList.map((hw) => {
                  const isOverdue = new Date(hw.submission_date) < new Date();
                  const subColor = getSubjectColor(hw.subject_name);

                  return (
                    <Grid key={hw.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: "20px",
                          border: `1.5px solid ${alpha(colorTokens.border.default, 0.6)}`,
                          bgcolor: "#fafafa",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            borderColor: colorTokens.primary.main,
                            transform: "translateY(-6px)",
                            boxShadow: `0 12px 30px ${alpha(colorTokens.primary.main, 0.12)}`,
                            bgcolor: "#ffffff"
                          },
                        }}
                      >
                        <CardContent sx={{ p: 3, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                          {/* Subject and state */}
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5 }}>
                            <Chip
                              label={hw.subject_name || "General"}
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.75rem",
                                bgcolor: subColor.bg,
                                color: subColor.text,
                                borderRadius: "10px",
                                px: 1
                              }}
                            />
                            <Chip
                              label={isOverdue ? "Overdue" : "Active"}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.7rem",
                                borderRadius: "10px",
                                bgcolor: isOverdue ? "rgba(255, 107, 107, 0.1)" : "rgba(72, 187, 120, 0.1)",
                                color: isOverdue ? "#FF6B6B" : "#38A169"
                              }}
                            />
                          </Box>

                          {/* Homework Title */}
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 800,
                              color: "#1A202C",
                              lineHeight: 1.35,
                              mb: 2.5,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              height: "2.7em",
                            }}
                          >
                            {hw.title}
                          </Typography>

                          {/* Informational Blocks */}
                          <Stack spacing={1.5} sx={{ mb: 3, mt: "auto" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(colorTokens.sidebar.text.secondary, 0.1), color: colorTokens.sidebar.text.secondary }}>
                                <PersonIcon sx={{ fontSize: 16 }} />
                              </Avatar>
                              <Typography variant="body2" sx={{ color: colorTokens.sidebar.text.primary, fontWeight: 700 }}>
                                {hw.teacher_name || "Assigned Teacher"}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(colorTokens.sidebar.text.secondary, 0.1), color: colorTokens.sidebar.text.secondary }}>
                                <CalendarIcon sx={{ fontSize: 16 }} />
                              </Avatar>
                              <Typography variant="body2" sx={{ color: colorTokens.sidebar.text.primary, fontWeight: 700 }}>
                                Assigned: {formatDate(hw.assigned_date)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: isOverdue ? alpha(colorTokens.error.main, 0.1) : alpha(colorTokens.warning.main, 0.15), color: isOverdue ? colorTokens.error.main : colorTokens.warning.dark }}>
                                <CalendarIcon sx={{ fontSize: 16 }} />
                              </Avatar>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: isOverdue ? colorTokens.error.main : colorTokens.warning.dark,
                                  fontWeight: 800,
                                }}
                              >
                                Due: {formatDate(hw.submission_date)}
                              </Typography>
                            </Box>
                          </Stack>

                          {/* Attachment Indicator */}
                          {hw.attachments && hw.attachments.length > 0 && (
                            <Box
                              sx={{
                                mt: 1,
                                p: 1.5,
                                borderRadius: "12px",
                                bgcolor: alpha(colorTokens.primary.main, 0.05),
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Avatar sx={{ width: 26, height: 26, bgcolor: alpha(colorTokens.primary.main, 0.15), color: colorTokens.primary.main }}>
                                <DownloadIcon sx={{ fontSize: 14 }} />
                              </Avatar>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: colorTokens.primary.main, fontSize: "0.75rem" }}>
                                {hw.attachments.length} {hw.attachments.length === 1 ? "File Attached" : "Files Attached"}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>

                        {/* Footer card action */}
                        <Box sx={{ p: 2, pt: 0 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            disableElevation
                            onClick={() => navigate(`/homework/${hw.id}`)}
                            endIcon={<ViewIcon />}
                            sx={{
                              borderRadius: "14px",
                              py: 1.2,
                              fontWeight: 800,
                              bgcolor: colorTokens.primary.main,
                              "&:hover": {
                                bgcolor: colorTokens.primary.dark,
                              },
                            }}
                          >
                            View Details
                          </Button>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Paper>
        </Box>
      </ListPageLayout>
    );
  }

  // Standard Admin/Teacher Grid Table View
  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      header={
        <PageHeader
          links={[{ title: "Homework", path: "#" }]}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={controller.search}
              onSearchChange={controller.setSearch}
              searchPlaceholder="Search homework by title..."
              filters={
                controller.readOnlyAudience
                  ? []
                  : [
                    {
                      label: "Academic Year",
                      value: controller.academicYearFilter,
                      onChange: controller.setAcademicYearFilter,
                      options: controller.academicYearOptions,
                    },
                    {
                      label: "Class",
                      value: controller.classFilter,
                      onChange: controller.setClassFilter,
                      options: controller.classOptions,
                    },
                    {
                      label: "Status",
                      value: controller.statusFilter,
                      onChange: controller.setStatusFilter,
                      options: controller.statusOptions,
                    },
                  ]
              }
              {...(hasPermission("HOMEWORK_MGMT:create")
                ? {
                  onAddClick: () => navigate("/homework/new"),
                  addLabel: "Assign Homework",
                  addIcon: <AddIcon sx={{ fontSize: 24 }} />,
                }
                : {})}
            />
          }
        />
      }
    >
      {controller.error && (
        <Alert
          severity="error"
          sx={{ m: 2 }}
          onClose={() => controller.setError(null)}
        >
          {controller.error}
        </Alert>
      )}

      <EntityTableSection<HomeworkRow>
        label="Homework"
        totalRows={controller.total}
        page={controller.page}
        rowsPerPage={controller.rowsPerPage}
        onPageChange={controller.setPage}
        onRowsPerPageChange={controller.setRowsPerPage}
        columns={listConfig.columns}
        data={controller.homework}
        loading={controller.loading}
        emptyMessage={listConfig.uiPolicy.emptyMessage}
        rowActions={listConfig.actions.rowActions}
        stickyHeader
        size="small"
      />

      <ConfirmDialog
        open={controller.deleteDialogOpen}
        title="Delete Homework?"
        message={`Are you sure you want to delete "${controller.selectedRow?.title}"? This action cannot be undone.`}
        confirmText={controller.deleteLoading ? "Deleting..." : "Delete"}
        onConfirm={controller.handleConfirmDelete}
        onCancel={() => controller.setDeleteDialogOpen(false)}
        loading={controller.deleteLoading}
      />

      <Snackbar
        open={!!controller.success}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => controller.setSuccess(null)}
      >
        <Alert
          onClose={() => controller.setSuccess(null)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {controller.success}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}
