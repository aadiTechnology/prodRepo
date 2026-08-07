import { Box, Stack, Typography } from "@mui/material";

import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import { LabeledSwitch } from "../../components/semantic";
import { useNotifications } from "./NotificationContext";
import {
  NOTIFICATION_MODULE_LABELS,
  NOTIFICATION_MODULE_ORDER,
} from "./notifications.mock";
import type { NotificationModule } from "./notification.types";

export default function NotificationSettingsPage() {
  const { settings, setModuleEnabled } = useNotifications();

  return (
    <ListPageLayout
      data-testid="page-notification-settings"
      scrollableFormContent
      contentPaddingSize="normal"
      header={
        <PageHeader
          homePath="/"
          links={[
            { title: "Notifications", path: "/notifications" },
            { title: "Settings", path: "/notifications/settings" },
          ]}
        />
      }
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Notification Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose which modules can appear in your notification list. Changes apply immediately.
          </Typography>
        </Box>

        <Stack
          spacing={1.5}
          data-testid="notification-settings-list"
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          {NOTIFICATION_MODULE_ORDER.map((module: NotificationModule) => (
            <Box
              key={module}
              data-testid={`notification-settings-row-${module}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {NOTIFICATION_MODULE_LABELS[module]}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {settings[module]
                    ? "Notifications from this module are shown"
                    : "Notifications from this module are hidden"}
                </Typography>
              </Box>
              <LabeledSwitch
                label={settings[module] ? "On" : "Off"}
                checked={settings[module]}
                onChange={(_, checked) => setModuleEnabled(module, checked)}
                inputTestId={`toggle-notification-module-${module}`}
                sx={{ p: 1, bgcolor: "transparent", border: "none" }}
              />
            </Box>
          ))}
        </Stack>
      </Stack>
    </ListPageLayout>
  );
}
