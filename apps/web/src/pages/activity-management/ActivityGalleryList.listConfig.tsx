import { Box, Chip, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { ListConfig } from "../../components/reusable/listFramework.types";
import type { ActivityGalleryListItem, GalleryType } from "../../types/activityGallery";
import { formatShortDate } from "../../utils/formatters";

const GALLERY_PATH = "/activity-management/photo-video-gallery";

export function galleryListPathByType(type: GalleryType): string {
  return `${GALLERY_PATH}?type=${type.toLowerCase()}`;
}

const GALLERY_LIST_COLUMN_WIDTHS = {
  gallery_name: 200,
  class_name: 320,
  media_count: 110,
  last_updated: 130,
} as const;

type GalleryListSortBy = "gallery_name";

type Args = {
  navigate: NavigateFunction;
  galleryType: GalleryType;
  onDeleteClick: (row: ActivityGalleryListItem) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  showStatus?: boolean;
};

function renderClassLabel(row: ActivityGalleryListItem): ReactNode {
  const raw = row.class_name?.trim();
  if (!raw) return "—";

  const classes = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (classes.length === 0) return "—";

  const CLASSES_PER_ROW = 3;
  const rows: string[] = [];
  for (let i = 0; i < classes.length; i += CLASSES_PER_ROW) {
    rows.push(classes.slice(i, i + CLASSES_PER_ROW).join(", "));
  }

  if (rows.length === 1) {
    return rows[0];
  }

  return (
    <Box sx={{ maxWidth: GALLERY_LIST_COLUMN_WIDTHS.class_name }}>
      {rows.map((line, index) => (
        <Box key={index} component="div" sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
          {line}
        </Box>
      ))}
    </Box>
  );
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
  showStatus = true,
}: Args): ListConfig<ActivityGalleryListItem, GalleryListSortBy> {
  const columns: ListConfig<ActivityGalleryListItem, GalleryListSortBy>["columns"] = [
    {
      id: "gallery_name",
      label: "Gallery Name",
      width: GALLERY_LIST_COLUMN_WIDTHS.gallery_name,
      render: (row) => (
        <Box sx={{ minWidth: 0, maxWidth: GALLERY_LIST_COLUMN_WIDTHS.gallery_name }}>
          <Tooltip title={row.gallery_name}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.gallery_name}
            </Typography>
          </Tooltip>
          {showStatus ? (
            <Chip
              size="small"
              label={row.is_published ? "Published" : "Draft"}
              color={row.is_published ? "success" : "default"}
              variant={row.is_published ? "filled" : "outlined"}
              sx={{ mt: 0.5, height: 22, fontSize: "0.7rem", fontWeight: 600 }}
            />
          ) : null}
        </Box>
      ),
    },
    {
      id: "class_name",
      label: "Class (Grade)",
      width: GALLERY_LIST_COLUMN_WIDTHS.class_name,
      render: (row) => renderClassLabel(row),
    },
    {
      id: "media_count",
      label: "Media Count",
      width: GALLERY_LIST_COLUMN_WIDTHS.media_count,
      render: (row) => mediaCountLabel(row, galleryType),
    },
    {
      id: "updated_at",
      label: "Last Updated",
      width: GALLERY_LIST_COLUMN_WIDTHS.last_updated,
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
        onView: () =>
          navigate(`${GALLERY_PATH}/${row.id}`, { state: { galleryType } }),
        onEdit: canEdit
          ? () => navigate(`/activity-management/photo-video-gallery/${row.id}/edit`)
          : undefined,
        onDelete: canDelete ? () => onDeleteClick(row) : undefined,
      }),
    },
  };
}
