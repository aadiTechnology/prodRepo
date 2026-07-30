import { useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";

import { LabeledSwitch, SaveButton } from "../../../../components/semantic";
import type { AttendanceConfigurationController } from "../../../../hooks/useAttendanceConfigurationController";
import type { GraceTimeConfig } from "../attendanceConfiguration.types";
import ConfigSectionCard from "./ConfigSectionCard";

type Props = {
  controller: AttendanceConfigurationController;
};

export default function GraceTimeSection({ controller }: Props) {
  const { state, setGraceTime } = controller;
  const [draft, setDraft] = useState<GraceTimeConfig>(state.graceTime);

  const statusOptions = state.statuses
    .filter((s) => s.active)
    .map((s) => s.name);

  const handleSave = () => setGraceTime(draft);

  return (
    <ConfigSectionCard
      id="section-grace-time"
      title="Grace Time"
      description="Same grace time applies to all shifts."
      data-testid="section-grace-time"
    >
      <Stack spacing={2}>
        <LabeledSwitch
          label="Enable Grace Time"
          checked={draft.enabled}
          onChange={(_, checked) => setDraft((prev) => ({ ...prev, enabled: checked }))}
          inputTestId="toggle-enable-grace-time"
        />
        <TextField
          label="Grace Minutes"
          type="number"
          size="small"
          value={draft.graceMinutes}
          disabled={!draft.enabled}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, graceMinutes: Number(e.target.value) }))
          }
          inputProps={{ "data-testid": "input-grace-minutes", min: 0 }}
        />
        <FormControl fullWidth size="small" disabled={!draft.enabled}>
          <InputLabel id="label-status-after-grace">Attendance Status After Grace</InputLabel>
          <Select
            labelId="label-status-after-grace"
            label="Attendance Status After Grace"
            value={draft.statusAfterGrace}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, statusAfterGrace: e.target.value }))
            }
            inputProps={{ "data-testid": "select-status-after-grace" }}
          >
            {statusOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <SaveButton onClick={handleSave} data-testid="btn-save-grace-time">
          Save Grace Time
        </SaveButton>
      </Stack>
    </ConfigSectionCard>
  );
}
