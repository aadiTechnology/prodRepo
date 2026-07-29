import { Box, Stack, Typography, alpha } from "@mui/material";
import {
  Groups as GroupsIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  Schedule as LateIcon,
  EventNote as LeaveIcon,
} from "@mui/icons-material";

import { colorTokens } from "../../../../tokens/colors";
import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
import TeacherSectionCard from "./TeacherSectionCard";

const SUMMARY_CARDS = [
  {
    key: "total",
    label: "Total Teachers",
    field: "totalTeachers" as const,
    icon: GroupsIcon,
    color: colorTokens.preschool.turquoise.main,
    highlight: false,
  },
  {
    key: "present",
    label: "Present",
    field: "present" as const,
    icon: PresentIcon,
    color: colorTokens.preschool.mint.main,
    highlight: false,
  },
  {
    key: "absent",
    label: "Absent",
    field: "absent" as const,
    icon: AbsentIcon,
    color: colorTokens.preschool.coral.main,
    highlight: true,
  },
  {
    key: "late",
    label: "Late",
    field: "late" as const,
    icon: LateIcon,
    color: colorTokens.preschool.peach.main,
    highlight: true,
  },
  {
    key: "leave",
    label: "Leave",
    field: "leave" as const,
    icon: LeaveIcon,
    color: colorTokens.preschool.lavender.main,
    highlight: false,
  },
];

interface AttendanceSummarySectionProps {
  controller: TeacherAttendanceMarkingController;
}

export default function AttendanceSummarySection({ controller }: AttendanceSummarySectionProps) {
  const { todaySummary, missedAttendanceAlerts, isAdminLike } = controller;

  return (
    <TeacherSectionCard
      id="attendance-summary"
      title="Attendance Summary"
      description="Today's teacher attendance overview"
      data-testid="section-attendance-summary"
    >
      <Stack spacing={2}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              lg: "repeat(5, 1fr)",
            },
            gap: 2,
          }}
        >
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon;
            const value = todaySummary[card.field];
            const isHighlighted = card.highlight && value > 0;

            return (
              <Box
                key={card.key}
                data-testid={`summary-card-${card.key}`}
                sx={{
                  borderRadius: 3,
                  p: 2,
                  bgcolor: alpha(card.color, isHighlighted ? 0.18 : 0.08),
                  border: `1px solid ${alpha(card.color, isHighlighted ? 0.45 : 0.2)}`,
                  boxShadow: isHighlighted
                    ? `0 4px 14px ${alpha(card.color, 0.2)}`
                    : "none",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Icon sx={{ fontSize: 20, color: card.color }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: colorTokens.text.secondary }}>
                    {card.label}
                  </Typography>
                </Stack>
                <Typography
                  variant="h5"
                  data-testid={`summary-value-${card.key}`}
                  sx={{ fontWeight: 800, color: card.color }}
                >
                  {value}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {isAdminLike && missedAttendanceAlerts.length > 0 ? (
          <Box
            data-testid="missed-attendance-alerts"
            sx={{
              borderRadius: 2,
              p: 2,
              bgcolor: alpha(colorTokens.preschool.coral.main, 0.08),
              border: `1px solid ${alpha(colorTokens.preschool.coral.main, 0.25)}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Missed Attendance Alerts
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              School Admin notified. SMS sent automatically for missed attendance.
            </Typography>
            <Stack spacing={0.5}>
              {missedAttendanceAlerts.map((alert) => (
                <Typography
                  key={alert.teacherId}
                  variant="body2"
                  data-testid={`missed-alert-${alert.teacherId}`}
                >
                  {alert.teacherName} — no attendance marked for {alert.date}
                </Typography>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </TeacherSectionCard>
  );
}
