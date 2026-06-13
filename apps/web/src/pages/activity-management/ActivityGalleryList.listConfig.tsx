import { Avatar, Box, Chip, Tooltip, Typography, alpha } from "@mui/material";
import {
  Collections as PhotoIcon,
  Videocam as VideoIcon,
} from "@mui/icons-material";
import type { NavigateFunction } from "react-router-dom";
import type { ListConfig } from "../../components/reusable/listFramework.types";
import type { ActivityGalleryListItem, GalleryType } from "../../types/activityGallery";
import { formatShortDate } from "../../utils/formatters";
import { colorTokens } from "../../tokens/colors";

const GALLERY_PATH = "/activity-management/photo-video-gallery";

type GalleryListSortBy = "gallery_name";

type Args = {
  navigate: NavigateFunction;
  galleryType: GalleryType;
  onDeleteClick: (row: ActivityGalleryListItem) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

function formatClassLabel(row: ActivityGalleryListItem): string {
  if (!row.class_name) return "—";
  if (row.division_name) return `${row.class_name} (${row.division_name})`;
  return row.class_name;
}

function mediaCountLabel(row: ActivityGalleryListItem, galleryType: GalleryType): string {
  const count = galleryType === "Photo" ? row.photo_count : row.video_count;
  const unit = galleryType === "Photo" ? "Photo" : "Video";
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function createActivityGalleryListConfig({
  navigate,
  galleryType,
  onDeleteClick,
  canEdit = true,
  canDelete = true,
}: Args): ListConfig<ActivityGalleryListItem, GalleryListSortBy> {
  const columns: ListConfig<ActivityGalleryListItem, GalleryListSortBy>["columns"] = [
    {
      id: "gallery_name",
      label: galleryType === "Photo" ? "Gallery Name" : "Video Gallery Name",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 44,
              height: 44,
              bgcolor: alpha(colorTokens.primary.main, 0.1),
              color: "primary.main",
            }}
          >
            {galleryType === "Photo" ? <PhotoIcon fontSize="small" /> : <VideoIcon fontSize="small" />}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Tooltip title={row.gallery_name}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  maxWidth: 240,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.gallery_name}
              </Typography>
            </Tooltip>
            <Chip
              size="small"
              label={row.is_published ? "Published" : "Draft"}
              color={row.is_published ? "success" : "default"}
              variant={row.is_published ? "filled" : "outlined"}
              sx={{ mt: 0.5, height: 22, fontSize: "0.7rem", fontWeight: 600 }}
            />
          </Box>
        </Box>
      ),
    },
    ...(galleryType === "Photo"
      ? [
          {
            id: "class_name",
            label: "Class (Grade)",
            render: (row: ActivityGalleryListItem) => formatClassLabel(row),
          } as const,
        ]
      : []),
    {
      id: "media_count",
      label: "Media Count",
      render: (row) => mediaCountLabel(row, galleryType),
    },
    {
      id: "updated_at",
      label: "Last Updated",
      render: (row) => formatShortDate(row.updated_at),
    },
  ];

  return {
    columns,
    sortOptions: [],
    uiPolicy: {
      emptyMessage: `No ${galleryType === "Photo" ? "photo" : "video"} galleries found.`,
      errorFallbackMessage: "Unable to load gallery records.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (row) => ({
        onView: () => navigate(`${GALLERY_PATH}/${row.id}`),
        onEdit: canEdit
          ? () => navigate(`/activity-management/photo-video-gallery/${row.id}/edit`)
          : undefined,
        onDelete: canDelete ? () => onDeleteClick(row) : undefined,
      }),
    },
  };
}
