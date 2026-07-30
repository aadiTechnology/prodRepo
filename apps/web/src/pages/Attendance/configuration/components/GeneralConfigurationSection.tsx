import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
  Divider,
} from "@mui/material";

import { LabeledSwitch } from "../../../../components/semantic";
import type { AttendanceConfigurationController } from "../../../../hooks/useAttendanceConfigurationController";
import ConfigSectionCard from "./ConfigSectionCard";

type Props = {
  controller: AttendanceConfigurationController;
};

export default function GeneralConfigurationSection({ controller }: Props) {
  const { state, academicYears, setAcademicYear, setAllowEditingAfterMarked, setAttendanceMarkedBy } =
    controller;
  const { general } = state;

  return (
    <Stack spacing={2}>
      <ConfigSectionCard
        id="section-general-configuration"
        title="General Configuration"
        description="Core attendance settings for the selected academic year."
        data-testid="section-general-configuration"
      >
        <Stack spacing={2.5}>
          <FormControl fullWidth size="small">
            <InputLabel id="label-academic-year">Academic Year</InputLabel>
            <Select
              labelId="label-academic-year"
              label="Academic Year"
              value={general.academicYearId}
              onChange={(e) => setAcademicYear(e.target.value)}
              inputProps={{ "data-testid": "select-academic-year" }}
            >
              {academicYears.map((year) => (
                <MenuItem key={year.id} value={year.id} data-testid={`option-academic-year-${year.id}`}>
                  {year.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Configuration Scope
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              data-testid="text-configuration-scope"
            >
              Entire School
            </Typography>
          </Box>

          <LabeledSwitch
            label="Allow Editing After Attendance Marked"
            checked={general.allowEditingAfterMarked}
            onChange={(_, checked) => setAllowEditingAfterMarked(checked)}
            inputTestId="toggle-allow-editing-after-marked"
          />

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              Apply Configuration Changes To
            </Typography>
            <RadioGroup value={general.applyChangesTo} data-testid="radio-apply-changes-to">
              <FormControlLabel
                value="future-only"
                control={<Radio size="small" inputProps={{ "data-testid": "radio-future-records-only" } as object} />}
                label="Future Records Only"
              />
            </RadioGroup>
          </Box>
        </Stack>
      </ConfigSectionCard>

      <ConfigSectionCard
        id="section-attendance-mode"
        title="Attendance Mode"
        description="Who can mark and modify attendance records."
        data-testid="section-attendance-mode"
      >
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Attendance Marked By
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={general.attendanceMarkedBy.teacher}
                onChange={(e) =>
                  setAttendanceMarkedBy({
                    ...general.attendanceMarkedBy,
                    teacher: e.target.checked,
                  })
                }
                inputProps={{ "data-testid": "checkbox-marked-by-teacher" } as object}
              />
            }
            label="Teacher"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={general.attendanceMarkedBy.schoolAdmin}
                onChange={(e) =>
                  setAttendanceMarkedBy({
                    ...general.attendanceMarkedBy,
                    schoolAdmin: e.target.checked,
                  })
                }
                inputProps={{ "data-testid": "checkbox-marked-by-school-admin" } as object}
              />
            }
            label="School Admin"
          />
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">
            School Admin can modify teacher attendance. Modification reason is not mandatory.
          </Typography>
        </Stack>
      </ConfigSectionCard>
    </Stack>
  );
}
