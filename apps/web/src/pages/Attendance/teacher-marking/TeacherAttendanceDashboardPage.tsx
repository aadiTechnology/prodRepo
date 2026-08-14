import { useMemo } from "react";
import { Box, Paper, Tab, Tabs, Snackbar, Alert } from "@mui/material";

import { PageHeader, PageLayout } from "../../../components/layout";
import { useTeacherAttendanceMarkingController } from "../../../hooks/useTeacherAttendanceMarkingController";
import type { TeacherAttendanceTab } from "../../../hooks/useTeacherAttendanceMarkingController";
import AdminAttendanceDetailsTab from "./components/AdminAttendanceDetailsTab";
import TeacherCheckInOutTab from "./components/TeacherCheckInOutTab";
import TeacherMarkAttendanceTab from "./components/TeacherMarkAttendanceTab";

const BASE_TABS: { id: TeacherAttendanceTab; label: string; testId: string }[] = [
  { id: "check-in-out", label: "Check In / Check Out", testId: "tab-check-in-out" },
  { id: "mark-attendance", label: "Mark Attendance", testId: "tab-mark-attendance" },
];

const ADMIN_TABS: { id: TeacherAttendanceTab; label: string; testId: string }[] = [
  // { id: "check-in-out", label: "Check In / Check Out", testId: "tab-check-in-out" },
  { id: "mark-attendance", label: "Mark Attendance", testId: "tab-mark-attendance" },
  { id: "attendance-details", label: "Attendance Approval", testId: "tab-attendance-details" },
];

export default function TeacherAttendanceDashboardPage() {
  const controller = useTeacherAttendanceMarkingController();

  const tabs = useMemo(
    () => (controller.isAdminLike ? ADMIN_TABS : BASE_TABS),
    [controller.isAdminLike]
  );

  return (
    <PageLayout
      data-testid="page-teacher-attendance-marking"
      pageBackground
      maxWidth={controller.isAdminLike ? "lg" : false}
      header={
        <PageHeader
          links={[
            {
              title: controller.isAdminLike ? "Teacher Attendance" : "My Attendance",
              path: "/attendance/teacher-marking",
            },
          ]}
          homePath="/"
        />
      }
    >
      <Box>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            overflow: "hidden",
          }}
          data-testid="teacher-attendance-tabs-container"
        >
          <Tabs
            value={controller.activeTab}
            onChange={(_e, value: TeacherAttendanceTab) => controller.setActiveTab(value)}
            variant="fullWidth"
            data-testid="teacher-attendance-tabs"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": { fontWeight: 600, textTransform: "none" },
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                data-testid={tab.testId}
              />
            ))}
          </Tabs>

          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {controller.activeTab === "check-in-out" ? (
              <TeacherCheckInOutTab controller={controller} />
            ) : controller.activeTab === "mark-attendance" ? (
              <TeacherMarkAttendanceTab controller={controller} />
            ) : (
              <AdminAttendanceDetailsTab controller={controller} />
            )}
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={controller.snackbar.open}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => controller.setSnackbar({ ...controller.snackbar, open: false })}
        sx={{ zIndex: 9999 }}
      >
        <Alert
          onClose={() => controller.setSnackbar({ ...controller.snackbar, open: false })}
          severity={controller.snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: "16px" }}
          data-testid="teacher-attendance-snackbar"
        >
          {controller.snackbar.message}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}