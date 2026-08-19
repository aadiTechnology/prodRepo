import { useMemo } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import { PageHeader } from "../../../components/layout";
import { ListPageLayout } from "../../../components/reusable";
import ConfirmDialog from "../../../components/semantic/ConfirmDialog";
import { useAttendanceConfigurationController } from "../../../hooks/useAttendanceConfigurationController";
import { useConfigHubNavigation } from "../../../hooks/useConfigHubNavigation";
import type { AttendanceConfigSectionId } from "./attendanceConfiguration.types";
import AttendanceStatusSection from "./components/AttendanceStatusSection";
import GraceTimeSection from "./components/GraceTimeSection";
import NotificationSettingsSection from "./components/NotificationSettingsSection";
import OfficeTimingSection from "./components/OfficeTimingSection";
import PublicHolidaysSection from "./components/PublicHolidaysSection";
import ShiftConfigurationSection from "./components/ShiftConfigurationSection";
import WorkingDaysSection from "./components/WorkingDaysSection";

const SECTION_NAV: { id: AttendanceConfigSectionId; label: string; testId: string }[] = [
  { id: "working-days", label: "Working Days", testId: "nav-working-days" },
  { id: "public-holidays", label: "Public Holidays", testId: "nav-public-holidays" },
  // { id: "shifts", label: "Shift Configuration", testId: "nav-shifts" },
  { id: "office-timing", label: "Office Timing", testId: "nav-office-timing" },
  { id: "grace-time", label: "Grace Time", testId: "nav-grace-time" },
  // { id: "attendance-status", label: "Attendance Status", testId: "nav-attendance-status" },
  // { id: "notifications", label: "Notifications", testId: "nav-notifications" },
];

function getDeleteMessage(controller: ReturnType<typeof useAttendanceConfigurationController>): string {
  const target = controller.deleteTarget;
  if (!target) return "Are you sure you want to delete this item?";
  if (target.type === "holiday") return `Delete holiday "${target.item.name}"?`;
  if (target.type === "shift") return `Delete shift "${target.item.name}"?`;
  return `Delete status "${target.item.name}"?`;
}

export default function AttendanceConfigurationPage() {
  const controller = useAttendanceConfigurationController();
  const { buildListBreadcrumbs } = useConfigHubNavigation();

  const breadcrumbLinks = buildListBreadcrumbs("Attendance Configuration");

  const activeContent = useMemo(() => {
    switch (controller.activeSection) {
      case "working-days":
        return <WorkingDaysSection controller={controller} />;
      case "public-holidays":
        return <PublicHolidaysSection controller={controller} />;
      // case "shifts":
      //   return <ShiftConfigurationSection controller={controller} />;
      case "office-timing":
        return <OfficeTimingSection controller={controller} />;
      case "grace-time":
        return <GraceTimeSection controller={controller} />;
      // case "attendance-status":
      //   return <AttendanceStatusSection controller={controller} />;
      // case "notifications":
      //   return <NotificationSettingsSection controller={controller} />;
      default:
        return null;
    }
  }, [controller]);

  return (
    <ListPageLayout
      data-testid="page-attendance-configuration"
      scrollableFormContent
      header={
        <PageHeader links={breadcrumbLinks} homePath="/" />
      }
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
          <Paper
            sx={{
              width: { xs: "100%", md: 280 },
              borderRadius: 3,
              p: 1.5,
              flexShrink: 0,
              position: { md: "sticky" },
              top: { md: 16 },
            }}
            data-testid="attendance-config-nav"
          >
            <FormControl fullWidth size="small" sx={{ mb: 1.5, px: 0.5 }}>
              <InputLabel id="label-attendance-config-academic-year">Academic Year</InputLabel>
              <Select
                labelId="label-attendance-config-academic-year"
                label="Academic Year"
                value={controller.state.general.academicYearId}
                onChange={(e) => controller.setAcademicYear(e.target.value)}
                inputProps={{ "data-testid": "select-academic-year" }}
              >
                {controller.academicYears.map((year) => (
                  <MenuItem
                    key={year.id}
                    value={year.id}
                    data-testid={`option-academic-year-${year.id}`}
                  >
                    {year.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <List disablePadding>
              {SECTION_NAV.map((section) => {
                const isActive = controller.activeSection === section.id;
                return (
                  <ListItemButton
                    key={section.id}
                    selected={isActive}
                    onClick={() => controller.setActiveSection(section.id)}
                    data-testid={section.testId}
                    sx={{ borderRadius: 2, mb: 0.5 }}
                  >
                    <ListItemText
                      primary={section.label}
                      primaryTypographyProps={{ fontSize: "0.88rem", fontWeight: isActive ? 700 : 500 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>

          <Box sx={{ flex: 1, minWidth: 0, width: "100%" }} data-testid="attendance-config-content">
            {activeContent}
          </Box>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={controller.deleteTarget != null}
        onClose={() => controller.setDeleteTarget(null)}
        onConfirm={controller.confirmDelete}
        title="Confirm Delete"
        message={getDeleteMessage(controller)}
        confirmLabel="Delete"
        data-testid="dialog-delete-confirm"
      />
    </ListPageLayout>
  );
}
