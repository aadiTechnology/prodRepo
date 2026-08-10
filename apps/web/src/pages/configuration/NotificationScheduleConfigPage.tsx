/**
 * Tenant-admin configuration for Holiday / Exam reminder and day notifications.
 * Both modules share one card component rendered from MODULE_SECTIONS JSON config.
 * UI layout only; data/API behavior unchanged.
 */
import { useCallback, useEffect, useState, type ElementType, type ReactNode } from "react";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
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

const DAYS_OPTIONS = Array.from({ length: 31 }, (_, i) => i);

const SWITCH_SX = {
  p: 1,
  bgcolor: "transparent",
  border: "none",
  minWidth: 100,
} as const;

type ModuleKey = "holiday" | "exam";

/** Shared panel metadata (JSON-style schema for both modules). */
type PanelDef = {
  id: "whenToSend" | "deliveryChannels";
  title: string;
  icon: ElementType;
};

const SHARED_PANELS: PanelDef[] = [
  { id: "whenToSend", title: "When to send", icon: AccessTimeIcon },
  { id: "deliveryChannels", title: "Delivery channels", icon: SendOutlinedIcon },
];

type ModuleSectionDef = {
  key: ModuleKey;
  title: string;
  description: string;
  headerIcon: ElementType;
  headerIconBg: (theme: Theme) => string;
  headerIconColor: (theme: Theme) => string;
  reminderSecondary: string;
  dayPrimary: string;
  daySecondary: string;
  dayHelper: string;
  panels: PanelDef[];
  deliveryRows: Array<{
    id: "push" | "inApp";
    primary: string;
    secondary: string;
    alwaysOn?: boolean;
  }>;
};

/**
 * Single source of truth for Holiday + Exam cards.
 * Page maps this array — no duplicated card markup per module.
 */
const MODULE_SECTIONS: ModuleSectionDef[] = [
  {
    key: "holiday",
    title: "Holiday notifications",
    description: "Notify users about upcoming holidays.",
    headerIcon: BeachAccessIcon,
    headerIconBg: (t) => alpha(t.palette.success.main, 0.12),
    headerIconColor: (t) => t.palette.success.dark,
    reminderSecondary: "Holiday reminder",
    dayPrimary: "On the holiday",
    daySecondary: "Holiday day notification",
    dayHelper: "On the holiday date",
    panels: SHARED_PANELS,
    deliveryRows: [
      {
        id: "push",
        primary: "Push notification",
        secondary: "Send to user's device",
      },
      {
        id: "inApp",
        primary: "In-app notification",
        secondary: "Store in the in-app inbox",
        alwaysOn: true,
      },
    ],
  },
  {
    key: "exam",
    title: "Exam notifications",
    description: "Notify users about upcoming examinations.",
    headerIcon: AssignmentOutlinedIcon,
    headerIconBg: (t) => alpha(t.palette.secondary.main, 0.12),
    headerIconColor: (t) => t.palette.secondary.dark,
    reminderSecondary: "Exam reminder",
    dayPrimary: "On exam date",
    daySecondary: "Exam day notification",
    dayHelper: "On the exam date",
    panels: SHARED_PANELS,
    deliveryRows: [
      {
        id: "push",
        primary: "Push notification",
        secondary: "Send to user's device",
      },
      {
        id: "inApp",
        primary: "In-app notification",
        secondary: "Store in the in-app inbox",
        alwaysOn: true,
      },
    ],
  },
];

function reminderPrimaryLabel(days: number): string {
  return days === 1 ? "1 day before" : `${days} days before`;
}

function daysSuffix(days: number): string {
  return days === 1 ? "day before" : "days before";
}

function HeaderIcon({
  icon: Icon,
  bg,
  color,
}: {
  icon: ElementType;
  bg: (theme: Theme) => string;
  color: (theme: Theme) => string;
}) {
  return (
    <Box
      sx={(theme) => ({
        width: 40,
        height: 40,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: bg(theme),
        color: color(theme),
      })}
    >
      <Icon sx={{ fontSize: 22 }} />
    </Box>
  );
}

function ConfigPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
          minHeight: 44,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 18, color: "primary.main", flexShrink: 0 }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: "primary.main",
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          px: { xs: 1.25, sm: 1.5 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Field row: primary + secondary detail, optional mid control, end switch — no field icons. */
function ConfigRow({
  primary,
  secondary,
  mid,
  end,
}: {
  primary: string;
  secondary: string;
  mid?: ReactNode;
  end: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      sx={{
        py: 1.25,
        minHeight: 72,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-of-type": { borderBottom: "none" },
        rowGap: 1,
      }}
    >
      <Box sx={{ flex: "1 1 120px", minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {primary}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.3 }}
        >
          {secondary}
        </Typography>
      </Box>

      {mid != null && (
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{mid}</Box>
      )}

      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          ml: { xs: "auto", sm: mid != null ? 0 : "auto" },
        }}
      >
        {end}
      </Box>
    </Stack>
  );
}

