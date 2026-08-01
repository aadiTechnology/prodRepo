import { useState, useEffect, useMemo } from "react";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../../utils/listPagination";
import { useNavigate } from "react-router-dom";
import {
  Alert,
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
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import {
  Add as AddIcon,
  Assignment as HomeworkIcon,
  CalendarMonth as CalendarIcon,
  Book as SubjectIcon,
  Person as PersonIcon,
  DoneAll as ReadIcon,
  MarkEmailUnread as UnreadIcon,
  ChevronRight as ViewIcon,
  Download as DownloadIcon,
  ViewList as ListIcon,
  GridView as GridIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { PageHeader, PageLayout } from "../../components/layout";
import { AppCard } from "../../components/primitives";
import {
  ListPageLayout,
  ListPageToolbar,
  EntityTableSection,
  TablePaginationBar,
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
  renderHomeworkRowActions,
  type HomeworkRow,
} from "./HomeworkList.listConfig";
import { getHomeworkStatusChipProps } from "../../utils/homeworkStatus";

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
  const theme = useTheme();
  const isCompactTable = useMediaQuery(theme.breakpoints.down("lg"));
  const controller = useHomeworkListController();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission, roles } = useRBAC();
  const { user } = useAuth();
  const canView = hasPermission("HOMEWORK_MGMT:view");

  useEffect(() => {
    if (!controller.success) return;
    enqueueSnackbar(controller.success, {
      variant: "success",
      autoHideDuration: 3000,
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
    controller.setSuccess(null);
  }, [controller.success, controller.setSuccess, enqueueSnackbar]);

  useEffect(() => {
    if (!controller.error) return;
    enqueueSnackbar(controller.error, {
      variant: "error",
      autoHideDuration: 4000,
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
    controller.setError(null);
  }, [controller.error, controller.setError, enqueueSnackbar]);

  const isStudent = useMemo(() => isStudentHomeworkUser(user?.role, roles), [user?.role, roles]);
  const isParent = useMemo(() => isParentHomeworkUser(user?.role, roles), [user?.role, roles]);

  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [tabValue, setTabValue] = useState(0); // 0: All, 1: Active
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [listPage, setListPage] = useState(0);
  const [listRowsPerPage, setListRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);

  useEffect(() => {
    setListPage(0);
  }, [selectedChild?.id]);

  // Parents need child selection for multi-child filtering.
  // Students: homework API is already scoped to the authenticated student — do not
  // resolve identity via studentService.list / name / email matching.
  useEffect(() => {
    if (!controller.readOnlyAudience || isStudent || !isParent) return;

    studentService
      .list({ limit: 100 })
      .then((res) => {
        const matched = res.items.filter(
          (s: any) =>
            s.parent_name?.toLowerCase() === user?.full_name?.toLowerCase() ||
            (user?.phone_number && s.parent_mobile === user?.phone_number)
        );

        if (matched.length > 0) {
          setChildren(matched);
          setSelectedChild(matched[0]);
        } else if (controller.homework.length > 0) {
          const uniqueChildrenFromHomework = Array.from(
            new Set(controller.homework.map((h) => h.class_name))
          ).map((className, idx) => ({
            id: `hw-child-${idx}`,
            name: `Child ${idx + 1}`,
            roll_no: "—",
            class_name: className,
            class_division_name:
              controller.homework.find((h) => h.class_name === className)?.division_name || "",
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
      })
      .catch((err) => {
        console.error("Error loading child info:", err);
        const fallback = {
          id: "fallback-err",
          name: user?.full_name || "Parent",
          roll_no: "N/A",
          class_name: "Assigned Class",
          class_division_name: "",
        };
        setChildren([fallback]);
        setSelectedChild(fallback);
      });
  }, [controller.readOnlyAudience, isStudent, isParent, user, controller.homework]);

  // Students: render API homework as-is. Parents: filter by selected child class.
  const filteredHomeworkByChild = useMemo(() => {
    if (isStudent) {
      return controller.homework;
    }

    if (!selectedChild || selectedChild.id?.toString().startsWith("fallback")) {
      return controller.homework;
    }

    if (selectedChild.id?.toString().startsWith("hw-child")) {
      return controller.homework.filter((h) => h.class_name === selectedChild.class_name);
    }

    return controller.homework.filter((h) => {
      const childClassId = Number(selectedChild.classId || selectedChild.class_id);
      const childClassName = (
        selectedChild.className ||
        selectedChild.class_name ||
        selectedChild.class_
      )?.toLowerCase();

      if (!isNaN(childClassId) && childClassId > 0 && h.class_id === childClassId) {
        return true;
      }

      if (childClassName && h.class_name && childClassName.includes(h.class_name.toLowerCase())) {
        return true;
      }

      return false;
    });
  }, [controller.homework, selectedChild, isStudent]);

  // Compute metrics: total, read (seen), not seen (unread)
  const stats = useMemo(() => {
    const list = filteredHomeworkByChild;
    let readCount = 0;
    let unreadCount = 0;
    const subjects = new Set<string>();

    list.forEach((h) => {
      if (h.subject_name) {
        subjects.add(h.subject_name);
      }
      if (h.is_viewed) {
        readCount += 1;
      } else {
        unreadCount += 1;
      }
    });

    return {
      total: list.length,
      read: readCount,
      unread: unreadCount,
      subjectsCount: subjects.size,
    };
  }, [filteredHomeworkByChild]);

  // Filter homework by tab (All, Not Seen, Read)
  const finalHomeworkList = useMemo(() => {
    return filteredHomeworkByChild.filter((h) => {
      if (tabValue === 1) return !h.is_viewed;
      if (tabValue === 2) return Boolean(h.is_viewed);
      return true;
    });
  }, [filteredHomeworkByChild, tabValue]);

  const paginatedHomeworkList = useMemo(() => {
    const start = listPage * listRowsPerPage;
    return finalHomeworkList.slice(start, start + listRowsPerPage);
  }, [finalHomeworkList, listPage, listRowsPerPage]);

  const showAudiencePagination = finalHomeworkList.length > 0;

  const audiencePaginationBar = showAudiencePagination ? (
    <TablePaginationBar
      page={listPage}
      rowsPerPage={listRowsPerPage}
      totalRows={finalHomeworkList.length}
      onPageChange={setListPage}
      onRowsPerPageChange={setListRowsPerPage}
    />
  ) : null;

  const listConfig = createHomeworkListConfig({
    navigate,
    onDeleteClick: controller.handleDeleteClick,
    canEdit: hasPermission("HOMEWORK_MGMT:edit"),
    canDelete: hasPermission("HOMEWORK_MGMT:delete"),
    showStatusColumn: !controller.readOnlyAudience,
    emptyMessage: controller.readOnlyAudience
      ? "No homework assigned for your class yet."
      : "No homework found. Click 'Assign Homework' to create one.",
  });

  const tableColumns = useMemo(() => {
    if (!isCompactTable) return listConfig.columns;
    return listConfig.columns.filter(
      (column) => column.id !== "teacher_name" && column.id !== "assigned_date",
    );
  }, [isCompactTable, listConfig.columns]);

  const renderHomeworkActions = (row: HomeworkRow) => {
    const actions = listConfig.actions.rowActions?.(row);
    return renderHomeworkRowActions({
      onView: actions?.onView ?? (() => navigate(`/homework/${row.id}`)),
      onEdit: actions?.onEdit,
      onDelete: actions?.onDelete,
    });
  };

  if (!canView) {
    return (
      <PageLayout
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
      </PageLayout>
    );
  }

  // Render Standardized Student/Parent Dashboard View
  if (controller.readOnlyAudience) {
    return (
      <PageLayout
        pageBackground
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
            py: { xs: 0.6, sm: 0.9 },
            mt: { xs: -0.2, sm: -1.15 },
            display: "flex",
            flexDirection: "column",
            gap: { xs: 1.8, sm: 1.8 },
          }}
        >
          {/* Child Selector for Parents */}
          {isParent && children.length > 1 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: colorTokens.text.primary,
                  textTransform: "uppercase",
                  fontSize: "0.8rem",
                  letterSpacing: "0.5px",
                }}
              >
                Child:
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {children.map((child) => (
                  <Chip
                    key={child.id}
                    label={child.name}
                    onClick={() => setSelectedChild(child)}
                    variant={selectedChild?.id === child.id ? "filled" : "outlined"}
                    avatar={
                      <Avatar
                        src={child.photo_url || undefined}
                        sx={{
                          bgcolor:
                            selectedChild?.id === child.id
                              ? alpha(colorTokens.primary.contrast, 0.3)
                              : alpha(colorTokens.text.secondary, 0.1),
                        }}
                      >
                        {child.name[0]}
                      </Avatar>
                    }
                    sx={{
                      fontWeight: 700,
                      px: 1,
                      py: 2.5,
                      borderRadius: "16px",
                      bgcolor:
                        selectedChild?.id === child.id
                          ? colorTokens.primary.main
                          : colorTokens.surface.card,
                      color:
                        selectedChild?.id === child.id
                          ? colorTokens.primary.contrast
                          : colorTokens.text.primary,
                      border: `1.5px solid ${
                        selectedChild?.id === child.id
                          ? colorTokens.primary.main
                          : colorTokens.border.default
                      }`,
                      boxShadow:
                        selectedChild?.id === child.id
                          ? `0 4px 12px ${alpha(colorTokens.primary.main, 0.25)}`
                          : "none",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 4px 8px ${alpha(colorTokens.primary.main, 0.15)}`,
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* ── Summary Analytics ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            {/* Total Tasks Card */}
            <AppCard
              sx={{
                height: "100%",
                background: `linear-gradient(135deg, ${alpha(colorTokens.primary.main, 0.14)} 0%, ${alpha(colorTokens.primary.main, 0.06)} 100%)`,
                border: `1.5px solid ${alpha(colorTokens.primary.main, 0.35)}`,
                position: "relative",
                overflow: "hidden",
                transition: "all 0.25s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: `0 12px 24px ${alpha(colorTokens.primary.main, 0.2)}`,
                  borderColor: alpha(colorTokens.primary.main, 0.45),
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "100px",
                  height: "100px",
                  background: `radial-gradient(circle at top right, ${alpha(colorTokens.primary.main, 0.15)}, transparent 70%)`,
                  pointerEvents: "none",
                }
              }}
              paddingSize="dense"
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "16px",
                    bgcolor: alpha(colorTokens.primary.main, 0.22),
                    color: colorTokens.primary.main,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `inset 0 0 0 1.5px ${alpha(colorTokens.primary.main, 0.3)}`,
                    flexShrink: 0,
                  }}
                >
                  <HomeworkIcon sx={{ fontSize: 32, fontWeight: "bold" }} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', fontSize: '0.65rem' }}>
                    Total Tasks
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 0.5, fontSize: '1.65rem', lineHeight: 1.1 }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.primary.main, display: 'block', mt: 0.75, fontSize: '0.7rem' }}>
                    Assigned
                  </Typography>
                </Box>
              </Stack>
            </AppCard>

            {/* Read (Seen) Card */}
            <AppCard
              sx={{
                height: "100%",
                background: `linear-gradient(135deg, ${alpha(colorTokens.success.main, 0.14)} 0%, ${alpha(colorTokens.success.main, 0.06)} 100%)`,
                border: `1.5px solid ${alpha(colorTokens.success.main, 0.35)}`,
                position: "relative",
                overflow: "hidden",
                transition: "all 0.25s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: `0 12px 24px ${alpha(colorTokens.success.main, 0.2)}`,
                  borderColor: alpha(colorTokens.success.main, 0.45),
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "100px",
                  height: "100px",
                  background: `radial-gradient(circle at top right, ${alpha(colorTokens.success.main, 0.15)}, transparent 70%)`,
                  pointerEvents: "none",
                }
              }}
              paddingSize="dense"
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "16px",
                    bgcolor: alpha(colorTokens.success.main, 0.22),
                    color: colorTokens.success.main,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `inset 0 0 0 1.5px ${alpha(colorTokens.success.main, 0.3)}`,
                    flexShrink: 0,
                  }}
                >
                  <ReadIcon sx={{ fontSize: 32, fontWeight: "bold" }} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', fontSize: '0.65rem' }}>
                    Read
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 0.5, fontSize: '1.65rem', lineHeight: 1.1 }}>
                    {stats.read}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.success.main, display: 'block', mt: 0.75, fontSize: '0.7rem' }}>
                    Seen
                  </Typography>
                </Box>
              </Stack>
            </AppCard>

            {/* Not Seen (Unread) Card */}
            <AppCard
              sx={{
                height: "100%",
                background: `linear-gradient(135deg, ${alpha(colorTokens.warning.main, 0.14)} 0%, ${alpha(colorTokens.warning.main, 0.06)} 100%)`,
                border: `1.5px solid ${alpha(colorTokens.warning.main, 0.35)}`,
                position: "relative",
                overflow: "hidden",
                transition: "all 0.25s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: `0 12px 24px ${alpha(colorTokens.warning.main, 0.2)}`,
                  borderColor: alpha(colorTokens.warning.main, 0.45),
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "100px",
                  height: "100px",
                  background: `radial-gradient(circle at top right, ${alpha(colorTokens.warning.main, 0.15)}, transparent 70%)`,
                  pointerEvents: "none",
                }
              }}
              paddingSize="dense"
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "16px",
                    bgcolor: alpha(colorTokens.warning.main, 0.22),
                    color: colorTokens.warning.main,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `inset 0 0 0 1.5px ${alpha(colorTokens.warning.main, 0.3)}`,
                    flexShrink: 0,
                  }}
                >
                  <UnreadIcon sx={{ fontSize: 32, fontWeight: "bold" }} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', fontSize: '0.65rem' }}>
                    Not Seen
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: colorTokens.text.primary, mt: 0.5, fontSize: '1.65rem', lineHeight: 1.1 }}>
                    {stats.unread}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: colorTokens.warning.main, display: 'block', mt: 0.75, fontSize: '0.7rem' }}>
                    Unread
                  </Typography>
                </Box>
              </Stack>
            </AppCard>
          </Box>

          {/* Homework list container */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Tab header controller */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: { xs: "stretch", md: "center" },
                flexDirection: { xs: "column", md: "row" },
                flexWrap: "wrap",
                gap: 2,
                mb: 2,
              }}
            >
              <Tabs
                value={tabValue}
                onChange={(e, v) => { setTabValue(v); setListPage(0); }}
                textColor="primary"
                indicatorColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  width: { xs: "100%", md: "auto" },
                  maxWidth: "100%",
                  "& .MuiTab-root": {
                    fontWeight: 700,
                    px: { xs: 1.25, sm: 2 },
                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                    color: colorTokens.text.secondary,
                    textTransform: "none",
                    minWidth: { xs: 88, sm: 100 },
                  },
                  "& .Mui-selected": { color: `${colorTokens.primary.main} !important` },
                  "& .MuiTabs-indicator": {
                    height: "3px",
                    borderRadius: "3px 3px 0 0",
                  },
                }}
              >
                <Tab label="All Tasks" />
                <Tab label={`Not Seen (${stats.unread})`} />
                <Tab label={`Read (${stats.read})`} />
              </Tabs>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                  justifyContent: { xs: "space-between", md: "flex-end" },
                  width: { xs: "100%", md: "auto" },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    bgcolor: alpha(colorTokens.border.default, 0.2),
                    borderRadius: '12px',
                    p: 0.5,
                  }}
                >
                  <Tooltip title="List View">
                    <IconButton
                      size="small"
                      onClick={() => setViewMode("list")}
                      sx={{
                        bgcolor: viewMode === "list" ? colorTokens.surface.card : "transparent",
                        color: viewMode === "list" ? colorTokens.primary.main : colorTokens.text.secondary,
                        boxShadow: viewMode === "list" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                        borderRadius: "8px",
                      }}
                    >
                      <ListIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Grid View">
                    <IconButton
                      size="small"
                      onClick={() => setViewMode("grid")}
                      sx={{
                        bgcolor: viewMode === "grid" ? colorTokens.surface.card : "transparent",
                        color: viewMode === "grid" ? colorTokens.primary.main : colorTokens.text.secondary,
                        boxShadow: viewMode === "grid" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                        borderRadius: "8px",
                      }}
                    >
                      <GridIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: colorTokens.text.secondary,
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.75,
                    bgcolor: alpha(colorTokens.border.default, 0.5),
                    borderRadius: "10px",
                    fontSize: "0.8rem",
                  }}
                >
                  {finalHomeworkList.length} of {filteredHomeworkByChild.length}
                </Typography>
              </Box>
            </Box>

            {/* Main Homework List view */}
            {!controller.loading && finalHomeworkList.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 10,
                  px: 2,
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <HomeworkIcon
                  sx={{
                    fontSize: 72,
                    color: alpha(colorTokens.text.secondary, 0.3),
                    mb: 2,
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    color: colorTokens.text.primary,
                    mb: 1,
                  }}
                >
                  {tabValue === 1
                    ? "No Unseen Tasks"
                    : tabValue === 2
                      ? "No Read Tasks Yet"
                      : "No Tasks Yet"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: colorTokens.text.secondary,
                    maxWidth: 320,
                  }}
                >
                  {tabValue === 1
                    ? "You're all caught up — every homework has been opened."
                    : tabValue === 2
                      ? "Open a homework task to mark it as read."
                      : "No homework has been assigned yet."}
                </Typography>
              </Box>
            ) : viewMode === "list" ? (
              <AppCard
                paddingSize="none"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  borderRadius: "14px",
                  border: `1px solid ${colorTokens.border.default}`,
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
                }}
              >
                <EntityTableSection<HomeworkRow>
                  label=""
                  totalRows={finalHomeworkList.length}
                  page={listPage}
                  rowsPerPage={listRowsPerPage}
                  onPageChange={setListPage}
                  onRowsPerPageChange={setListRowsPerPage}
                  columns={tableColumns}
                  data={paginatedHomeworkList}
                  loading={controller.loading}
                  emptyMessage="No tasks found."
                  getRowKey={(row) => row.id}
                  getRowSx={(row) =>
                    !row.is_viewed
                      ? { fontWeight: 700, color: colorTokens.text.primary }
                      : { fontWeight: 500 }
                  }
                  renderRowActions={renderHomeworkActions}
                  stickyHeader
                  size="small"
                  showInfoBar={false}
                />
              </AppCard>
            ) : (
              <Card
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2.5, md: 3 },
                  borderRadius: { xs: "16px", md: "24px" },
                  borderColor: colorTokens.border.default,
                  background: colorTokens.surface.card,
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {controller.loading ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      py: 8,
                    }}
                  >
                    <CircularProgress size={48} thickness={4} />
                  </Box>
                ) : (
                <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
                {paginatedHomeworkList.map((hw) => {
                  const { label: statusLabel, color: statusColor, variant: statusVariant } =
                    getHomeworkStatusChipProps(hw.status);
                  const subColor = getSubjectColor(hw.subject_name);

                  return (
                    <Grid key={hw.id} size={{ xs: 12, sm: 6, md: 6, lg: 4 }}>
                      <Card
                        variant="outlined"
                        sx={{
                          borderRadius: "16px",
                          borderColor: colorTokens.border.default,
                          bgcolor: colorTokens.surface.card,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                          "&:hover": {
                            borderColor: colorTokens.primary.main,
                            transform: "translateY(-4px)",
                            boxShadow: `0 8px 20px ${alpha(colorTokens.primary.main, 0.12)}`,
                          },
                        }}
                      >
                        <CardContent
                          sx={{
                            p: 2.5,
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                            fontWeight: hw.is_viewed ? 500 : 700,
                          }}
                        >
                          {/* Subject and State */}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 1,
                            }}
                          >
                            <Chip
                              label={hw.subject_name || "General"}
                              size="small"
                              sx={{
                                fontWeight: "inherit",
                                fontSize: "0.7rem",
                                bgcolor: subColor.bg,
                                color: subColor.text,
                                borderRadius: "8px",
                                height: 24,
                              }}
                            />
                            {!controller.readOnlyAudience ? (
                              <Chip
                                label={statusLabel}
                                size="small"
                                color={statusColor}
                                variant={statusVariant}
                              />
                            ) : null}
                          </Box>

                          {/* Homework Title */}
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: "inherit",
                              color: colorTokens.text.primary,
                              lineHeight: 1.35,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {hw.title}
                          </Typography>

                          {/* Info Stack */}
                          <Stack spacing={1} sx={{ mt: "auto", mb: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <PersonIcon
                                sx={{
                                  fontSize: 18,
                                  color: colorTokens.text.secondary,
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: colorTokens.text.secondary,
                                  fontWeight: "inherit",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {hw.teacher_name || "Teacher"}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <CalendarIcon
                                sx={{
                                  fontSize: 18,
                                  color: colorTokens.text.secondary,
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: colorTokens.text.secondary,
                                  fontWeight: "inherit",
                                  fontSize: "0.8rem",
                                }}
                              >
                                Assigned: {formatDate(hw.assigned_date)}
                              </Typography>
                            </Box>
                            {hw.submission_date ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <CalendarIcon
                                  sx={{
                                    fontSize: 18,
                                    color: colorTokens.warning.dark,
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: colorTokens.warning.dark,
                                    fontWeight: "inherit",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  Due: {formatDate(hw.submission_date)}
                                </Typography>
                              </Box>
                            ) : null}
                          </Stack>

                          {/* Attachment Indicator */}
                          {hw.attachments && hw.attachments.length > 0 && (
                            <Box
                              sx={{
                                mt: 1,
                                p: 1.25,
                                borderRadius: "10px",
                                bgcolor: alpha(colorTokens.primary.main, 0.06),
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                border: `1px solid ${alpha(
                                  colorTokens.primary.main,
                                  0.15
                                )}`,
                              }}
                            >
                              <DownloadIcon
                                sx={{
                                  fontSize: 16,
                                  color: colorTokens.primary.main,
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: "inherit",
                                  color: colorTokens.primary.main,
                                  fontSize: "0.75rem",
                                }}
                              >
                                {hw.attachments.length}{" "}
                                {hw.attachments.length === 1
                                  ? "File"
                                  : "Files"}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>

                        {/* Footer Action */}
                        <Box sx={{ p: 2, pt: 0 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            disableElevation
                            onClick={() => navigate(`/homework/${hw.id}`)}
                            endIcon={<ViewIcon />}
                            sx={{
                              borderRadius: "12px",
                              py: 1,
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              textTransform: "none",
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
              {audiencePaginationBar}
            </Card>
            )}
          </Box>
        </Box>
      </PageLayout>
    );
  }

  // Standard Admin/Teacher Grid Table View
  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[{ title: "Homework", path: "#" }]}
          homePath="/"
          actions={
            <Box sx={{ width: "100%", minWidth: 0, maxWidth: "100%" }}>
              <ListPageToolbar
                searchValue={controller.search}
                onSearchChange={controller.setSearch}
                searchPlaceholder="Search homework by title..."
                filters={
                  controller.readOnlyAudience
                    ? []
                    : [
                      {
                        label: "Class",
                        value: controller.classFilter,
                        onChange: controller.setClassFilter,
                        options: controller.classOptions,
                        disabled: controller.lockClassFilter,
                      },
                      {
                        label: "Division",
                        value: controller.divisionFilter,
                        onChange: controller.setDivisionFilter,
                        options: controller.divisionOptions,
                        disabled:
                          controller.lockDivisionFilter || !controller.classFilter,
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
            </Box>
          }
        />
      }
    >
      <Box
        sx={{
          minWidth: 0,
          width: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <EntityTableSection<HomeworkRow>
          label=""
          showInfoBar={false}
          showPagination={controller.total > 0}
          totalRows={controller.total}
          page={controller.page}
          rowsPerPage={controller.rowsPerPage}
          onPageChange={controller.setPage}
          onRowsPerPageChange={controller.setRowsPerPage}
          columns={tableColumns}
          data={controller.homework}
          loading={controller.loading}
          emptyMessage={listConfig.uiPolicy.emptyMessage}
          getRowKey={(row) => row.id}
          getRowSx={(row) =>
            !row.is_viewed
              ? { fontWeight: 700, color: colorTokens.text.primary }
              : { fontWeight: 500 }
          }
          renderRowActions={renderHomeworkActions}
          stickyHeader
          size="small"
        />
      </Box>

      <ConfirmDialog
        open={controller.deleteDialogOpen}
        title="Delete Homework?"
        message="Are you sure you want to delete this Homework?"
        confirmText={controller.deleteLoading ? "Deleting..." : "Delete"}
        onConfirm={controller.handleConfirmDelete}
        onCancel={() => controller.setDeleteDialogOpen(false)}
        loading={controller.deleteLoading}
      />

    </ListPageLayout>
  );
}
