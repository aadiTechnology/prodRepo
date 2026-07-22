import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
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
  AttachFile as AttachFileIcon,
  Book as BookIcon,
  CalendarMonth as CalendarIcon,
  Class as ClassIcon,
  Info as InfoIcon,
  MenuBook as MenuBookIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { ListPageLayout } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import { useRBAC } from "../../context/RBACContext";
import { homeworkService, type HomeworkResponse } from "../../api/services/homeworkService";
import { getHomeworkStatusChipProps } from "../../utils/homeworkStatus";
import { notifyHomeworkUnreadChanged } from "../../utils/homeworkUnreadEvents";
import { apiBaseUrl } from "../../config/env";
import { colorTokens } from "../../tokens/colors";

// Status helpers — same chip styling as Notice list / Activity Gallery
function HomeworkStatusChip({ status }: { status: string }) {
  const { label, color, variant } = getHomeworkStatusChipProps(status);
  return <Chip label={label} color={color} variant={variant} size="small" />;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildAttachmentUrl(filePath: string): string {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  return `${apiBaseUrl}${filePath}`;
}

// Info block for metadata display
function InfoBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ color: colorTokens.text.secondary, display: "flex" }}>{icon}</Box>
        <Typography variant="caption" sx={{ color: colorTokens.text.secondary, fontWeight: 600 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: colorTokens.text.primary, fontWeight: 600, ml: 3.5 }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HomeworkDetails() {
  const { id } = useParams<{ id: string }>();
  const homeworkId = id ? Number(id) : NaN;
  const { hasPermission } = useRBAC();

  const canView = hasPermission("HOMEWORK_MGMT:view");

  const [hw, setHw] = useState<HomeworkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(homeworkId)) {
      setError("Homework details not found");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await homeworkService.getById(homeworkId);
      setHw(data);
      // Backend getById also marks viewed; call markViewed + refresh badge for sidebar.
      try {
        await homeworkService.markViewed(homeworkId);
      } catch {
        // Non-blocking: details still usable if mark-viewed fails.
      }
      notifyHomeworkUnreadChanged();
    } catch {
      setHw(null);
      setError("Unable to load homework details");
    } finally {
      setLoading(false);
    }
  }, [homeworkId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Authorization check ──────────────────────────────────────────────────
  if (!canView) {
    return (
      <ListPageLayout
        header={
          <PageHeader
            links={[
              { title: "Homework", path: "/homework" },
              { title: "Access Denied", path: "#" },
            ]}
            homePath="/"
          />
        }
      >
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="error" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You do not have permission to view homework details.
          </Typography>
        </Box>
      </ListPageLayout>
    );
  }

  // ── Error / not found state ────────────────────────────────────────────────
  if (error || !hw) {
    return (
      <ListPageLayout
        header={
          <PageHeader
            links={[
              { title: "Homework", path: "/homework" },
              { title: "Details", path: "#" },
            ]}
            homePath="/"
          />
        }
      >
        <Alert severity="error" sx={{ m: 2 }}>
          {error ?? "Homework details not found"}
        </Alert>
      </ListPageLayout>
    );
  }

  const classLabel = [hw.class_name, hw.division_name].filter(Boolean).join(" - ");

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[
            { title: "Homework", path: "/homework" },
            { title: "Homework Details", path: "#" },
          ]}
          homePath="/"
        />
      }
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, md: 3 },
        }}
      >
        {/* Header Card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: `1px solid ${colorTokens.border.default}`,
            overflow: "hidden",
            bgcolor: colorTokens.surface.card,
            mb: 2,
          }}
        >
          <Box sx={{ px: { xs: 2.5, md: 3.5 }, py: 3 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1 }} flexWrap="wrap">
                  <MenuBookIcon sx={{ fontSize: 28, color: colorTokens.primary.main }} />
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, lineHeight: 1.2, wordBreak: "break-word", color: colorTokens.text.primary }}
                  >
                    {hw.title}
                  </Typography>
                </Stack>
                <Stack direction="row" gap={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap">
                  <HomeworkStatusChip status={hw.status} />
                </Stack>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: colorTokens.text.secondary,
                  flexShrink: 0,
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Created {formatDate(hw.created_at)}
                {hw.updated_at && <Box component="span"> · Updated {formatDate(hw.updated_at)}</Box>}
              </Typography>
            </Stack>
          </Box>
        </Paper>

        {/* Content Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* Meta Information Card */}
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: `1px solid ${colorTokens.border.default}`,
                overflow: "hidden",
                bgcolor: colorTokens.surface.card,
              }}
            >
              <Box sx={{ px: 3, py: 2.5, bgcolor: alpha(colorTokens.primary.main, 0.04), borderBottom: `1px solid ${colorTokens.border.default}` }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <InfoIcon sx={{ fontSize: 20, color: colorTokens.text.primary }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.75rem", color: colorTokens.text.secondary }}>
                    Meta Information
                  </Typography>
                </Stack>
              </Box>
              <Grid container spacing={0} sx={{ p: 0 }}>
                <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ p: 2.5, borderRight: { md: `1px solid ${colorTokens.border.default}` }, borderBottom: `1px solid ${colorTokens.border.default}` }}>
                  <InfoBlock icon={<CalendarIcon sx={{ fontSize: 18 }} />} label="Assigned Date" value={formatDate(hw.assigned_date)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ p: 2.5, borderRight: { md: `1px solid ${colorTokens.border.default}` }, borderBottom: { xs: `1px solid ${colorTokens.border.default}`, md: "none" } }}>
                  <InfoBlock icon={<CalendarIcon sx={{ fontSize: 18 }} />} label="Submission Date" value={formatDate(hw.submission_date)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ p: 2.5, borderRight: { md: `1px solid ${colorTokens.border.default}` }, borderBottom: `1px solid ${colorTokens.border.default}` }}>
                  <InfoBlock icon={<BookIcon sx={{ fontSize: 18 }} />} label="Subject" value={hw.subject_name ?? "—"} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ p: 2.5, borderRight: { md: `1px solid ${colorTokens.border.default}` }, borderBottom: { xs: `1px solid ${colorTokens.border.default}`, md: "none" } }}>
                  <InfoBlock icon={<PersonIcon sx={{ fontSize: 18 }} />} label="Teacher" value={hw.teacher_name ?? "—"} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ p: 2.5, borderRight: { md: `1px solid ${colorTokens.border.default}` }, borderBottom: `1px solid ${colorTokens.border.default}` }}>
                  <InfoBlock icon={<ClassIcon sx={{ fontSize: 18 }} />} label="Class" value={classLabel || "—"} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ p: 2.5 }}>
                  <InfoBlock icon={<CalendarIcon sx={{ fontSize: 18 }} />} label="Academic Year" value={hw.academic_year_name ?? "—"} />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Description Card */}
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: `1px solid ${colorTokens.border.default}`,
                overflow: "hidden",
                bgcolor: colorTokens.surface.card,
              }}
            >
              <Box sx={{ px: 3, py: 2.5, bgcolor: alpha(colorTokens.primary.main, 0.04), borderBottom: `1px solid ${colorTokens.border.default}` }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <BookIcon sx={{ fontSize: 20, color: colorTokens.text.primary }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.75rem", color: colorTokens.text.secondary }}>
                    Instructions
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ p: 2.5, maxHeight: 200, overflowY: "auto", bgcolor: alpha(colorTokens.text.primary, 0.02) }}>
                {hw.instructions ? (
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: colorTokens.text.primary }}>
                    {hw.instructions}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ fontStyle: "italic", color: colorTokens.text.secondary }}>
                    No instructions provided
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Attachments Card */}
        {hw.attachments.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${colorTokens.border.default}`,
              overflow: "hidden",
              bgcolor: colorTokens.surface.card,
            }}
          >
            <Box sx={{ px: 3, py: 2.5, bgcolor: alpha(colorTokens.primary.main, 0.04), borderBottom: `1px solid ${colorTokens.border.default}` }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <AttachFileIcon sx={{ fontSize: 20, color: colorTokens.text.primary }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "0.75rem", color: colorTokens.text.secondary }}>
                  Attachments
                </Typography>
              </Stack>
            </Box>
            <Box sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                {hw.attachments.map((a) => (
                  <Box
                    key={a.id}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1,
                      border: `1px solid ${colorTokens.border.default}`,
                      bgcolor: alpha(colorTokens.text.primary, 0.02),
                      transition: "all 0.15s ease",
                      "&:hover": {
                        bgcolor: alpha(colorTokens.primary.main, 0.05),
                        borderColor: colorTokens.primary.main,
                      },
                    }}
                  >
                    <AttachFileIcon sx={{ fontSize: 18, color: colorTokens.primary.main, flexShrink: 0, mt: 0.3 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Link
                        href={buildAttachmentUrl(a.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{
                          fontWeight: 600,
                          color: colorTokens.primary.main,
                          wordBreak: "break-word",
                        }}
                      >
                        {a.file_name || "Attachment"}
                      </Link>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        {a.file_type && (
                          <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: colorTokens.text.secondary }}>
                            {a.file_type}
                          </Typography>
                        )}
                        {a.file_size_kb && (
                          <Typography variant="caption" sx={{ color: colorTokens.text.secondary }}>
                            {a.file_size_kb < 1024 ? `${a.file_size_kb} KB` : `${(a.file_size_kb / 1024).toFixed(1)} MB`}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Toast */}
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
