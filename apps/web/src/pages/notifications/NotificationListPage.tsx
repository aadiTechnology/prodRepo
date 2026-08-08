import { useEffect, useMemo } from "react";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { SettingsOutlined as SettingsIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import { IconButton } from "../../components/primitives";
import { useNotifications } from "./NotificationContext";
import {
  NOTIFICATION_MODULE_PATHS,
} from "./notifications.mock";
import type { AppNotification } from "./notification.types";
import NotificationItem from "./components/NotificationItem";

function NotificationSection({
  title,
  testId,
  items,
  emptyLabel,
  onOpen,
}: {
  title: string;
  testId: string;
  items: AppNotification[];
  emptyLabel: string;
  onOpen: (notification: AppNotification) => void;
}) {
  return (
    <Box data-testid={testId}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, px: 0.25 }}>
        {title}
      </Typography>
      <Box
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        {items.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {emptyLabel}
            </Typography>
          </Box>
        ) : (
          items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={onOpen}
            />
          ))
        )}
      </Box>
    </Box>
  );
}

export default function NotificationListPage() {
  const navigate = useNavigate();
  const { visibleNotifications, unreadCount, markAsRead, markModuleAsRead, loading, error, refresh } =
    useNotifications();

  // Re-fetch list + server unread count whenever the Notification List is opened.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const { unreadItems, readItems } = useMemo(() => {
    const unread: AppNotification[] = [];
    const read: AppNotification[] = [];
    for (const n of visibleNotifications) {
      if (n.isRead) read.push(n);
      else unread.push(n);
    }
    return { unreadItems: unread, readItems: read };
  }, [visibleNotifications]);

  const handleOpen = async (notification: AppNotification) => {
    if (notification.module === "holiday") {
      await markModuleAsRead("holiday");
    } else {
      await markAsRead(notification.id);
    }
    navigate(NOTIFICATION_MODULE_PATHS[notification.module]);
  };

  return (
    <ListPageLayout
      data-testid="page-notifications"
      scrollableFormContent
      contentPaddingSize="normal"
      header={
        <PageHeader
          homePath="/"
          links={[{ title: "Notifications", path: "/notifications" }]}
          actions={
            <Tooltip title="Settings">
              <IconButton
                color="inherit"
                aria-label="Settings"
                onClick={() => navigate("/notifications/settings")}
                data-testid="open-notification-settings"
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.7)",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "12px",
                  width: 40,
                  height: 40,
                  "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
                }}
              >
                <SettingsIcon sx={{ fontSize: 22, color: "text.secondary" }} />
              </IconButton>
            </Tooltip>
          }
        />
      }
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click a notification to open its module. Unread items move to Read after you open them.
          </Typography>
        </Box>

        {error && (
          <Typography variant="body2" color="error" data-testid="notification-error">
            {error}
          </Typography>
        )}

        {loading && visibleNotifications.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: "center" }} data-testid="notification-list-loading">
            <Typography variant="body2" color="text.secondary">
              Loading notifications…
            </Typography>
          </Box>
        ) : visibleNotifications.length === 0 ? (
          <Box
            sx={{
              px: 2,
              py: 6,
              textAlign: "center",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
            data-testid="notification-list-empty"
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              No notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enable modules in Notification Settings to see related alerts, or check back later.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2.5} data-testid="notification-list">
            <NotificationSection
              title={`Unread (${unreadCount})`}
              testId="notification-section-unread"
              items={unreadItems}
              emptyLabel="No unread notifications"
              onOpen={handleOpen}
            />
            <NotificationSection
              title={`Read (${readItems.length})`}
              testId="notification-section-read"
              items={readItems}
              emptyLabel="No read notifications yet"
              onOpen={handleOpen}
            />
          </Stack>
        )}
      </Stack>
    </ListPageLayout>
  );
}
