/**
 * Tenant-admin configuration for Holiday / Exam reminder and day notifications.
 * Simple form aligned with existing configuration UI patterns.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";

import notificationService, {
  type NotificationScheduleConfig,
  type ScheduleModuleConfig,
} from "../../api/services/notificationService";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import { LabeledSwitch } from "../../components/semantic";

const DEFAULT_MODULE: ScheduleModuleConfig = {
  reminder_enabled: true,
  reminder_days_before: 1,
  day_enabled: true,
  push_enabled: true,
};

const DEFAULT_CONFIG: NotificationScheduleConfig = {
  holiday: { ...DEFAULT_MODULE },
  exam: { ...DEFAULT_MODULE },
};

type ModuleKey = "holiday" | "exam";

function ModuleConfigCard({
  title,
  description,
  moduleKey,
  value,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  moduleKey: ModuleKey;
  value: ScheduleModuleConfig;
  onChange: (next: ScheduleModuleConfig) => void;
  disabled?: boolean;
}) {
  return (
    <Stack
      spacing={2}
      data-testid={`schedule-config-${moduleKey}`}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>

      <LabeledSwitch
        label={value.reminder_enabled ? "Reminder On" : "Reminder Off"}
        checked={value.reminder_enabled}
        disabled={disabled}
        onChange={(_, checked) =>
          onChange({ ...value, reminder_enabled: checked })
        }
        inputTestId={`toggle-${moduleKey}-reminder`}
        sx={{ p: 1, bgcolor: "transparent", border: "none" }}
      />

      <TextField
        label="Reminder days before"
        type="number"
        size="small"
        value={value.reminder_days_before}
        disabled={disabled || !value.reminder_enabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          const days = Number.isFinite(n) ? Math.max(0, Math.min(30, Math.floor(n))) : 1;
          onChange({ ...value, reminder_days_before: days });
        }}
        inputProps={{ min: 0, max: 30, "data-testid": `input-${moduleKey}-days-before` }}
        helperText="0 = on the same day as the event start; 1 = one day before."
        sx={{ maxWidth: 280 }}
      />

      <LabeledSwitch
        label={value.day_enabled ? "Day notification On" : "Day notification Off"}
        checked={value.day_enabled}
        disabled={disabled}
        onChange={(_, checked) => onChange({ ...value, day_enabled: checked })}
        inputTestId={`toggle-${moduleKey}-day`}
        sx={{ p: 1, bgcolor: "transparent", border: "none" }}
      />

      <LabeledSwitch
        label={value.push_enabled ? "Push On" : "Push Off"}
        checked={value.push_enabled}
        disabled={disabled}
        onChange={(_, checked) => onChange({ ...value, push_enabled: checked })}
        inputTestId={`toggle-${moduleKey}-push`}
        sx={{ p: 1, bgcolor: "transparent", border: "none" }}
      />
      <Typography variant="caption" color="text.secondary">
        Push Off still creates in-app inbox notifications when the event is enabled.
      </Typography>
    </Stack>
  );
}

export default function NotificationScheduleConfigPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [config, setConfig] = useState<NotificationScheduleConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getScheduleConfig();
      setConfig(data);
    } catch {
      enqueueSnackbar("Failed to load notification schedule configuration", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await notificationService.updateScheduleConfig(config);
      setConfig(saved);
      enqueueSnackbar("Notification schedule saved", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to save configuration", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setProcessing(true);
    try {
      const result = await notificationService.processScheduled();
      enqueueSnackbar(
        `${result.message}: ${result.notificationsCreated} new notification(s)`,
        { variant: "success" }
      );
    } catch {
      enqueueSnackbar("Failed to process scheduled notifications", {
        variant: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ListPageLayout
      data-testid="page-notification-schedule-config"
      scrollableFormContent
      contentPaddingSize="normal"
      header={
        <PageHeader
          homePath="/"
          links={[
            { title: "Basic Configuration", path: "/configuration" },
            {
              title: "Holiday / Exam reminders",
              path: "/academics/configuration/notification-schedule",
            },
          ]}
        />
      }
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Holiday & Exam reminders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure when reminder and day notifications are generated. Users also need the
            matching module enabled under Notification Settings. Supported events:
            holiday.reminder, holiday.day, exam.reminder, exam.day.
          </Typography>
        </Box>

        <ModuleConfigCard
          title="Holiday"
          description="Reminder N days before the holiday, and a day notification on the holiday."
          moduleKey="holiday"
          value={config.holiday}
          disabled={loading || saving}
          onChange={(holiday) => setConfig((prev) => ({ ...prev, holiday }))}
        />

        <ModuleConfigCard
          title="Exam"
          description="Reminder N days before the exam, and a day notification on the exam date."
          moduleKey="exam"
          value={config.exam}
          disabled={loading || saving}
          onChange={(exam) => setConfig((prev) => ({ ...prev, exam }))}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={loading || saving}
            data-testid="btn-save-schedule-config"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            variant="outlined"
            onClick={() => void runNow()}
            disabled={loading || processing || saving}
            data-testid="btn-process-scheduled-now"
          >
            {processing ? "Processing…" : "Process due notifications now"}
          </Button>
        </Stack>
      </Stack>
    </ListPageLayout>
  );
}
