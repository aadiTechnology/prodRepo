import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ViewListIcon from "@mui/icons-material/ViewList";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import { EntityTableSection } from "../../../../components/reusable";
import { AppCard } from "../../../../components/primitives";
import { colorTokens } from "../../../../tokens/colors";
import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
import type { ApprovalStatus, TeacherAttendanceRecord } from "../teacherAttendanceMarking.types";
import { APPROVAL_STATUS_OPTIONS } from "../teacherAttendanceMarking.types";
import { SaveButton, CancelButton } from "../../../../components/semantic";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../../../../utils/listPagination";

interface AdminAttendanceDetailsTabProps {
  controller: TeacherAttendanceMarkingController;
}

type ViewMode = "list" | "approval";

const filterSelectSx = {
  minWidth: { xs: "100%", sm: 180 },
  "& .MuiOutlinedInput-root": {
    borderRadius: "15px",
    fontSize: "0.85rem",
    fontWeight: 600,
    bgcolor: "#ffffff",
    "& fieldset": { borderColor: colorTokens.border.subtle },
    "&:hover fieldset": { borderColor: alpha(colorTokens.preschool.turquoise.main, 0.4) },
    "&.Mui-focused fieldset": { borderColor: colorTokens.preschool.turquoise.main },
  },
};

const filterStackSx = {
  width: "100%",
  px: { xs: 2, sm: 2.5 },
  py: 2.25,
  bgcolor: alpha(colorTokens.primary.main, 0.015),
  gap: { xs: 2.5, sm: 2 },
  rowGap: { xs: 2.5, sm: 2.25 },
  columnGap: { xs: 2.5, sm: 1.5 },
};

const filterControlSx = {
  minWidth: { xs: "100%", sm: 180 },
  width: { xs: "100%", sm: "auto" },
};

const dateFieldSx = {
  minWidth: { xs: "100%", sm: 160 },
  width: { xs: "100%", sm: "auto" },
  "& .MuiInputLabel-root": {
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: "15px",
    fontSize: "0.85rem",
    fontWeight: 600,
    bgcolor: "#ffffff",
    "& fieldset": { borderColor: colorTokens.border.subtle },
    "&:hover fieldset": { borderColor: alpha(colorTokens.preschool.turquoise.main, 0.4) },
    "&.Mui-focused fieldset": { borderColor: colorTokens.preschool.turquoise.main },
  },
};

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

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [listDate, setListDate] = useState<string>("");

  const activeTeachers = markableTeachers;
  const teacherName = (teacherId: string) =>
    markableTeachers.find((t) => t.id === teacherId)?.name ?? "—";

  const toggleView = () => {
    setViewMode((prev) => (prev === "list" ? "approval" : "list"));
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [detailsFilters.teacherId, detailsFilters.approvalStatus, viewMode, listDate]);

  const displayRecords = useMemo(() => {
    let items = filteredDetailsRecords;
    if (viewMode === "list" && listDate) {
      items = items.filter((r) => r.date === listDate);
    }
    return items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredDetailsRecords, viewMode, listDate, page, rowsPerPage]);

  useEffect(() => {
    const source = viewMode === "list" && listDate
      ? filteredDetailsRecords.filter((r) => r.date === listDate)
      : filteredDetailsRecords;
    const maxPage = Math.max(0, Math.ceil(source.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredDetailsRecords.length, page, rowsPerPage, viewMode, listDate]);

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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const listColumns = [
    {
      id: "date",
      label: "DATE",
      width: "15%",
      render: (row: TeacherAttendanceRecord) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.primary }}>
          {formatDate(row.date)}
        </Typography>
      ),
    },
    {
      id: "teacherName",
      label: "TEACHER NAME",
      width: "35%",
      render: (row: TeacherAttendanceRecord) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.primary }}>
          {teacherName(row.teacherId)}
        </Typography>
      ),
    },
    {
      id: "checkIn",
      label: "CHECK IN",
      width: "25%",
      render: (row: TeacherAttendanceRecord) => (
        <Typography variant="body2">{row.checkInTime ?? "—"}</Typography>
      ),
    },
    {
      id: "checkOut",
      label: "CHECK OUT",
      width: "25%",
      render: (row: TeacherAttendanceRecord) => (
        <Typography variant="body2">{row.checkOutTime ?? "—"}</Typography>
      ),
    },
  ];

  const approvalColumns = [
    {
      id: "date",
      label: "DATE",
      width: "12%",
      render: (row: TeacherAttendanceRecord) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.primary }}>
          {formatDate(row.date)}
        </Typography>
      ),
    },
    {
      id: "teacherName",
      label: "TEACHER NAME",
      width: "22%",
      render: (row: TeacherAttendanceRecord) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: colorTokens.text.primary }}>
          {teacherName(row.teacherId)}
        </Typography>
      ),
    },
    {
      id: "checkIn",
      label: "CHECK IN",
      width: "15%",
      render: (row: TeacherAttendanceRecord) => (
        <Typography variant="body2">{row.checkInTime ?? "—"}</Typography>
      ),
    },
    {
      id: "checkOut",
      label: "CHECK OUT",
      width: "15%",
      render: (row: TeacherAttendanceRecord) => (
        <Typography variant="body2">{row.checkOutTime ?? "—"}</Typography>
      ),
    },
    {
      id: "remarks",
      label: "REMARKS",
      width: "20%",
      render: (row: TeacherAttendanceRecord) => (
        <Typography variant="body2" color="text.secondary">{row.remarks || "—"}</Typography>
      ),
    },
    {
      id: "approvalStatus",
      label: "APPROVAL STATUS",
      width: "18%",
      align: "center" as const,
      headerAlign: "center" as const,
      render: (row: TeacherAttendanceRecord) => {
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
        );
      },
    },
  ];

  const currentColumns = viewMode === "list" ? listColumns : approvalColumns;

