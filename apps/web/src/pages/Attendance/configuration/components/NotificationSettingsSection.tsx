import { Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";

import { LabeledSwitch } from "../../../../components/semantic";
import type { AttendanceConfigurationController } from "../../../../hooks/useAttendanceConfigurationController";
import ConfigSectionCard from "./ConfigSectionCard";

type Props = {
  controller: AttendanceConfigurationController;
};

export default function NotificationSettingsSection({ controller }: Props) {
  const { state, toggleNotification } = controller;

  return (
    <ConfigSectionCard
      id="section-notifications"
      title="Notification Settings"
      description="Configure who receives alerts and through which channels."
      data-testid="section-notifications"
    >
      <Stack spacing={2}>
        {state.notifications.map((notification) => (
          <Stack
            key={notification.id}
            spacing={1.5}
            sx={{
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
            data-testid={`notification-card-${notification.id}`}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {notification.label}
              </Typography>
              <LabeledSwitch
                label="Enabled"
                checked={notification.enabled}
                onChange={(_, checked) => toggleNotification(notification.id, checked)}
                inputTestId={`toggle-notification-${notification.id}`}
                sx={{ p: 1, bgcolor: "transparent", border: "none" }}
              />
            </Stack>

            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Recipients
            </Typography>
            <FormControlLabel
              control={<Checkbox checked disabled inputProps={{ "data-testid": `checkbox-notif-teacher-${notification.id}` } as object} />}
              label="Teacher"
            />
            <FormControlLabel
              control={
                <Checkbox checked disabled inputProps={{ "data-testid": `checkbox-notif-school-admin-${notification.id}` } as object} />
              }
              label="School Admin"
            />

            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Notification Trigger
            </Typography>
            <FormControlLabel
              control={
                <Checkbox checked disabled inputProps={{ "data-testid": `checkbox-notif-missed-attendance-${notification.id}` } as object} />
              }
              label="Missed Attendance"
            />

            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Channel
            </Typography>
            <FormControlLabel
              control={<Checkbox checked disabled inputProps={{ "data-testid": `checkbox-notif-sms-${notification.id}` } as object} />}
              label="SMS"
            />
          </Stack>
        ))}
      </Stack>
    </ConfigSectionCard>
  );
}
