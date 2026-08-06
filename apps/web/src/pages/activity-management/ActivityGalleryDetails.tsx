import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGalleryMediaSrc } from "../../hooks/useGalleryMediaSrc";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link,
  MobileStepper,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { alpha } from "@mui/material/styles";
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Class as ClassIcon,
  OpenInNew as OpenInNewIcon,
  PhotoLibrary as PhotoIcon,
  Videocam as VideocamIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ListPageLayout } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import { FormHeaderIconAction } from "../../components/primitives";
import activityGalleryService from "../../api/services/activityGalleryService";
import { useActivityGalleryPermissions } from "../../hooks/useActivityGalleryPermissions";
import type { ActivityGallery, ActivityGalleryClassMapping, GalleryType } from "../../types/activityGallery";
import { formatShortDate } from "../../utils/formatters";
import { colorTokens } from "../../tokens/colors";

const GALLERY_PATH = "/activity-management/photo-video-gallery";
const SNACKBAR_ANCHOR = { vertical: "top", horizontal: "center" } as const;
const NO_MEDIA_DOWNLOAD_MESSAGE = "No media available to download.";
const PHOTOS_DOWNLOAD_SUCCESS_MESSAGE = "Photos download successfully.";
const DOWNLOAD_FAILED_MESSAGE = "Download failed";

const accent = colorTokens.preschool.turquoise.main;

function galleryListPathByType(type: GalleryType): string {
  return `${GALLERY_PATH}?type=${type.toLowerCase()}`;
}

function formatAssignedClasses(
  gallery: Pick<ActivityGallery, "class_name" | "division_name" | "class_mappings">,
): string {
  const mappings = gallery.class_mappings ?? [];
  if (mappings.length > 0) {
    const labels = mappings.map((m: ActivityGalleryClassMapping) => {
      if (!m.class_name) return null;
      return m.division_name ? `${m.class_name} (${m.division_name})` : m.class_name;
    });
    const unique = [...new Set(labels.filter(Boolean))];
    return unique.length > 0 ? unique.join(", ") : "—";
  }
  if (!gallery.class_name) return "—";
  return gallery.division_name
    ? `${gallery.class_name} (${gallery.division_name})`
    : gallery.class_name;
}

