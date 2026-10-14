import {
  Box,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
  alpha,
} from "@mui/material";

import { colorTokens } from "../../../../tokens/colors";

import {
  isScheduledNonWorkingDate,
  listSaturdaysInMonth,
} from "../workingDaysCalendar.utils";

type Props = {
  month: Date;
  nonWorkingDates: string[];
  saturdayIsWorkingDay: boolean;
  saving: boolean;
  onSetNonWorkingDates: (dates: string[]) => void;
};

export default function WorkingDaysSaturdayMonthPanel({
  month,
  nonWorkingDates,
  saturdayIsWorkingDay,
  saving,
  onSetNonWorkingDates,
}: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const saturdays = listSaturdaysInMonth(year, monthIndex);

  const setSaturdayOff = (iso: string, off: boolean) => {
    if (off) {
      if (!nonWorkingDates.includes(iso)) {
        onSetNonWorkingDates([...nonWorkingDates, iso]);
      }
      return;
    }
    onSetNonWorkingDates(nonWorkingDates.filter((d) => d !== iso));
  };

  if (!saturdayIsWorkingDay) {
    return (
      <Box sx={{ mt: 2 }} data-testid="saturday-month-panel">
        <Typography variant="body2" color="text.secondary">
          <strong>Saturday</strong> is unchecked above, so every Saturday is already off for all teachers.
          Turn Saturday on if some Saturdays should be working and only specific ones off per month.
        </Typography>
      </Box>
    );
  }

  if (saturdays.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }} data-testid="saturday-month-panel">
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Saturday offs — {monthLabel}
      </Typography>
      <Typography
        component="p"
        sx={{
          display: "block",
          mb: 1.5,
          px: 1.25,
          py: 1,
          borderRadius: 1.5,
          bgcolor: alpha(colorTokens.primary.main, 0.08),
          borderLeft: `3px solid ${colorTokens.primary.main}`,
          color: colorTokens.text.primary,
          fontSize: "0.8125rem",
          lineHeight: 1.55,
          fontWeight: 500,
        }}
      >
        Use Saturday switches for each month when some Saturdays stay working.
      </Typography>
      <Stack spacing={0.5}>
        {saturdays.map(({ nth, iso, label }) => {
          const isOff = isScheduledNonWorkingDate(iso, nonWorkingDates);
          return (
            <FormControlLabel
              key={iso}
              sx={{ ml: 0, alignItems: "center" }}
              control={
                <Switch
                  size="small"
                  checked={isOff}
                  disabled={saving}
                  onChange={(_, checked) => setSaturdayOff(iso, checked)}
                  inputProps={{ "data-testid": `switch-saturday-off-${nth}-${iso}` } as object}
                />
              }
              label={
                <Typography variant="body2" component="span">
                  Mark <strong>{label}</strong> as off
                </Typography>
              }
            />
          );
        })}
      </Stack>
    </Box>
  );
}
