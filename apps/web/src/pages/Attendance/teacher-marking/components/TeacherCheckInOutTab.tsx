import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";

import { colorTokens } from "../../../../tokens/colors";
import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";

interface TeacherCheckInOutTabProps {
  controller: TeacherAttendanceMarkingController;
}

export default function TeacherCheckInOutTab({ controller }: TeacherCheckInOutTabProps) {
  const {
    displayCheckInTime,
    displayCheckOutTime,
    showCheckInButton,
    showCheckOutButton,
    buttonsDisabled,
    checkInOutErrors,
    handleCheckIn,
    handleCheckOut,
  } = controller;

  return (
    <Box data-testid="tab-check-in-out-content">
      <Stack spacing={2} alignItems="center">
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          justifyContent="center"
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            label="Check In"
            value={displayCheckInTime}
            InputProps={{ readOnly: true }}
            size="small"
            sx={{ width: { xs: 120, sm: 140 } }}
            data-testid="field-check-in-time"
          />
          {showCheckInButton ? (
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={handleCheckIn}
              disabled={buttonsDisabled}
              data-testid="btn-check-in"
              sx={{
                whiteSpace: "nowrap",
                bgcolor: colorTokens.preschool.mint.main,
                "&:hover": { bgcolor: colorTokens.preschool.mint.dark },
              }}
            >
              Check In
            </Button>
          ) : null}

          <TextField
            label="Check Out"
            value={displayCheckOutTime}
            InputProps={{ readOnly: true }}
            size="small"
            sx={{ width: { xs: 120, sm: 140 } }}
            data-testid="field-check-out-time"
          />
          {showCheckOutButton ? (
            <Button
              variant="contained"
              startIcon={<LogoutIcon />}
              onClick={handleCheckOut}
              disabled={buttonsDisabled}
              data-testid="btn-check-out"
              sx={{
                whiteSpace: "nowrap",
                bgcolor: colorTokens.preschool.lavender.main,
                "&:hover": { bgcolor: colorTokens.preschool.lavender.dark },
              }}
            >
              Check Out
            </Button>
          ) : null}
        </Stack>

        {checkInOutErrors.length > 0 ? (
          <Stack spacing={0.5} data-testid="check-in-out-errors" sx={{ width: "100%", maxWidth: 480 }}>
            {checkInOutErrors.map((error) => (
              <Alert key={error} severity="error">
                {error}
              </Alert>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
