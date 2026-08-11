import { useState } from "react";
import { Stack, TextField, Typography } from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import { SaveButton } from "../../../../components/semantic";
import type { AttendanceConfigurationController } from "../../../../hooks/useAttendanceConfigurationController";
import type { OfficeTiming } from "../attendanceConfiguration.types";
import ConfigSectionCard from "./ConfigSectionCard";

type Props = {
  controller: AttendanceConfigurationController;
};

export default function OfficeTimingSection({ controller }: Props) {
  const { state, setOfficeTiming } = controller;
  const [draft, setDraft] = useState<OfficeTiming>(state.officeTiming);

  const handleSave = () => setOfficeTiming(draft);
  const toPickerValue = (timeValue: string): Dayjs | null => {
    if (!timeValue) return null;
    const [hourRaw, minuteRaw] = timeValue.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return dayjs().hour(hour).minute(minute).second(0).millisecond(0);
  };
  const fromPickerValue = (next: Dayjs | null): string => {
    if (!next) return "";
    return next.format("HH:mm");
  };

  return (
    <ConfigSectionCard
      id="section-office-timing"
      title="Office Timing"
      description="Global office timing applies to all shifts. Early check-in and check-out are allowed."
      data-testid="section-office-timing"
    >
      <Stack spacing={2}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <TimePicker
            label="Office Start Time"
            ampm
            value={toPickerValue(draft.startTime)}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, startTime: fromPickerValue(next) }))
            }
            slotProps={{
              textField: {
                size: "small",
                inputProps: { "data-testid": "input-office-start-time" },
              },
            }}
          />
          <TimePicker
            label="Office End Time"
            ampm
            value={toPickerValue(draft.endTime)}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, endTime: fromPickerValue(next) }))
            }
            slotProps={{
              textField: {
                size: "small",
                inputProps: { "data-testid": "input-office-end-time" },
              },
            }}
          />
        </LocalizationProvider>
        <TextField
          label="Minimum Working Hours"
          type="number"
          size="small"
          value={draft.minimumWorkingHours}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, minimumWorkingHours: Number(e.target.value) }))
          }
          inputProps={{ "data-testid": "input-minimum-working-hours", min: 0, step: 0.5 }}
        />
        <Typography variant="caption" color="text.secondary">
          Early check-in is allowed and considered valid. Minimum working hours are required.
        </Typography>
        <SaveButton onClick={handleSave} data-testid="btn-save-office-timing">
          Save Office Timing
        </SaveButton>
      </Stack>
    </ConfigSectionCard>
  );
}
