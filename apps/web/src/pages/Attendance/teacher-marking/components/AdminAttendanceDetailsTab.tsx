import { useEffect, useMemo, useState } from "react";
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
  TablePagination,
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
import { SaveButton, CancelButton } from "../../../../components/semantic";
interface AdminAttendanceDetailsTabProps {
  controller: TeacherAttendanceMarkingController;
}

export default function AdminAttendanceDetailsTab({
  controller,
}: AdminAttendanceDetailsTabProps) {
  const DEFAULT_ROWS_PER_PAGE = 20;
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  useEffect(() => {
    setPage(0);
  }, [detailsFilters.teacherId, detailsFilters.approvalStatus]);

  const pagedRecords = useMemo(
    () => filteredDetailsRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredDetailsRecords, page, rowsPerPage]
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredDetailsRecords.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredDetailsRecords.length, page, rowsPerPage]);

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
          data={pagedRecords}
          emptyMessage={
            <Typography variant="body2" color="text.secondary">
              No attendance records match the selected filters.
            </Typography>
          }
          emptyTestId="attendance-details-empty-state"
          data-testid="table-attendance-details"
          rowTestId={(row) => `attendance-details-row-${row.id}`}
        />
        {filteredDetailsRecords.length > DEFAULT_ROWS_PER_PAGE ? (
          <TablePagination
            component="div"
            count={filteredDetailsRecords.length}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              const next = Number(event.target.value) || DEFAULT_ROWS_PER_PAGE;
              setRowsPerPage(next);
              setPage(0);
            }}
            rowsPerPageOptions={[20, 50, 100]}
            data-testid="attendance-details-pagination"
          />
        ) : null}
      </Stack>

      <Dialog
        open={rejectTargetId !== null}
        onClose={closeRejectDialog}
        maxWidth="xs"
        data-testid="dialog-reject-reason"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              width: 500,
              height: "auto",
            },
          },
        }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
            px: 1.3,
            py: 0.7,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <IconButton
            aria-label="close"
            onClick={closeRejectDialog}
            sx={{ color: "white", bgcolor: "transparent", p: 0.25 }}
          >
            <CancelIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <DialogContent
          dividers={false}
          sx={{
            py: 1,
            px: 1.3,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <Stack spacing={0.7}>
            <Box sx={{ fontWeight: 700, color: "#000", fontSize: "0.9rem" }}>
              Reason for Reject
            </Box>
            <TextField
              autoFocus
              label="Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              multiline
              minRows={3}
              maxRows={3}
              fullWidth
              size="small"
              inputProps={{ "data-testid": "input-reject-reason" }}
              data-testid="field-reject-reason"
              sx={{
                "& .MuiOutlinedInput-root": { fontSize: "0.8rem" },
                "& .MuiFormLabel-root": { fontSize: "0.8rem" },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 1.3, py: 0.8, gap: 1, flexShrink: 0 }}>
          <CancelButton onClick={closeRejectDialog} data-testid="btn-reject-cancel">
            Cancel
          </CancelButton>
          <SaveButton
            onClick={confirmReject}
            disabled={rejectReason.trim().length === 0}
            data-testid="btn-reject-save"
          >
            Save
          </SaveButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
