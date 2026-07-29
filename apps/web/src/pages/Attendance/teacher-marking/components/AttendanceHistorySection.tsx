import { useMemo } from "react";
import {
  Box,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import {
  DataTable,
  TablePaginationBar,
  type DataTableColumn,
} from "../../../../components/reusable";
import type { TeacherAttendanceMarkingController } from "../../../../hooks/useTeacherAttendanceMarkingController";
import type { TeacherAttendanceRecord, AttendanceHistoryFilters } from "../teacherAttendanceMarking.types";
import { getTeacherById, MOCK_SHIFTS } from "../teacherAttendanceMarking.mock";
import { minutesToDuration } from "../teacherAttendanceMarking.utils";
import TeacherSectionCard from "./TeacherSectionCard";
import AttendanceHistoryDetailDrawer from "./AttendanceHistoryDetailDrawer";

interface AttendanceHistorySectionProps {
  controller: TeacherAttendanceMarkingController;
}

export default function AttendanceHistorySection({ controller }: AttendanceHistorySectionProps) {
  const {
    isAdminLike,
    paginatedHistory,
    filteredHistory,
    historyFilters,
    updateHistoryFilter,
    statusOptions,
    historyPage,
    historyRowsPerPage,
    setHistoryPage,
    setHistoryRowsPerPage,
    selectedHistoryRecord,
    openHistoryDetail,
    closeHistoryDetail,
  } = controller;

  const columns = useMemo((): DataTableColumn<TeacherAttendanceRecord>[] => [
    {
      id: "date",
      label: "Date",
      field: "date",
    },
    {
      id: "teacherName",
      label: "Teacher Name",
      render: (row) => getTeacherById(row.teacherId)?.name ?? "—",
    },
    {
      id: "shift",
      label: "Shift",
      render: (row) => {
        const teacher = getTeacherById(row.teacherId);
        const shift = MOCK_SHIFTS.find((s) => s.id === teacher?.shiftId);
        return shift?.name ?? "—";
      },
    },
    {
      id: "checkIn",
      label: "Check-in Time",
      render: (row) => row.checkInTime ?? "—",
    },
    {
      id: "checkOut",
      label: "Check-out Time",
      render: (row) => row.checkOutTime ?? "—",
    },
    {
      id: "workingHours",
      label: "Working Hours",
      render: (row) =>
        row.workingHoursMinutes != null ? minutesToDuration(row.workingHoursMinutes) : "—",
    },
    {
      id: "statuses",
      label: "Attendance Status",
      render: (row) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {row.statuses.length > 0 ? (
            row.statuses.map((s) => (
              <Chip key={s} label={s} size="small" data-testid={`history-status-${s}`} />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      id: "remarks",
      label: "Remarks",
      render: (row) => (
        <Typography
          variant="body2"
          sx={{
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.remarks || "—"}
        </Typography>
      ),
    },
  ], []);

  return (
    <>
      <TeacherSectionCard
        id="attendance-history"
        title="Attendance History"
        description="All attendance records in a single list view"
        data-testid="section-attendance-history"
      >
        <Stack spacing={2}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "repeat(3, 1fr)",
                lg: isAdminLike ? "repeat(5, 1fr)" : "repeat(4, 1fr)",
              },
              gap: 2,
            }}
            data-testid="history-filters"
          >
            {isAdminLike ? (
              <TextField
                label="Search by Teacher Name"
                value={historyFilters.teacherSearch}
                onChange={(e) => updateHistoryFilter("teacherSearch", e.target.value)}
                placeholder="Type teacher name"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                inputProps={{ "data-testid": "input-teacher-search" }}
                data-testid="field-teacher-search"
              />
            ) : null}

            <TextField
              label="Filter by Date"
              type="date"
              value={historyFilters.date}
              onChange={(e) => updateHistoryFilter("date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ "data-testid": "filter-history-date" }}
              data-testid="field-filter-date"
            />

            <TextField
              label="Filter by Month"
              type="month"
              value={historyFilters.month}
              onChange={(e) => updateHistoryFilter("month", e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ "data-testid": "filter-history-month" }}
              data-testid="field-filter-month"
            />

            <TextField
              select
              label="Filter by Status"
              value={historyFilters.status}
              onChange={(e) =>
                updateHistoryFilter(
                  "status",
                  e.target.value as AttendanceHistoryFilters["status"]
                )
              }
              data-testid="field-filter-status"
            >
              <MenuItem value="" data-testid="filter-status-all">
                All Statuses
              </MenuItem>
              {statusOptions.map((s) => (
                <MenuItem key={s} value={s} data-testid={`filter-status-${s}`}>
                  {s}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Filter by Shift"
              value={historyFilters.shiftId}
              onChange={(e) => updateHistoryFilter("shiftId", e.target.value)}
              data-testid="field-filter-shift"
            >
              <MenuItem value="" data-testid="filter-shift-all">
                All Shifts
              </MenuItem>
              {MOCK_SHIFTS.map((s) => (
                <MenuItem key={s.id} value={s.id} data-testid={`filter-shift-${s.id}`}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              overflow: "hidden",
            }}
            data-testid="history-list-container"
          >
            <DataTable<TeacherAttendanceRecord>
              columns={columns}
              data={paginatedHistory}
              emptyMessage={
                <Typography variant="body2" color="text.secondary">
                  No attendance records match the selected filters.
                </Typography>
              }
              emptyTestId="history-empty-state"
              data-testid="table-attendance-history"
              rowTestId={(row) => `history-row-${row.id}`}
              onRowClick={openHistoryDetail}
              getRowSx={(row) => ({
                cursor: "pointer",
                ...(row.payrollProcessed ? { bgcolor: "action.hover", opacity: 0.85 } : {}),
              })}
            />

            <TablePaginationBar
              page={historyPage}
              rowsPerPage={historyRowsPerPage}
              totalRows={filteredHistory.length}
              onPageChange={setHistoryPage}
              onRowsPerPageChange={setHistoryRowsPerPage}
            />
          </Box>
        </Stack>
      </TeacherSectionCard>

      <AttendanceHistoryDetailDrawer
        record={selectedHistoryRecord}
        onClose={closeHistoryDetail}
      />
    </>
  );
}
