import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Badge,
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
import ConfirmDialog from "../../../../components/semantic/ConfirmDialog";
import { DEFAULT_LIST_ROWS_PER_PAGE } from "../../../../utils/listPagination";
import { getCurrentMonthStartIso } from "../teacherAttendanceMarking.utils";

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
  "& input[type='date']::-webkit-calendar-picker-indicator": {
    display: "none",
    WebkitAppearance: "none",
  },
};

export default function AdminAttendanceDetailsTab({
  controller,
}: AdminAttendanceDetailsTabProps) {
  const {
    filteredDetailsRecords,
    attendanceListGridRecords,
    pendingApprovalCount,
    detailsFilters,
    updateDetailsFilter,
    updateApprovalStatus,
    markableTeachers,
    today,
  } = controller;

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_LIST_ROWS_PER_PAGE);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const activeTeachers = markableTeachers;
  const teacherName = (teacherId: string) =>
    markableTeachers.find((t) => t.id === teacherId)?.name ?? "—";

  useEffect(() => {
    setPage(0);
  }, [
    detailsFilters.teacherId,
    detailsFilters.approvalStatus,
    detailsFilters.fromDate,
    detailsFilters.toDate,
    viewMode,
  ]);

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

  const formatTimeDisplay = (time: string | null): string => {
    if (!time) return "—";
    const [hour, minute] = time.split(":");
    const h = Number(hour);
    const m = Number(minute);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return "—";
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  /** List view shows times only after approval. Waiting/rejected stay on the approval list. */
  const displayListTime = (row: TeacherAttendanceRecord, time: string | null): string => {
    if (row.isSubmitted && row.approvalStatus !== "Approved") return "—";
    return formatTimeDisplay(time);
  };

  const toggleRowSelection = (row: TeacherAttendanceRecord) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }
      return next;
    });
  };

  const isRowSelected = (row: TeacherAttendanceRecord) => selectedRows.has(row.id);

  /** Past submitted attendance only — today's check-in/out stays in list view. */
  const isApprovalListItem = (row: TeacherAttendanceRecord) =>
    row.isSubmitted && row.date < today;

  const viewRecords = useMemo(() => {
    if (viewMode === "approval") {
      return filteredDetailsRecords.filter(isApprovalListItem);
    }
    return attendanceListGridRecords;
  }, [filteredDetailsRecords, attendanceListGridRecords, viewMode]);

  const renderTextCell = (value: string, secondary = false) => (
    <Typography
      variant="body2"
      color={secondary ? "text.secondary" : "text.primary"}
      sx={{ fontWeight: "inherit" }}
    >
      {value}
    </Typography>
  );

  const openDatePicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const input = e.currentTarget
      .closest(".MuiInputBase-root")
      ?.querySelector('input[type="date"]') as HTMLInputElement | null;
    input?.showPicker?.();
  };

  const listColumns = [
    {
      id: "date",
      label: "DATE",
      width: "15%",
      render: (row: TeacherAttendanceRecord) => renderTextCell(formatDate(row.date)),
    },
    {
      id: "teacherName",
      label: "TEACHER NAME",
      width: "35%",
      render: (row: TeacherAttendanceRecord) => renderTextCell(teacherName(row.teacherId)),
    },
    {
      id: "checkIn",
      label: "CHECK IN",
      width: "25%",
      render: (row: TeacherAttendanceRecord) =>
        renderTextCell(displayListTime(row, row.checkInTime)),
    },
    {
      id: "checkOut",
      label: "CHECK OUT",
      width: "25%",
      render: (row: TeacherAttendanceRecord) =>
        renderTextCell(displayListTime(row, row.checkOutTime)),
    },
  ];

  const approvalColumns = [
    {
      id: "date",
      label: "DATE",
      width: "12%",
      render: (row: TeacherAttendanceRecord) => renderTextCell(formatDate(row.date)),
    },
    {
      id: "teacherName",
      label: "TEACHER NAME",
      width: "22%",
      render: (row: TeacherAttendanceRecord) => renderTextCell(teacherName(row.teacherId)),
    },
    {
      id: "checkIn",
      label: "CHECK IN",
      width: "15%",
      render: (row: TeacherAttendanceRecord) =>
        renderTextCell(formatTimeDisplay(row.checkInTime)),
    },
    {
      id: "checkOut",
      label: "CHECK OUT",
      width: "15%",
      render: (row: TeacherAttendanceRecord) =>
        renderTextCell(formatTimeDisplay(row.checkOutTime)),
    },
    {
      id: "remarks",
      label: "REMARKS",
      width: "20%",
      render: (row: TeacherAttendanceRecord) =>
        renderTextCell(
          (row.approvalStatus === "Rejected"
            ? row.rejectionReason?.trim()
            : row.remarks?.trim()) || "—",
          true
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

const tableTotalRows = viewRecords.length;

const tableData = useMemo(
  () => viewRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
  [viewRecords, page, rowsPerPage]
);

useEffect(() => {
  const maxPage = Math.max(0, Math.ceil(tableTotalRows / rowsPerPage) - 1);
  if (page > maxPage) setPage(maxPage);
}, [tableTotalRows, page, rowsPerPage]);

  const tableLabel =
    viewMode === "approval" && pendingApprovalCount > 0
      ? `Attendance Approval (${pendingApprovalCount} pending)`
      : viewMode === "list"
        ? "Attendance List"
        : "Attendance Approval";

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

              <TextField
                label="From Date"
                type="date"
                size="small"
                value={detailsFilters.fromDate}
                InputLabelProps={{ shrink: true }}
                onChange={(e) => updateDetailsFilter("fromDate", e.target.value)}
                sx={dateFieldSx}
                data-testid="filter-from-date"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={openDatePicker}
                        onMouseDown={(event) => event.preventDefault()}
                        aria-label="Open from date calendar"
                        size="small"
                        sx={{ p: 0.25, color: colorTokens.text.secondary }}
                      >
                        <CalendarTodayIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="To Date"
                type="date"
                size="small"
                value={detailsFilters.toDate}
                InputLabelProps={{ shrink: true }}
                onChange={(e) => updateDetailsFilter("toDate", e.target.value)}
                sx={dateFieldSx}
                data-testid="filter-to-date"
                inputProps={{ max: today }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={openDatePicker}
                        onMouseDown={(event) => event.preventDefault()}
                        aria-label="Open to date calendar"
                        size="small"
                        sx={{ p: 0.25, color: colorTokens.text.secondary }}
                      >
                        <CalendarTodayIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

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

            <Stack direction="row" spacing={1} sx={{ ml: { xs: 0, sm: 2 } }}>
              {/* List View Button */}
              <Tooltip title="List View">
                <IconButton
                  onClick={() => {
                    setViewMode("list");
                    updateDetailsFilter("fromDate", today);
                  }}
                  size="small"
                  data-testid="btn-list-view"
                  sx={{
                    bgcolor: viewMode === "list"
                      ? alpha(colorTokens.preschool.turquoise.main, 0.2)
                      : alpha(colorTokens.preschool.turquoise.main, 0.1),
                    color: viewMode === "list"
                      ? colorTokens.preschool.turquoise.main
                      : colorTokens.text.secondary,
                    width: 40,
                    height: 40,
                    "&:hover": {
                      bgcolor: viewMode === "list"
                        ? alpha(colorTokens.preschool.turquoise.main, 0.3)
                        : alpha(colorTokens.preschool.turquoise.main, 0.15),
                    },
                  }}
                >
                  <ViewListIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Approval View Button */}
              <Tooltip title="Approval View">
                <IconButton
                  onClick={() => {
                    setViewMode("approval");
                    updateDetailsFilter("fromDate", getCurrentMonthStartIso());
                    updateDetailsFilter("approvalStatus", "Waiting for Approval");
                  }}
                  size="small"
                  data-testid="btn-approval-view"
                  sx={{
                    bgcolor: viewMode === "approval"
                      ? alpha(colorTokens.preschool.turquoise.main, 0.2)
                      : alpha(colorTokens.preschool.turquoise.main, 0.1),
                    color: viewMode === "approval"
                      ? colorTokens.preschool.turquoise.main
                      : colorTokens.text.secondary,
                    width: 40,
                    height: 40,
                    "&:hover": {
                      bgcolor: viewMode === "approval"
                        ? alpha(colorTokens.preschool.turquoise.main, 0.3)
                        : alpha(colorTokens.preschool.turquoise.main, 0.15),
                    },
                  }}
                >
                  <Badge
                    badgeContent={pendingApprovalCount}
                    color="warning"
                    invisible={pendingApprovalCount === 0}
                    data-testid="badge-approval-view-count"
                    sx={{ "& .MuiBadge-badge": { right: 2, top: 2 } }}
                  >
                    <HowToVoteIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
            </Stack>
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
            label={tableLabel}
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
            showPagination={tableTotalRows > DEFAULT_LIST_ROWS_PER_PAGE}
            showInfoBar={false}
            data-testid={viewMode === "list" ? "table-attendance-list" : "table-attendance-details"}
            rowTestId={(row) => `${viewMode === "list" ? "attendance-list" : "attendance-details"}-row-${row.id}`}
            emptyTestId={viewMode === "list" ? "attendance-list-empty-state" : "attendance-details-empty-state"}
            onRowClick={toggleRowSelection}
            getRowSx={(row) => {
              const selected = isRowSelected(row);

              if (selected) {
                return {
                  fontWeight: viewMode === "approval" ? 700 : 500,
                  color: "text.primary",
                  bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.12),
                  "&.MuiTableRow-hover:hover": {
                    bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.18),
                  },
                };
              }

              if (viewMode === "approval") {
                return {
                  fontWeight: 700,
                  color: "text.primary",
                };
              }

              return { fontWeight: 500 };
            }}
          />
        </AppCard>
      </Stack>

      <ConfirmDialog
        open={rejectTargetId !== null}
        onClose={closeRejectDialog}
        onConfirm={confirmReject}
        title="Reject Attendance?"
        confirmLabel="Reject"
        confirmDisabled={rejectReason.trim().length === 0}
        data-testid="dialog-reject-reason"
      >
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
        />
      </ConfirmDialog>
    </Box>
  );
}