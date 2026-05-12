import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { alpha } from "@mui/material/styles";
import {
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  CalendarMonth as CalendarIcon,
  Campaign as CampaignIcon,
  Description as DescriptionIcon,
  Groups as GroupsIcon,
  NotificationsActive as NotifyIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { ListPageLayout } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import Section from "../../components/primitives/Section";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import noticeService from "../../api/services/noticeService";
import type { Notice, NoticeStatus } from "../../types/notice";
import { formatShortDate } from "../../utils/formatters";
import { audienceTypeLabel, noticeStatusLabel, noticeTypeLabel } from "../../utils/noticeLabels";
import { colorTokens } from "../../tokens/colors";

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

function MetaBlock({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
      <Box
        sx={{
          color: "primary.main",
          display: "flex",
          mt: 0.25,
          "& .MuiSvgIcon-root": { fontSize: 22 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.02 }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function AudienceBlock({ notice }: { notice: Notice }) {
  const showClassChips =
    (notice.audience_type === "STUDENT" || notice.audience_type === "ALL") && notice.targets.length > 0;

  if (!showClassChips) {
    return (
      <Chip
        icon={<GroupsIcon sx={{ "&&": { fontSize: 18 } }} />}
        label={audienceTypeLabel(notice.audience_type)}
        variant="outlined"
        color="primary"
        sx={{ fontWeight: 600 }}
      />
    );
  }
  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        {audienceTypeLabel(notice.audience_type)}
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
        {notice.targets.map((t) => {
          const key = `${t.id}-${t.class_id ?? "c"}-${t.division_id ?? "d"}`;
          if (t.division_id != null) {
            return <Chip key={key} size="small" label={`Division #${t.division_id}`} variant="filled" color="default" />;
          }
          if (t.class_id != null) {
            return <Chip key={key} size="small" label={`Class #${t.class_id}`} variant="filled" color="default" />;
          }
          return <Chip key={key} size="small" label="Target" variant="outlined" />;
        })}
      </Stack>
    </Stack>
  );
}

export default function NoticeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const noticeId = id ? Number(id) : NaN;

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
  const canEdit = notice && !isExpired;
  const canPublish =
    notice && (notice.status === "DRAFT" || notice.status === "UNPUBLISHED") && !isExpired;
  const canUnpublish = notice?.status === "PUBLISHED";
  const canDelete = notice && !isExpired;

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

  const handleDelete = async () => {
    if (!notice) return;
    try {
      setActionLoading(true);
      await noticeService.delete(notice.id);
      setDeleteOpen(false);
      navigate("/communication/notices");
    } catch {
      setSnackbar({ message: "Unable to delete notice", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
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
              { title: "Notice", path: "#" },
            ]}
            homePath="/"
          />
        }
      >
        <Alert severity="error" sx={{ m: 2 }}>
          {error ?? "Unable to load notice details"}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/communication/notices")} sx={{ m: 2 }}>
          Back to list
        </Button>
      </ListPageLayout>
    );
  }

  const heroTint = colorTokens.preschool.turquoise.main;

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[
            { title: "Notice Board", path: "/communication/notices" },
            { title: notice.title, path: "#" },
          ]}
          homePath="/"
          actions={
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" justifyContent="flex-end">
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/communication/notices")}>
                Back
              </Button>
              {canEdit ? (
                <Button variant="outlined" onClick={() => navigate(`/communication/notices/${notice.id}/edit`)}>
                  Edit
                </Button>
              ) : null}
              {canPublish ? (
                <Button variant="contained" onClick={() => void handlePublish()} disabled={actionLoading}>
                  Publish
                </Button>
              ) : null}
              {canUnpublish ? (
                <Button color="warning" variant="contained" onClick={() => void handleUnpublish()} disabled={actionLoading}>
                  Unpublish
                </Button>
              ) : null}
              {canDelete ? (
                <Button color="error" variant="outlined" onClick={() => setDeleteOpen(true)} disabled={actionLoading}>
                  Delete
                </Button>
              ) : null}
            </Stack>
          }
        />
      }
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1120,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, md: 3 },
          textAlign: "left",
        }}
      >
        <Paper
          elevation={0}
          sx={(theme) => ({
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            overflow: "hidden",
            bgcolor: "background.paper",
          })}
        >
          {/* Hero */}
          <Box
            sx={(theme) => ({
              px: { xs: 2.5, md: 4 },
              py: { xs: 2.5, md: 3 },
              background: `linear-gradient(135deg, ${alpha(heroTint, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 55%, ${theme.palette.background.paper} 100%)`,
              borderBottom: `1px solid ${theme.palette.divider}`,
            })}
          >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
              <Stack spacing={1} sx={{ minWidth: 0, flex: "1 1 280px" }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
                  <CampaignIcon color="primary" sx={{ fontSize: 28, flexShrink: 0 }} />
                  <Typography variant="h5" component="h1" sx={{ fontWeight: 800, lineHeight: 1.25, wordBreak: "break-word" }}>
                    {notice.title}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
                  <Chip label={noticeStatusLabel(notice.status)} color={statusChipColor(notice.status)} size="small" sx={{ fontWeight: 700 }} />
                  <Chip label={noticeTypeLabel(notice.notice_type)} size="small" variant="outlined" color="primary" />
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}>
                Created {formatShortDate(notice.created_at)}
                {notice.updated_at ? ` · Updated ${formatShortDate(notice.updated_at)}` : ""}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2.5, md: 4 }, py: { xs: 2.5, md: 3 } }}>
            {/* Key facts — responsive grid */}
            <Grid container spacing={3} sx={{ mb: 1 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <MetaBlock icon={<CampaignIcon />} label="Notice type" value={noticeTypeLabel(notice.notice_type)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <MetaBlock icon={<CalendarIcon />} label="Publish date" value={formatShortDate(notice.publish_date)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <MetaBlock
                  icon={<ScheduleIcon />}
                  label="Expiry date"
                  value={notice.expiry_date ? formatShortDate(notice.expiry_date) : "No expiry"}
                />
              </Grid>
            </Grid>

            <Section title="Description" titleVariant="overline" spacing={3} titleSpacing={1}>
              <Paper
                variant="outlined"
                sx={(theme) => ({
                  p: 2.5,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.text.primary, 0.02),
                  borderColor: alpha(theme.palette.divider, 0.9),
                })}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <DescriptionIcon color="action" sx={{ mt: 0.25, fontSize: 22, flexShrink: 0 }} />
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.65, flex: 1 }}>
                    {notice.description}
                  </Typography>
                </Stack>
              </Paper>
            </Section>

            <Section title="Audience" titleVariant="overline" spacing={3} titleSpacing={1}>
              <AudienceBlock notice={notice} />
            </Section>

            <Section title="Attachments" titleVariant="overline" spacing={3} titleSpacing={1}>
              {notice.attachments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                  No files attached
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {notice.attachments.map((a) => (
                    <Paper
                      key={a.id}
                      variant="outlined"
                      sx={(theme) => ({
                        p: 1.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.text.primary, 0.02),
                        transition: "background-color 0.15s ease",
                        ...(a.file_path
                          ? {
                              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                            }
                          : {}),
                      })}
                    >
                      <AttachFileIcon color="primary" fontSize="small" sx={{ flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        {a.file_path ? (
                          <Link
                            href={a.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{ fontWeight: 600, color: "primary.main", wordBreak: "break-word" }}
                          >
                            {a.file_name || "Attachment"}
                          </Link>
                        ) : (
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {a.file_name || "Attachment"}
                          </Typography>
                        )}
                        {a.file_type ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {a.file_type}
                          </Typography>
                        ) : null}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Section>

            <Section title="Notification" titleVariant="overline" spacing={0} titleSpacing={1}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }} flexWrap="wrap">
                <Stack direction="row" spacing={1} alignItems="center">
                  <NotifyIcon color={notice.send_notification ? "warning" : "disabled"} fontSize="small" />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {notificationLabel(notice)}
                  </Typography>
                </Stack>
                {notice.send_notification ? (
                  <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 480 }}>
                    Alerts requested for recipients when published
                  </Typography>
                ) : null}
              </Stack>
            </Section>
          </Box>
        </Paper>
      </Box>

      <ConfirmDialog
        open={deleteOpen}
        title="Please Confirm"
        message="Are you sure you want to delete this notice?"
        confirmLabel={actionLoading ? "Deleting…" : "Confirm"}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteOpen(false)}
        loading={actionLoading}
      />

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
