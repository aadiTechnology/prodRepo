import { useCallback, useEffect, useMemo, useState } from "react";
import { useGalleryMediaSrc } from "../../hooks/useGalleryMediaSrc";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MobileStepper,
  Snackbar,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import {
  ChevronLeft,
  ChevronRight,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { ListPageLayout } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import { FormHeaderIconAction } from "../../components/primitives";
import activityGalleryService from "../../api/services/activityGalleryService";
import { useActivityGalleryPermissions } from "../../hooks/useActivityGalleryPermissions";
import type { ActivityGallery } from "../../types/activityGallery";
import { apiBaseUrl } from "../../config";
import { formatShortDate } from "../../utils/formatters";
import { buildYoutubeEmbedUrl, isYoutubeUrl } from "../../utils/youtube";
import { colorTokens } from "../../tokens/colors";

const GALLERY_PATH = "/activity-management/photo-video-gallery";

function buildMediaUrl(filePath: string): string {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  if (filePath.includes("/media/") && filePath.endsWith("/content")) {
    return "";
  }
  return `${apiBaseUrl}${filePath}`;
}

export default function ActivityGalleryDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const galleryId = id ? Number(id) : NaN;
  const perms = useActivityGalleryPermissions();

  const [gallery, setGallery] = useState<ActivityGallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState<string | null>(null);

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
        setError("You are not authorized for this activity");
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

  const handleDownload = async (mediaId?: number) => {
    if (!gallery) return;
    const targets = mediaId
      ? mediaItems.filter((m) => m.id === mediaId)
      : mediaItems;
    if (targets.length === 0) {
      setSnackbar("No media available to download.");
      return;
    }
    try {
      for (const item of targets) {
        await activityGalleryService.downloadMedia(
          gallery.id,
          item.id,
          item.original_file_name || item.file_name,
        );
      }
    } catch {
      setSnackbar("Download failed");
    }
  };

  if (!perms.canView && !perms.readOnlyAudience) {
    return (
      <ListPageLayout header={<PageHeader links={[{ title: "Photo / Video Gallery", path: GALLERY_PATH }]} homePath="/" />}>
        <Typography color="error" sx={{ p: 3 }}>
          You are not authorized for this activity
        </Typography>
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
      <ListPageLayout header={<PageHeader links={[{ title: "Photo / Video Gallery", path: GALLERY_PATH }]} homePath="/" />}>
        <Alert severity="error" sx={{ m: 2 }}>
          {error ?? "Gallery not found"}
        </Alert>
        <Button sx={{ ml: 2 }} onClick={() => void load()}>
          Retry
        </Button>
      </ListPageLayout>
    );
  }

  const classLabel = gallery.class_name
    ? `${gallery.class_name}${gallery.division_name ? ` (${gallery.division_name})` : ""}`
    : "—";

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[
            { title: "Photo / Video Gallery", path: GALLERY_PATH },
            { title: gallery.gallery_name, path: "#" },
          ]}
          homePath="/"
          actions={
            <Stack direction="row" spacing={1}>
              {gallery.gallery_type === "Photo" && perms.canDownload ? (
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => void handleDownload()}
                  disabled={mediaItems.length === 0}
                >
                  Download
                </Button>
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
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Activity Date
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {formatShortDate(gallery.activity_date)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Class
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {classLabel}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Media
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {gallery.media_count}
            </Typography>
          </Grid>
          {!perms.readOnlyAudience ? (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {gallery.is_published ? "Published" : "Draft"}
              </Typography>
            </Grid>
          ) : null}
        </Grid>

        {gallery.description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {gallery.description}
          </Typography>
        ) : null}

        {mediaItems.length === 0 ? (
          <Alert severity="info">No media uploaded for this gallery yet.</Alert>
        ) : gallery.gallery_type === "Photo" ? (
          <Box>
            <Box
              sx={{
                position: "relative",
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: alpha(colorTokens.text.primary, 0.04),
                minHeight: 360,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {currentMedia ? (
                photoSrc ? (
                  <Box
                    component="img"
                    src={photoSrc}
                    alt={currentMedia.original_file_name || currentMedia.file_name}
                    sx={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain" }}
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
          <Box sx={{ borderRadius: 2, overflow: "hidden", bgcolor: "#000" }}>
            {currentMedia ? (
              isYoutubeUrl(currentMedia.file_path) ? (
                <Box
                  component="iframe"
                  src={buildYoutubeEmbedUrl(currentMedia.file_path)}
                  title={currentMedia.original_file_name || "YouTube video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  sx={{ width: "100%", minHeight: 420, border: 0, display: "block" }}
                />
              ) : (
                <Box
                  component="video"
                  src={buildMediaUrl(currentMedia.file_path)}
                  controls
                  sx={{ width: "100%", maxHeight: 520, display: "block" }}
                />
              )
            ) : null}
          </Box>
        )}

        {mediaItems.length > 1 && gallery.gallery_type === "Video" ? (
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            {mediaItems.map((item, index) => (
              <Button
                key={item.id}
                size="small"
                variant={index === activeStep ? "contained" : "outlined"}
                onClick={() => setActiveStep(index)}
              >
                Video {index + 1}
              </Button>
            ))}
          </Stack>
        ) : null}

        {gallery.gallery_type === "Photo" && currentMedia ? (
          <Box sx={{ mt: 2 }}>
            <IconButton onClick={() => void handleDownload(currentMedia.id)} color="primary">
              <DownloadIcon />
            </IconButton>
            <Typography component="span" variant="body2">
              Download current photo
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert onClose={() => setSnackbar(null)} severity="info" sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}
