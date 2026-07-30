import { Box, Chip, Typography } from "@mui/material";
import type { NavigateFunction } from "react-router-dom";
import type { Notice, NoticeStatus } from "../../types/notice";
import type { ListConfig } from "../../components/reusable/listFramework.types";
import TableRowActions from "../../components/reusable/TableRowActions";
import { formatShortDate } from "../../utils/formatters";
import { audienceTypeLabel, isNoticeEditable, noticeStatusLabel, noticeTypeLabel } from "../../utils/noticeLabels";

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
  hideAdminColumns?: boolean;
};

export function createNoticeListConfig({
  navigate,
  onDeleteClick,
  canEdit = true,
  canDelete = true,
  hideAdminColumns = false,
}: NoticeListConfigArgs): ListConfig<Notice, NoticeListSortBy> {
  const columns: ListConfig<Notice, NoticeListSortBy>["columns"] = [
      {
        id: "title",
        label: "Title",
        render: (row) => (
          <Typography
            variant="body2"
            sx={{
              fontWeight: "inherit",
              maxWidth: 280,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.title}
          </Typography>
        ),
      },
      {
        id: "notice_type",
        label: "Type",
        render: (row) => noticeTypeLabel(row.notice_type),
      },
      ...(hideAdminColumns
        ? []
        : [
            {
              id: "audience_type",
              label: "Audience",
              render: (row: Notice) => audienceTypeLabel(row.audience_type),
            },
          ]),
      {
        id: "publish_date",
        label: "Publish Date",
        render: (row) => formatShortDate(row.publish_date),
      },
      // Expiry Date hidden on request.
      // {
      //   id: "expiry_date",
      //   label: "Expiry Date",
      //   render: (row) => (row.expiry_date ? formatShortDate(row.expiry_date) : "—"),
      // },
      ...(hideAdminColumns
        ? []
        : [
            {
              id: "status",
              label: "Status",
              render: (row: Notice) => (
                <Chip
                  size="small"
                  label={noticeStatusLabel(row.status)}
                  color={statusChipColor(row.status)}
                  variant={row.status === "DRAFT" ? "outlined" : "filled"}
                />
              ),
            },
          ]),
  ];

  return {
    columns,
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
          canEdit && isNoticeEditable(row.status)
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
