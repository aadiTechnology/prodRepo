import { Alert, Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";

import { HOLIDAY_WARNING_MESSAGE } from "../attendanceConfiguration.mock";
import type { WorkingDayKey } from "../attendanceConfiguration.types";
import type { AttendanceConfigurationController } from "../../../../hooks/useAttendanceConfigurationController";
import ConfigSectionCard from "./ConfigSectionCard";

const WORKING_DAY_OPTIONS: { key: WorkingDayKey; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

type Props = {
  controller: AttendanceConfigurationController;
};

export default function WorkingDaysSection({ controller }: Props) {
  const { state, setWorkingDay } = controller;

  return (
    <ConfigSectionCard
      id="section-working-days"
      title="Working Days"
      description="Same working days apply to all teachers. Public holidays are configured separately."
      data-testid="section-working-days"
    >
      <Stack spacing={2}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Working Days
        </Typography>
        <Stack>
          {WORKING_DAY_OPTIONS.map(({ key, label }) => (
            <FormControlLabel
              key={key}
              control={
                <Checkbox
                  checked={state.workingDays[key]}
                  onChange={(e) => setWorkingDay(key, e.target.checked)}
                  inputProps={{ "data-testid": `checkbox-working-day-${key}` } as object}
                />
              }
              label={label}
            />
          ))}
        </Stack>
        <Alert severity="info" data-testid="alert-holiday-warning-info">
          If attendance is marked on a holiday, the system shows: &quot;{HOLIDAY_WARNING_MESSAGE}&quot;
          but still allows submission.
        </Alert>
      </Stack>
    </ConfigSectionCard>
  );
}
