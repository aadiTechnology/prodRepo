import { useEffect, useState } from "react";
import { Box, Chip } from "@mui/material";

import {
  DataTable,
  TablePaginationBar,
  TableRowActions,
} from "../../../../components/reusable";
import type { AttendanceConfigurationController } from "../../../../hooks/useAttendanceConfigurationController";
import type { EntityStatus, Shift, ShiftFormValues } from "../attendanceConfiguration.types";
import ConfigEntityDialog, { statusField } from "./ConfigEntityDialog";
import ConfigSectionCard from "./ConfigSectionCard";
import GridSectionToolbar from "./GridSectionToolbar";

type Props = {
  controller: AttendanceConfigurationController;
};

const SHIFT_FIELDS = [
  { name: "name", label: "Shift Name", type: "text" as const, testId: "input-shift-name", required: true },
  { name: "startTime", label: "Start Time", type: "time" as const, testId: "input-shift-start-time", required: true },
  { name: "endTime", label: "End Time", type: "time" as const, testId: "input-shift-end-time", required: true },
  statusField("select-shift-status"),
];

function emptyShiftForm(): ShiftFormValues {
  return { name: "", startTime: "08:00", endTime: "14:00", status: "active" };
}

export default function ShiftConfigurationSection({ controller }: Props) {
  const {
    paginatedShifts,
    filteredShifts,
    shiftFilters,
    editTarget,
    setEditTarget,
    setDeleteTarget,
    saveShift,
  } = controller;

  const [formValues, setFormValues] = useState<ShiftFormValues>(emptyShiftForm());
  const isDialogOpen = editTarget?.type === "shift";

  useEffect(() => {
    if (editTarget?.type === "shift" && editTarget.item) {
      setFormValues({
        name: editTarget.item.name,
        startTime: editTarget.item.startTime,
        endTime: editTarget.item.endTime,
        status: editTarget.item.status,
      });
    } else if (editTarget?.type === "shift" && !editTarget.item) {
      setFormValues(emptyShiftForm());
    }
  }, [editTarget]);

  return (
    <ConfigSectionCard
      id="section-shift-configuration"
      title="Shift Configuration"
      description="Teachers can be assigned multiple shifts. Shifts can be modified during the academic year."
      data-testid="section-shift-configuration"
    >
      <GridSectionToolbar
        searchValue={shiftFilters.search}
        onSearchChange={shiftFilters.setSearch}
        searchTestId="input-shift-search"
        onAdd={() => setEditTarget({ type: "shift", item: null })}
        addLabel="Add Shift"
        addTestId="btn-add-shift"
      />

      <DataTable<Shift>
        columns={[
          { id: "name", label: "Shift Name", field: "name" },
          { id: "startTime", label: "Start Time", field: "startTime" },
          { id: "endTime", label: "End Time", field: "endTime" },
          {
            id: "status",
            label: "Status",
            render: (row) => (
              <Chip
                size="small"
                label={row.status === "active" ? "Active" : "Inactive"}
                color={row.status === "active" ? "success" : "default"}
                data-testid={`chip-shift-status-${row.id}`}
              />
            ),
          },
        ]}
        data={paginatedShifts}
        emptyMessage="No shifts configured yet."
        data-testid="grid-shifts"
        emptyTestId="grid-shifts-empty"
        rowTestId={(row) => `grid-shifts-row-${row.id}`}
        renderRowActions={(row) => (
          <TableRowActions
            onEdit={() => setEditTarget({ type: "shift", item: row })}
            onDelete={() => setDeleteTarget({ type: "shift", item: row })}
            editTestId={`btn-edit-shift-${row.id}`}
            deleteTestId={`btn-delete-shift-${row.id}`}
          />
        )}
      />

      <Box>
        <TablePaginationBar
          page={shiftFilters.page}
          rowsPerPage={shiftFilters.rowsPerPage}
          totalRows={filteredShifts.length}
          onPageChange={shiftFilters.setPage}
          onRowsPerPageChange={shiftFilters.setRowsPerPage}
        />
      </Box>

      <ConfigEntityDialog
        open={isDialogOpen}
        title={editTarget?.item ? "Edit Shift" : "Add Shift"}
        values={formValues}
        fields={SHIFT_FIELDS}
        onClose={() => setEditTarget(null)}
        onChange={(name, value) =>
          setFormValues((prev) => ({
            ...prev,
            [name]: value as string | EntityStatus,
          }))
        }
        onSave={() => saveShift(formValues)}
        data-testid="dialog-shift-form"
      />
    </ConfigSectionCard>
  );
}
