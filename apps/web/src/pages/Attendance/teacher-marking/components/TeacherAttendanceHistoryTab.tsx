import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

import { colorTokens } from "../../../../tokens/colors";
import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
import type { TeacherAttendanceRecord } from "../teacherAttendanceMarking.types";
import { MAX_REMARKS_LENGTH } from "../teacherAttendanceMarking.types";

interface TeacherAttendanceHistoryTabProps {
  controller: TeacherAttendanceMarkingController;
}

function HistoryRow({
  record,
  controller,
}: {
  record: TeacherAttendanceRecord;
  controller: TeacherAttendanceMarkingController;
}) {
  const {
    editingHistoryId,
    historyDraft,
    historyErrors,
    startHistoryEdit,
    cancelHistoryEdit,
    updateHistoryDraft,
    saveHistoryEdit,
  } = controller;

  const isEditing = editingHistoryId === record.id;

  if (isEditing && historyDraft) {
    return (
      <TableRow data-testid={`history-edit-row-${record.id}`}>
        <TableCell>
          <TextField
            type="date"
            value={historyDraft.date}
            onChange={(e) => updateHistoryDraft("date", e.target.value)}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ "data-testid": `input-history-date-${record.id}` }}
            data-testid={`field-history-date-${record.id}`}
          />
        </TableCell>
        <TableCell>
          <TextField
            type="time"
            value={historyDraft.checkInTime}
            onChange={(e) => updateHistoryDraft("checkInTime", e.target.value)}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ "data-testid": `input-history-check-in-${record.id}` }}
            data-testid={`field-history-check-in-${record.id}`}
          />
        </TableCell>
        <TableCell>
          <TextField
            type="time"
            value={historyDraft.checkOutTime}
            onChange={(e) => updateHistoryDraft("checkOutTime", e.target.value)}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ "data-testid": `input-history-check-out-${record.id}` }}
            data-testid={`field-history-check-out-${record.id}`}
          />
        </TableCell>
        <TableCell>
          <TextField
            value={historyDraft.remarks}
            onChange={(e) => updateHistoryDraft("remarks", e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={1}
            inputProps={{
              maxLength: MAX_REMARKS_LENGTH,
              "data-testid": `input-history-remarks-${record.id}`,
            }}
            data-testid={`field-history-remarks-${record.id}`}
          />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              onClick={saveHistoryEdit}
              data-testid={`btn-history-save-${record.id}`}
            >
              Save
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={cancelHistoryEdit}
              data-testid={`btn-history-cancel-${record.id}`}
            >
              Cancel
            </Button>
          </Stack>
          {historyErrors.length > 0 ? (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {historyErrors.map((error) => (
                <Alert key={error} severity="error" sx={{ py: 0 }}>
                  {error}
                </Alert>
              ))}
            </Stack>
          ) : null}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow
      hover
      data-testid={`history-row-${record.id}`}
      sx={{ "&:last-child td": { borderBottom: 0 } }}
    >
      <TableCell data-testid={`history-date-${record.id}`}>{record.date}</TableCell>
      <TableCell data-testid={`history-check-in-${record.id}`}>
        {record.checkInTime ?? "—"}
      </TableCell>
      <TableCell data-testid={`history-check-out-${record.id}`}>
        {record.checkOutTime ?? "—"}
      </TableCell>
      <TableCell data-testid={`history-remarks-${record.id}`}>
        {record.remarks || "—"}
      </TableCell>
      <TableCell>
        <IconButton
          size="small"
          aria-label="Edit attendance record"
          onClick={() => startHistoryEdit(record)}
          disabled={editingHistoryId != null && editingHistoryId !== record.id}
          data-testid={`btn-history-edit-${record.id}`}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

export default function TeacherAttendanceHistoryTab({
  controller,
}: TeacherAttendanceHistoryTabProps) {
  const { teacherHistory } = controller;

  return (
    <Box data-testid="tab-attendance-history-content">
      <TableContainer
        sx={{
          borderRadius: 2,
          border: `1px solid ${colorTokens.border.default}`,
        }}
        data-testid="table-teacher-attendance-history"
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Attendance Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Check In Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Check Out Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teacherHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" data-testid="history-empty-state">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No attendance history found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              teacherHistory.map((record) => (
                <HistoryRow key={record.id} record={record} controller={controller} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