const tableTotalRows = useMemo(() => {
  if (viewMode === "list" && listDate) {
    return filteredDetailsRecords.filter((r) => r.date === listDate).length;
  }
  return filteredDetailsRecords.length;
}, [filteredDetailsRecords, viewMode, listDate]);

const tableData = useMemo(() => {
  let items = filteredDetailsRecords;
  if (viewMode === "list" && listDate) {
    items = items.filter((r) => r.date === listDate);
  }
  return items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}, [filteredDetailsRecords, viewMode, listDate, page, rowsPerPage]);

useEffect(() => {
  const maxPage = Math.max(0, Math.ceil(tableTotalRows / rowsPerPage) - 1);
  if (page > maxPage) setPage(maxPage);
}, [tableTotalRows, page, rowsPerPage]);

  return (
    <Box data-testid="tab-attendance-details-content">
      <Stack spacing={2}>
        {/* Toggle + Filters Row */}
        <AppCard
          paddingSize="none"
          sx={{
            borderRadius: "14px",
            border: `1px solid ${colorTokens.border.default}`,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            flexWrap="wrap"
            sx={filterStackSx}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              flexWrap="wrap"
            >
              <FormControl size="small" sx={filterControlSx}>
                <InputLabel shrink>Teacher Name</InputLabel>
                <Select
                  label="Teacher Name"
                  value={detailsFilters.teacherId}
                  displayEmpty
                  notched
                  onChange={(e) => updateDetailsFilter("teacherId", e.target.value)}
                  sx={filterSelectSx}
                >
                  <MenuItem value="">
                    <Typography variant="body2" color="text.secondary">All Teachers</Typography>
                  </MenuItem>
                  {activeTeachers.map((teacher) => (
                    <MenuItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {viewMode === "list" && (
                <TextField
                  label="Date"
                  type="date"
                  size="small"
                  value={listDate}
                  InputLabelProps={{ shrink: true }}
                  onChange={(e) => setListDate(e.target.value)}
                  sx={dateFieldSx}
                  data-testid="filter-list-date"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <CalendarTodayIcon sx={{ fontSize: 18, color: colorTokens.text.secondary }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              {viewMode === "approval" && (
                <FormControl size="small" sx={filterControlSx}>
                  <InputLabel shrink>Approval Status</InputLabel>
                  <Select
                    label="Approval Status"
                    value={detailsFilters.approvalStatus}
                    displayEmpty
                    notched
                    onChange={(e) =>
                      updateDetailsFilter("approvalStatus", e.target.value as ApprovalStatus | "")
                    }
                    sx={filterSelectSx}
                  >
                    <MenuItem value="">
                      <Typography variant="body2" color="text.secondary">All Statuses</Typography>
                    </MenuItem>
                    {APPROVAL_STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>

            <Tooltip title={viewMode === "list" ? "Switch to Approval View" : "Switch to List View"}>
              <span>
                <IconButton
                  onClick={toggleView}
                  size="small"
                  data-testid="btn-toggle-view"
                  sx={{
                    bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.1),
                    color: colorTokens.preschool.turquoise.main,
                    width: 40,
                    height: 40,
                    "&:hover": {
                      bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.2),
                    },
                  }}
                >
                  {viewMode === "list" ? (
                    <HowToVoteIcon fontSize="small" />
                  ) : (
                    <ViewListIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </AppCard>

        {/* Table */}
        <AppCard
          paddingSize="none"
          sx={{
            borderRadius: "14px",
            border: `1px solid ${colorTokens.border.default}`,
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
          }}
        >
          <EntityTableSection<TeacherAttendanceRecord>
            label={viewMode === "list" ? "Attendance List" : "Attendance Approval"}
            loading={false}
            totalRows={tableTotalRows}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(v) => {
              setRowsPerPage(v);
              setPage(0);
            }}
            rowsPerPageOptions={[20, 50, 100]}
            columns={currentColumns}
            data={tableData}
            emptyMessage="No attendance records match the selected filters."
            stickyHeader
            data-testid={viewMode === "list" ? "table-attendance-list" : "table-attendance-details"}
            rowTestId={(row) => `${viewMode === "list" ? "attendance-list" : "attendance-details"}-row-${row.id}`}
            emptyTestId={viewMode === "list" ? "attendance-list-empty-state" : "attendance-details-empty-state"}
          />
        </AppCard>
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