function videoPlatformLabel(url: string): string {
  const trimmed = url.trim();
  if (/instagram\.com/i.test(trimmed)) return "Instagram";
  if (/youtube\.com|youtu\.be/i.test(trimmed)) return "YouTube";
  if (/facebook\.com|fb\.watch/i.test(trimmed)) return "Facebook";
  return "Video";
}

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
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, lineHeight: 1.35, color: "text.primary", wordBreak: "break-word" }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ActivityGalleryDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const galleryId = id ? Number(id) : NaN;
  const perms = useActivityGalleryPermissions();
  const { enqueueSnackbar } = useSnackbar();

  const [gallery, setGallery] = useState<ActivityGallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const load = useCallback(async () => {
    if (!Number.isFinite(galleryId)) {
      setError("Gallery not found");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await activityGalleryService.getById(galleryId);
      setGallery(data);
      setActiveStep(0);
    } catch (err: unknown) {
      const apiErr = err as { message?: string; response?: { status?: number } };
      if (apiErr.response?.status === 403) {
        setError("You are not authorized for this activity.");
      } else {
        setError(apiErr.message ?? "Unable to load gallery details");
      }
      setGallery(null);
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mediaItems = useMemo(() => gallery?.media_items ?? [], [gallery]);
  const currentMedia = mediaItems[activeStep];
  const photoSrc = useGalleryMediaSrc(
    gallery?.gallery_type === "Photo" ? currentMedia?.file_path : undefined,
  );

  const handleDownload = async () => {
    if (!gallery) return;
    if (mediaItems.length === 0) {
      enqueueSnackbar(NO_MEDIA_DOWNLOAD_MESSAGE, {
        variant: "warning",
        autoHideDuration: 3000,
        anchorOrigin: SNACKBAR_ANCHOR,
      });
      return;
    }
    try {
      for (const item of mediaItems) {
        await activityGalleryService.downloadMedia(
          gallery.id,
          item.id,
          item.original_file_name || item.file_name,
        );
      }
      enqueueSnackbar(PHOTOS_DOWNLOAD_SUCCESS_MESSAGE, {
        variant: "success",
        autoHideDuration: 3000,
        anchorOrigin: SNACKBAR_ANCHOR,
      });
    } catch {
      enqueueSnackbar(DOWNLOAD_FAILED_MESSAGE, {
        variant: "error",
        autoHideDuration: 4000,
        anchorOrigin: SNACKBAR_ANCHOR,
      });
    }
  };

  const galleryListPath =
    gallery != null
      ? galleryListPathByType(gallery.gallery_type)
      : galleryListPathByType(
          (location.state as { galleryType?: GalleryType } | null)?.galleryType ?? "Photo",
        );

  if (!perms.canView && !perms.readOnlyAudience) {
    return (
      <ListPageLayout header={<PageHeader links={[{ title: "Photo / Video Gallery", path: galleryListPath }]} homePath="/" />}>
        <Typography color="error" sx={{ p: 3 }}>
          You are not authorized for this activity.        </Typography>
      </ListPageLayout>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !gallery) {
    return (
      <ListPageLayout header={<PageHeader links={[{ title: "Photo / Video Gallery", path: galleryListPath }]} homePath="/" />}>
        <Alert severity="error" sx={{ m: 2 }}>
          {error ?? "Gallery not found"}
        </Alert>
        <Button sx={{ ml: 2 }} onClick={() => void load()}>
          Retry
        </Button>
      </ListPageLayout>
    );
  }

  const classLabel = formatAssignedClasses(gallery);
  const isPhoto = gallery.gallery_type === "Photo";
  const TypeIcon = isPhoto ? PhotoIcon : VideocamIcon;

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[
            { title: "Photo / Video Gallery", path: galleryListPath },
            { title: gallery.gallery_name, path: "#" },
          ]}
          homePath="/"
          actions={
            <Stack direction="row" spacing={1}>
              {isPhoto && perms.canDownload ? (
                <FormHeaderIconAction
                  variant="download"
                  tooltipTitle="Download"
                  onClick={() => void handleDownload()}
                  disabled={mediaItems.length === 0}
                />
              ) : null}
              {perms.canEdit && !perms.readOnlyAudience ? (
                <FormHeaderIconAction
                  variant="edit"
                  tooltipTitle="Edit Gallery"
                  onClick={() => navigate(`${GALLERY_PATH}/${gallery.id}/edit`)}
                />
              ) : null}
            </Stack>
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
              <TypeIcon sx={{ fontSize: 26, color: "primary.main", flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{ fontWeight: 800, lineHeight: 1.2, wordBreak: "break-word", letterSpacing: -0.2 }}
                >
                  {gallery.gallery_name}
                </Typography>
                <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  <Chip
                    label={isPhoto ? "Photo" : "Video"}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{ height: 24, fontWeight: 600, fontSize: "0.72rem" }}
                  />
                  {!perms.readOnlyAudience ? (
                    <Chip
                      label={gallery.is_published ? "Published" : "Draft"}
                      color={gallery.is_published ? "success" : "default"}
                      size="small"
                      sx={{ height: 24, fontWeight: 700, fontSize: "0.72rem" }}
                    />
                  ) : null}
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, bgcolor: alpha("#f8fafc", 0.65) }}>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetaItem
                  icon={<CalendarIcon />}
                  label="Activity Date"
                  value={formatShortDate(gallery.activity_date)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                <MetaItem icon={<ClassIcon />} label="Class" value={classLabel} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <MetaItem
                  icon={isPhoto ? <PhotoIcon /> : <VideocamIcon />}
                  label="Media"
                  value={String(gallery.media_count)}
                />
              </Grid>
              {!perms.readOnlyAudience ? (
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <MetaItem
                    icon={<TypeIcon />}
                    label="Status"
                    value={gallery.is_published ? "Published" : "Draft"}
                  />
                </Grid>
              ) : null}
            </Grid>
          </Box>

          <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2 }}>
            {gallery.description ? (
              <>
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 700, letterSpacing: 0.6, color: "text.secondary", display: "block", mb: 1 }}
                >
                  Description
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 1.5,
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                    bgcolor: alpha("#f8fafc", 0.8),
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {gallery.description}
                </Typography>
                <Divider sx={{ mb: 2, opacity: 0.7 }} />
              </>
            ) : null}

            {mediaItems.length === 0 ? (
              <Alert severity="info">No media uploaded for this gallery yet.</Alert>
            ) : isPhoto ? (
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 280,
                  }}
                >
                  {currentMedia ? (
                    photoSrc ? (
                      <Box
                        component="img"
                        src={photoSrc}
                        alt={currentMedia.original_file_name || currentMedia.file_name}
                        sx={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain", display: "block" }}
                      />
                    ) : (
                      <CircularProgress />
                    )
                  ) : null}
                </Box>
                <MobileStepper
                  variant="dots"
                  steps={mediaItems.length}
                  position="static"
                  activeStep={activeStep}
                  sx={{ mt: 2, bgcolor: "transparent" }}
                  nextButton={
                    <Button
                      size="small"
                      onClick={() => setActiveStep((s) => Math.min(s + 1, mediaItems.length - 1))}
                      disabled={activeStep >= mediaItems.length - 1}
                    >
                      Next
                      <ChevronRight />
                    </Button>
                  }
                  backButton={
                    <Button
                      size="small"
                      onClick={() => setActiveStep((s) => Math.max(s - 1, 0))}
                      disabled={activeStep <= 0}
                    >
                      <ChevronLeft />
                      Back
                    </Button>
                  }
                />
              </Box>
            ) : (
              <Box>
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 700, letterSpacing: 0.6, color: "text.secondary", display: "block", mb: 1.25 }}
                >
                  Video Links
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Click a link to open the video in a new tab.
                </Typography>
                <Stack spacing={1}>
                  {mediaItems.map((item, index) => {
                    const href = item.file_path?.trim();
                    if (!href) return null;
                    const platform = videoPlatformLabel(href);
                    return (
                      <Box
                        key={item.id}
                        sx={(theme) => ({
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          px: 1.5,
                          py: 1.1,
                          borderRadius: 1.5,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                          transition: "background-color 0.15s ease",
                          "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
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
                          }}
                        >
                          <VideocamIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Video {index + 1} · {platform}
                          </Typography>
                          <Tooltip title={href} placement="top-start">
                            <Link
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              variant="body2"
                              sx={{
                                display: "block",
                                fontWeight: 700,
                                color: "primary.main",
                                cursor: "pointer",
                                width: "fit-content",
                                maxWidth: "100%",
                              }}
                            >
                              Open {platform} video
                            </Link>
                          </Tooltip>
                        </Box>
                        <OpenInNewIcon sx={{ fontSize: 18, color: "primary.main", flexShrink: 0, opacity: 0.75 }} />
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </ListPageLayout>
  );
}
