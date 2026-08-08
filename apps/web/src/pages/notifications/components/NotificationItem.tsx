import { Box, Chip, Stack, Typography } from "@mui/material";
import { Circle as UnreadDotIcon } from "@mui/icons-material";

import { colorTokens } from "../../../tokens/colors";
import { formatDateTime } from "../../../utils/formatters";
import { NOTIFICATION_MODULE_LABELS } from "../notifications.mock";
import type { AppNotification } from "../notification.types";

type Props = {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
};

export default function NotificationItem({ notification, onOpen }: Props) {
  const unread = !notification.isRead;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen(notification)}
      data-testid={`notification-item-${notification.id}`}
      data-read={notification.isRead ? "true" : "false"}
      aria-label={`${unread ? "Unread" : "Read"} notification: ${notification.title}`}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        appearance: "none",
        px: { xs: 1.5, sm: 2 },
        py: 1.75,
        border: "none",
        borderBottom: "1px solid",
        borderColor: colorTokens.border.subtle,
        bgcolor: unread ? "action.hover" : "transparent",
        borderLeft: "3px solid",
        borderLeftColor: unread ? "primary.main" : "transparent",
        transition: "background-color 0.15s ease",
        "&:hover": {
          bgcolor: unread ? "action.selected" : "action.hover",
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: -2,
        },
      }}
    >
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {unread && (
            <UnreadDotIcon
              sx={{ fontSize: 10, color: "primary.main" }}
              aria-hidden
            />
          )}
          <Chip
            size="small"
            label={NOTIFICATION_MODULE_LABELS[notification.module]}
            data-testid={`notification-module-${notification.id}`}
            sx={{ fontWeight: 700, height: 24 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            data-testid={`notification-time-${notification.id}`}
            sx={{ fontWeight: 500 }}
          >
            {formatDateTime(notification.createdAt)}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={unread ? "Unread" : "Read"}
            color={unread ? "primary" : "default"}
            data-testid={`notification-status-${notification.id}`}
            sx={{ fontWeight: 600, height: 24 }}
          />
        </Stack>

        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: unread ? 800 : 600,
            color: "text.primary",
            lineHeight: 1.35,
          }}
          data-testid={`notification-title-${notification.id}`}
        >
          {notification.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.5 }}
          data-testid={`notification-message-${notification.id}`}
        >
          {notification.message}
        </Typography>
      </Stack>
    </Box>
  );
}