/** Reusable Holiday / Exam card — structure driven by ModuleSectionDef JSON. */
function ModuleConfigCard({
  section,
  value,
  onChange,
  disabled,
  defaultExpanded = true,
}: {
  section: ModuleSectionDef;
  value: ScheduleModuleConfig;
  onChange: (next: ScheduleModuleConfig) => void;
  disabled?: boolean;
  defaultExpanded?: boolean;
}) {
  const moduleKey = section.key;
  const moduleActive = value.reminder_enabled || value.day_enabled;

  const daysControl = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="nowrap">
      <TextField
        select
        size="small"
        value={value.reminder_days_before}
        disabled={disabled || !value.reminder_enabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          const days = Number.isFinite(n)
            ? Math.max(0, Math.min(30, Math.floor(n)))
            : 1;
          onChange({ ...value, reminder_days_before: days });
        }}
        inputProps={{ "data-testid": `input-${moduleKey}-days-before` }}
        sx={{ minWidth: 72, maxWidth: 88 }}
      >
        {DAYS_OPTIONS.map((d) => (
          <MenuItem key={d} value={d}>
            {d}
          </MenuItem>
        ))}
      </TextField>
      <Typography variant="body2" color="text.secondary" whiteSpace="nowrap">
        {daysSuffix(value.reminder_days_before)}
      </Typography>
    </Stack>
  );

  const whenToSendRows = (
    <>
      <ConfigRow
        primary={reminderPrimaryLabel(value.reminder_days_before)}
        secondary={section.reminderSecondary}
        mid={daysControl}
        end={
          <LabeledSwitch
            label={value.reminder_enabled ? "ON" : "OFF"}
            checked={value.reminder_enabled}
            disabled={disabled}
            onChange={(_, checked) =>
              onChange({ ...value, reminder_enabled: checked })
            }
            inputTestId={`toggle-${moduleKey}-reminder`}
            sx={SWITCH_SX}
          />
        }
      />
      <ConfigRow
        primary={section.dayPrimary}
        secondary={section.daySecondary}
        mid={
          <Typography variant="body2" color="text.secondary" whiteSpace="nowrap">
            {section.dayHelper}
          </Typography>
        }
        end={
          <LabeledSwitch
            label={value.day_enabled ? "ON" : "OFF"}
            checked={value.day_enabled}
            disabled={disabled}
            onChange={(_, checked) => onChange({ ...value, day_enabled: checked })}
            inputTestId={`toggle-${moduleKey}-day`}
            sx={SWITCH_SX}
          />
        }
      />
    </>
  );

  const deliveryRows = section.deliveryRows.map((row) => {
    if (row.alwaysOn) {
      return (
        <ConfigRow
          key={row.id}
          primary={row.primary}
          secondary={row.secondary}
          end={
            <LabeledSwitch
              label="ON"
              checked
              disabled
              onChange={() => {
                /* always on */
              }}
              inputTestId={`checkbox-${moduleKey}-in-app`}
              sx={SWITCH_SX}
            />
          }
        />
      );
    }

    return (
      <ConfigRow
        key={row.id}
        primary={row.primary}
        secondary={row.secondary}
        end={
          <LabeledSwitch
            label={value.push_enabled ? "ON" : "OFF"}
            checked={value.push_enabled}
            disabled={disabled}
            onChange={(_, checked) =>
              onChange({ ...value, push_enabled: checked })
            }
            inputTestId={`toggle-${moduleKey}-push`}
            sx={SWITCH_SX}
          />
        }
      />
    );
  });

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      data-testid={`schedule-config-${moduleKey}`}
      sx={{
        borderRadius: "12px !important",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
        "&:before": { display: "none" },
        "&.Mui-expanded": { margin: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.5,
          minHeight: 72,
          gap: 1,
          "& .MuiAccordionSummary-content": {
            my: 1.25,
            alignItems: "flex-start",
            gap: 1.5,
            mr: 1,
          },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
          <HeaderIcon
            icon={section.headerIcon}
            bg={section.headerIconBg}
            color={section.headerIconColor}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              sx={{ mb: 0.25 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {section.title}
              </Typography>
              <Chip
                size="small"
                label={moduleActive ? "Enabled" : "Disabled"}
                color={moduleActive ? "success" : "default"}
                variant={moduleActive ? "filled" : "outlined"}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  fontWeight: 700,
                  height: 24,
                  ...(moduleActive
                    ? {
                        bgcolor: "success.light",
                        color: "success.dark",
                        "& .MuiChip-label": { px: 1.25 },
                      }
                    : {}),
                }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {section.description}
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ px: { xs: 1.5, sm: 2 }, pt: 0, pb: 2.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="stretch"
        >
          {section.panels.map((panel) => (
            <ConfigPanel key={panel.id} title={panel.title} icon={panel.icon}>
              {panel.id === "whenToSend" ? whenToSendRows : deliveryRows}
            </ConfigPanel>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
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
        {MODULE_SECTIONS.map((section) => (
          <ModuleConfigCard
            key={section.key}
            section={section}
            value={config[section.key]}
            disabled={loading || saving}
            onChange={(next) =>
              setConfig((prev) => ({ ...prev, [section.key]: next }))
            }
          />
        ))}

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
