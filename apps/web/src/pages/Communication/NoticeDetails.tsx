import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { alpha } from "@mui/material/styles";
import {
  AttachFile as AttachFileIcon,
  CalendarMonth as CalendarIcon,
  Campaign as CampaignIcon,
  NotificationsNone as NotifyIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { colorTokens } from "../../tokens/colors";
import { FormHeaderIconAction } from "../../components/primitives";
import { ListPageLayout } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import noticeService from "../../api/services/noticeService";
import { useNoticePermissions } from "../../hooks/useNoticePermissions";
import type { Notice, NoticeStatus } from "../../types/notice";
import { formatShortDate } from "../../utils/formatters";
import { noticeStatusLabel, noticeTypeLabel } from "../../utils/noticeLabels";

function statusChipColor(status: NoticeStatus): "default" | "success" | "error" | "warning" {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "EXPIRED":
      return "error";
    case "DRAFT":
      return "default";
    case "UNPUBLISHED":
      return "warning";
    default:
      return "default";
  }
}

function notificationLabel(notice: Notice): string {
  if (!notice.send_notification) return "Off";
  return "Pending";
}

const accent = colorTokens.preschool.turquoise.main;

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        minWidth: 0,
        p: 1.25,
        borderRadius: 1.5,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        height: "100%",
      })}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          bgcolor: alpha(accent, 0.12),
          color: "primary.main",
          "& .MuiSvgIcon-root": { fontSize: 20 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, pt: 0.15 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35, color: "text.primary" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function ViewSection({
  title,
  children,
  variant = "plain",
}: {
  title: string;
  children: ReactNode;
  variant?: "plain" | "panel";
}) {
  return (
    <Box sx={{ py: 1.5 }}>
      <Typography
        variant="overline"
        sx={{
          fontWeight: 700,
          letterSpacing: 1,
          color: "text.secondary",
          display: "block",
          mb: 0.75,
          lineHeight: 1.2,
          fontSize: "0.68rem",
        }}
      >
        {title}
      </Typography>
      {variant === "panel" ? (
        <Box
          sx={(theme) => ({
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            border: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
          })}
        >
          {children}
        </Box>
      ) : (
        children
      )}
    </Box>
  );
}

export default function NoticeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const noticeId = id ? Number(id) : NaN;
  const perms = useNoticePermissions();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(noticeId)) {
      setError("Unable to load notice details");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await noticeService.getById(noticeId);
      setNotice(data);
    } catch {
      setNotice(null);
      setError("Unable to load notice details");
    } finally {
      setLoading(false);
    }
  }, [noticeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isExpired = notice?.status === "EXPIRED";
  const canEdit = Boolean(perms.canEdit && notice && !isExpired);
  const canPublish = Boolean(
    perms.canEdit && notice && (notice.status === "DRAFT" || notice.status === "UNPUBLISHED") && !isExpired,
  );
  const canUnpublish = Boolean(perms.canEdit && notice?.status === "PUBLISHED");
  const showAdminActions = canEdit || canPublish || canUnpublish;

  const handlePublish = async () => {
    if (!notice) return;
    try {
      setActionLoading(true);
      const res = await noticeService.publish(notice.id);
      setNotice(res.notice);
      setSnackbar({ message: res.message, severity: "success" });
    } catch {
      setSnackbar({ message: "Failed to publish notice", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!notice) return;
    try {
      setActionLoading(true);
      const res = await noticeService.unpublish(notice.id);
      setNotice(res.notice);
      setSnackbar({ message: res.message, severity: "success" });
    } catch {
      setSnackbar({ message: "Action not allowed in current state", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error || !notice) {
    return (
      <ListPageLayout
        header={
          <PageHeader
            links={[
              { title: "Notice Board", path: "/communication/notices" },
              { title: "View", path: "#" },
            ]}
            homePath="/"
          />
        }
      >
        <Alert severity="error" sx={{ m: 2 }}>
          {error ?? "Unable to load notice details"}
        </Alert>
      </ListPageLayout>
    );
  }

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[
            { title: "Notice Board", path: "/communication/notices" },
            { title: "View", path: "#" },
          ]}
          homePath="/"
          actions={
            showAdminActions ? (
              <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" justifyContent="flex-end">
                {canEdit ? (
                  <FormHeaderIconAction
                    variant="edit"
                    tooltipTitle="Edit notice"
                    onClick={() => navigate(`/communication/notices/${notice.id}/edit`)}
                    disabled={actionLoading}
                  />
                ) : null}
                {canPublish ? (
                  <FormHeaderIconAction
                    variant="publish"
                    tooltipTitle="Publish notice"
                    onClick={() => void handlePublish()}
                    loading={actionLoading}
                    disabled={actionLoading}
                  />
                ) : null}
                {canUnpublish ? (
                  <FormHeaderIconAction
                    variant="unpublish"
                    tooltipTitle="Unpublish notice"
                    onClick={() => void handleUnpublish()}
                    loading={actionLoading}
                    disabled={actionLoading}
                  />
                ) : null}
              </Stack>
            ) : undefined
          }
        />
      }
    >
      <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto", px: { xs: 1.5, sm: 2.5 }, py: 2 }}>
        <Paper
          elevation={0}
          sx={(theme) => ({
            borderRadius: 2.5,
            border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
            bgcolor: "background.paper",
            overflow: "hidden",
            boxShadow: `0 8px 28px ${alpha(theme.palette.common.black, 0.06)}`,
          })}
        >
          {/* Title row */}
          <Box
            sx={(theme) => ({
              px: { xs: 2, sm: 2.5 },
              py: 1.75,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              flexWrap: "wrap",
              background: `linear-gradient(120deg, ${alpha(accent, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 45%, ${theme.palette.background.paper} 100%)`,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
            })}
          >
            <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
              <CampaignIcon sx={{ fontSize: 26, color: "primary.main", flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{ fontWeight: 800, lineHeight: 1.2, wordBreak: "break-word", letterSpacing: -0.2 }}
                >
                  {notice.title}
                </Typography>
                <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  <Chip
                    label={noticeStatusLabel(notice.status)}
                    color={statusChipColor(notice.status)}
                    size="small"
                    sx={{ height: 24, fontWeight: 700, fontSize: "0.72rem" }}
                  />
                  <Chip
                    label={noticeTypeLabel(notice.notice_type)}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{ height: 24, fontWeight: 600, fontSize: "0.72rem" }}
                  />
                </Stack>
              </Box>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ flexShrink: 0, lineHeight: 1.3, fontWeight: 500, bgcolor: "background.paper", px: 1, py: 0.35, borderRadius: 1 }}
            >
              Created {formatShortDate(notice.created_at)}
            </Typography>
          </Box>

          {/* Meta row */}
          <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, bgcolor: alpha("#f8fafc", 0.65) }}>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <MetaItem icon={<CampaignIcon />} label="Notice type" value={noticeTypeLabel(notice.notice_type)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <MetaItem icon={<CalendarIcon />} label="Publish date" value={formatShortDate(notice.publish_date)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <MetaItem
                  icon={<ScheduleIcon />}
                  label="Expiry date"
                  value={notice.expiry_date ? formatShortDate(notice.expiry_date) : "No expiry"}
                />
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
            <ViewSection title="Description" variant="panel">
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.55, color: "text.primary" }}>
                {notice.description}
              </Typography>
            </ViewSection>

            <Divider sx={{ opacity: 0.7 }} />

            <ViewSection title="Attachments">
              {notice.attachments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                  No files attached
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {notice.attachments.map((a) => (
                    <Box
                      key={a.id}
                      sx={(theme) => ({
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.25,
                        py: 0.85,
                        borderRadius: 1.25,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        maxWidth: 420,
                        transition: "background-color 0.15s ease",
                        "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                      })}
                    >
                      <AttachFileIcon color="primary" sx={{ fontSize: 20, flexShrink: 0 }} />
                      {a.file_path ? (
                        <Link
                          href={a.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          variant="body2"
                          sx={{ fontWeight: 700, wordBreak: "break-word", color: "primary.main" }}
                        >
                          {a.file_name || "Attachment"}
                        </Link>
                      ) : (
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {a.file_name || "Attachment"}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </ViewSection>

            <Divider sx={{ opacity: 0.7 }} />

            <ViewSection title="Notification">
              <Chip
                icon={
                  <NotifyIcon
                    sx={{
                      fontSize: "18px !important",
                      color: notice.send_notification ? "warning.main !important" : undefined,
                    }}
                  />
                }
                label={notificationLabel(notice)}
                size="small"
                variant={notice.send_notification ? "filled" : "outlined"}
                color={notice.send_notification ? "warning" : "default"}
                sx={{ fontWeight: 700, height: 28 }}
              />
            </ViewSection>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert severity={snackbar?.severity ?? "success"} onClose={() => setSnackbar(null)} sx={{ width: "100%" }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}
