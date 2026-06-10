import { Box, Chip, Tooltip, Typography } from "@mui/material";
import type { NavigateFunction } from "react-router-dom";
import type { Notice, NoticeStatus } from "../../types/notice";
import type { ListConfig } from "../../components/reusable/listFramework.types";
import TableRowActions from "../../components/reusable/TableRowActions";
import { formatShortDate } from "../../utils/formatters";
import { audienceTypeLabel, noticeStatusLabel, noticeTypeLabel } from "../../utils/noticeLabels";

type NoticeListSortBy = "title";

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

type NoticeListConfigArgs = {
  navigate: NavigateFunction;
  onDeleteClick: (row: Notice) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function createNoticeListConfig({
  navigate,
  onDeleteClick,
  canEdit = true,
  canDelete = true,
}: NoticeListConfigArgs): ListConfig<Notice, NoticeListSortBy> {
  return {
    columns: [
      {
        id: "title",
        label: "Title",
        render: (row) => (
          <Tooltip title={row.title}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                maxWidth: 280,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.title}
            </Typography>
          </Tooltip>
        ),
      },
      {
        id: "notice_type",
        label: "Type",
        render: (row) => noticeTypeLabel(row.notice_type),
      },
      {
        id: "audience_type",
        label: "Audience",
        render: (row) => audienceTypeLabel(row.audience_type),
      },
      {
        id: "publish_date",
        label: "Publish Date",
        render: (row) => formatShortDate(row.publish_date),
      },
      {
        id: "expiry_date",
        label: "Expiry Date",
        render: (row) => (row.expiry_date ? formatShortDate(row.expiry_date) : "—"),
      },
      {
        id: "status",
        label: "Status",
        render: (row) => (
          <Chip
            size="small"
            label={noticeStatusLabel(row.status)}
            color={statusChipColor(row.status)}
            variant={row.status === "DRAFT" ? "outlined" : "filled"}
          />
        ),
      },
    ],
    sortOptions: [],
    uiPolicy: {
      emptyMessage: (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No notices available
          </Typography>
        </Box>
      ),
      errorFallbackMessage: "Unable to load notices",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (row) => ({
        onView: () => navigate(`/communication/notices/${row.id}`),
        onEdit:
          canEdit && row.status !== "EXPIRED"
            ? () => navigate(`/communication/notices/${row.id}/edit`)
            : undefined,
        onDelete: canDelete ? () => onDeleteClick(row) : undefined,
      }),
    },
  };
}

export function renderNoticeRowActions(args: {
  row: Notice;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { onView, onEdit, onDelete } = args;
  return <TableRowActions onView={onView} onEdit={onEdit} onDelete={onDelete} />;
}
