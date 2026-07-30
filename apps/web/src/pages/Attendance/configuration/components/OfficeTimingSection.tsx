import { useState } from "react";
import { Stack, TextField, Typography } from "@mui/material";

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

  return (
    <ConfigSectionCard
      id="section-office-timing"
      title="Office Timing"
      description="Global office timing applies to all shifts. Early check-in and check-out are allowed."
      data-testid="section-office-timing"
    >
      <Stack spacing={2}>
        <TextField
          label="Office Start Time"
          type="time"
          size="small"
          value={draft.startTime}
          onChange={(e) => setDraft((prev) => ({ ...prev, startTime: e.target.value }))}
          inputProps={{ "data-testid": "input-office-start-time" }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Office End Time"
          type="time"
          size="small"
          value={draft.endTime}
          onChange={(e) => setDraft((prev) => ({ ...prev, endTime: e.target.value }))}
          inputProps={{ "data-testid": "input-office-end-time" }}
          InputLabelProps={{ shrink: true }}
        />
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
