import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

import { DataTable, type DataTableColumn } from "../../../../components/reusable";
import { colorTokens } from "../../../../tokens/colors";
import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
import type { ApprovalStatus, TeacherAttendanceRecord } from "../teacherAttendanceMarking.types";
import { APPROVAL_STATUS_OPTIONS } from "../teacherAttendanceMarking.types";
interface AdminAttendanceDetailsTabProps {
  controller: TeacherAttendanceMarkingController;
}

export default function AdminAttendanceDetailsTab({
  controller,
}: AdminAttendanceDetailsTabProps) {
  const {
    filteredDetailsRecords,
    detailsFilters,
    updateDetailsFilter,
    updateApprovalStatus,
    markableTeachers,
  } = controller;

  const activeTeachers = markableTeachers;
  const teacherName = (teacherId: string) =>
    markableTeachers.find((t) => t.id === teacherId)?.name ?? "—";

  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const openRejectDialog = (recordId: string) => {
    setRejectTargetId(recordId);
    setRejectReason("");
  };

  const closeRejectDialog = () => {
    setRejectTargetId(null);
    setRejectReason("");
  };

  const confirmReject = () => {
    if (!rejectTargetId) return;
    updateApprovalStatus(rejectTargetId, "Rejected", rejectReason.trim());
    closeRejectDialog();
  };

  const columns: DataTableColumn<TeacherAttendanceRecord>[] = [
    {
      id: "date",
      label: "Date",
      field: "date",
    },
    {
      id: "teacherName",
      label: "Teacher Name",
      render: (row) => teacherName(row.teacherId),
    },
    {
      id: "checkIn",
      label: "Check In Time",
      render: (row) => row.checkInTime ?? "—",
    },
    {
      id: "checkOut",
      label: "Check Out Time",
      render: (row) => row.checkOutTime ?? "—",
    },
    {
      id: "remarks",
      label: "Remarks",
      render: (row) => row.remarks || "—",
    },
    {
      id: "approvalStatus",
      label: "Approval Status",
      align: "center",
      headerAlign: "center",
      render: (row) => {
        const isActionBlocked = !row.isSubmitted;
        return (
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Tooltip
            title={
              isActionBlocked
                ? "Complete both check-in and check-out before approval"
                : "Approve"
            }
          >
            <span>
              <IconButton
                size="small"
                disabled={row.approvalStatus === "Approved" || isActionBlocked}
                onClick={(e) => {
                  e.stopPropagation();
                  updateApprovalStatus(row.id, "Approved");
                }}
                data-testid={`btn-approval-Approved-${row.id}`}
                sx={{ color: colorTokens.preschool.mint.main }}
              >
                <CheckCircleIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip
            title={
              isActionBlocked
                ? "Complete both check-in and check-out before rejection"
                : "Reject"
            }
          >
            <span>
              <IconButton
                size="small"
                disabled={row.approvalStatus === "Rejected" || isActionBlocked}
                onClick={(e) => {
                  e.stopPropagation();
                  openRejectDialog(row.id);
                }}
                data-testid={`btn-approval-Rejected-${row.id}`}
                sx={{ color: colorTokens.preschool.coral.main }}
              >
                <CancelIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )},
    },
  ];

  return (
    <Box data-testid="tab-attendance-details-content">
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          data-testid="attendance-details-filters"
        >
          <TextField
            select
            label="Teacher Name"
            value={detailsFilters.teacherId}
            onChange={(e) => updateDetailsFilter("teacherId", e.target.value)}
            size="small"
            sx={{ minWidth: { xs: "100%", sm: 220 } }}
            data-testid="filter-details-teacher"
          >
            <MenuItem value="" data-testid="filter-details-teacher-all">
              All Teachers
            </MenuItem>
            {activeTeachers.map((teacher) => (
              <MenuItem
                key={teacher.id}
                value={teacher.id}
                data-testid={`filter-details-teacher-${teacher.id}`}
              >
                {teacher.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Approval Status"
            value={detailsFilters.approvalStatus}
            onChange={(e) =>
              updateDetailsFilter("approvalStatus", e.target.value as ApprovalStatus | "")
            }
            size="small"
            sx={{ minWidth: { xs: "100%", sm: 220 } }}
            data-testid="filter-details-approval-status"
          >
            <MenuItem value="" data-testid="filter-details-approval-all">
              All Statuses
            </MenuItem>
            {APPROVAL_STATUS_OPTIONS.map((status) => (
              <MenuItem
                key={status}
                value={status}
                data-testid={`filter-details-approval-${status}`}
              >
                {status}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <DataTable<TeacherAttendanceRecord>
          columns={columns}
          data={filteredDetailsRecords}
          emptyMessage={
            <Typography variant="body2" color="text.secondary">
              No attendance records match the selected filters.
            </Typography>
          }
          emptyTestId="attendance-details-empty-state"
          data-testid="table-attendance-details"
          rowTestId={(row) => `attendance-details-row-${row.id}`}
        />
      </Stack>

      <Dialog
        open={rejectTargetId !== null}
        onClose={closeRejectDialog}
        fullWidth
        maxWidth="xs"
        data-testid="dialog-reject-reason"
      >
        <DialogTitle>Reason for Reject</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Reason for Reject"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            margin="dense"
            inputProps={{ "data-testid": "input-reject-reason" }}
            data-testid="field-reject-reason"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRejectDialog} data-testid="btn-reject-cancel">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmReject}
            disabled={rejectReason.trim().length === 0}
            data-testid="btn-reject-save"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
