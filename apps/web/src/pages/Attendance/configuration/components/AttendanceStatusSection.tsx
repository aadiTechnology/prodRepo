import { useEffect, useState } from "react";
import { Box, Chip, Stack } from "@mui/material";

import {
  DataTable,
  TablePaginationBar,
  TableRowActions,
} from "../../../../components/reusable";
import { LabeledSwitch } from "../../../../components/semantic";
import type { AttendanceConfigurationController } from "../../../../hooks/useAttendanceConfigurationController";
import type { AttendanceStatusItem, StatusFormValues } from "../attendanceConfiguration.types";
import ConfigEntityDialog from "./ConfigEntityDialog";
import ConfigSectionCard from "./ConfigSectionCard";
import GridSectionToolbar from "./GridSectionToolbar";

type Props = {
  controller: AttendanceConfigurationController;
};

const STATUS_FIELDS = [
  { name: "name", label: "Status Name", type: "text" as const, testId: "input-status-name", required: true },
  { name: "color", label: "Color", type: "color" as const, testId: "input-status-color", required: true },
];

function emptyStatusForm(): StatusFormValues {
  return { name: "", color: "#22c55e", active: true };
}

export default function AttendanceStatusSection({ controller }: Props) {
  const {
    state,
    paginatedStatuses,
    filteredStatuses,
    statusFilters,
    editTarget,
    setEditTarget,
    setDeleteTarget,
    saveStatus,
    setCheckInRules,
  } = controller;

  const [formValues, setFormValues] = useState<StatusFormValues>(emptyStatusForm());
  const isDialogOpen = editTarget?.type === "status";
  const { checkInRules } = state;

  useEffect(() => {
    if (editTarget?.type === "status" && editTarget.item) {
      setFormValues({
        name: editTarget.item.name,
        color: editTarget.item.color,
        active: editTarget.item.active,
      });
    } else if (editTarget?.type === "status" && !editTarget.item) {
      setFormValues(emptyStatusForm());
    }
  }, [editTarget]);

  const updateCheckInRule = (key: keyof typeof checkInRules, checked: boolean) => {
    const next = { ...checkInRules, [key]: checked };
    setCheckInRules(next);
  };

  return (
    <Stack spacing={2}>
      <ConfigSectionCard
        id="section-attendance-status"
        title="Attendance Status"
        description="Custom statuses are supported. Multiple statuses per day are allowed (e.g. Half Day + Leave)."
        data-testid="section-attendance-status"
      >
        <GridSectionToolbar
          searchValue={statusFilters.search}
          onSearchChange={statusFilters.setSearch}
          searchTestId="input-status-search"
          onAdd={() => setEditTarget({ type: "status", item: null })}
          addLabel="Add Status"
          addTestId="btn-add-status"
        />

        <DataTable<AttendanceStatusItem>
          columns={[
            { id: "name", label: "Status Name", field: "name" },
            {
              id: "color",
              label: "Color",
              render: (row) => (
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    bgcolor: row.color,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                  data-testid={`swatch-status-color-${row.id}`}
                />
              ),
            },
            {
              id: "active",
              label: "Active",
              render: (row) => (
                <Chip
                  size="small"
                  label={row.active ? "Yes" : "No"}
                  color={row.active ? "success" : "default"}
                  data-testid={`chip-status-active-${row.id}`}
                />
              ),
            },
          ]}
          data={paginatedStatuses}
          emptyMessage="No attendance statuses configured."
          data-testid="grid-attendance-statuses"
          emptyTestId="grid-attendance-statuses-empty"
          rowTestId={(row) => `grid-attendance-statuses-row-${row.id}`}
          renderRowActions={(row) => (
            <TableRowActions
              onEdit={() => setEditTarget({ type: "status", item: row })}
              onDelete={() => setDeleteTarget({ type: "status", item: row })}
              editTestId={`btn-edit-status-${row.id}`}
              deleteTestId={`btn-delete-status-${row.id}`}
            />
          )}
        />

        <Box>
          <TablePaginationBar
            page={statusFilters.page}
            rowsPerPage={statusFilters.rowsPerPage}
            totalRows={filteredStatuses.length}
            onPageChange={statusFilters.setPage}
            onRowsPerPageChange={statusFilters.setRowsPerPage}
          />
        </Box>

        <ConfigEntityDialog
          open={isDialogOpen}
          title={editTarget?.item ? "Edit Status" : "Add Status"}
          values={formValues}
          fields={STATUS_FIELDS}
          onClose={() => setEditTarget(null)}
          onChange={(name, value) =>
            setFormValues((prev) => ({
              ...prev,
              [name]: value,
            }))
          }
          onSave={() => saveStatus(formValues)}
          data-testid="dialog-status-form"
        />
      </ConfigSectionCard>

      <ConfigSectionCard
        id="section-check-in-rules"
        title="Check-in Rules"
        data-testid="section-check-in-rules"
      >
        <Stack spacing={1}>
          <LabeledSwitch
            label="Check-in Mandatory"
            checked={checkInRules.checkInMandatory}
            onChange={(_, checked) => updateCheckInRule("checkInMandatory", checked)}
            inputTestId="toggle-check-in-mandatory"
          />
          <LabeledSwitch
            label="Check-out Mandatory"
            checked={checkInRules.checkOutMandatory}
            onChange={(_, checked) => updateCheckInRule("checkOutMandatory", checked)}
            inputTestId="toggle-check-out-mandatory"
          />
          <LabeledSwitch
            label="Allow Attendance Without Check-out"
            checked={checkInRules.allowAttendanceWithoutCheckOut}
            onChange={(_, checked) =>
              updateCheckInRule("allowAttendanceWithoutCheckOut", checked)
            }
            inputTestId="toggle-allow-attendance-without-checkout"
          />
          <LabeledSwitch
            label="Allow Multiple Check-in"
            checked={checkInRules.allowMultipleCheckIn}
            onChange={(_, checked) =>
              updateCheckInRule("allowMultipleCheckIn", checked)
            }
            inputTestId="toggle-allow-multiple-check-in"
          />
          <LabeledSwitch
            label="Allow Next Day Check-out"
            checked={checkInRules.allowNextDayCheckOut}
            onChange={(_, checked) =>
              updateCheckInRule("allowNextDayCheckOut", checked)
            }
            inputTestId="toggle-allow-next-day-checkout"
          />
          <LabeledSwitch
            label="Auto Calculate Working Hours"
            checked={checkInRules.autoCalculateWorkingHours}
            onChange={(_, checked) =>
              updateCheckInRule("autoCalculateWorkingHours", checked)
            }
            inputTestId="toggle-auto-calculate-working-hours"
          />
        </Stack>
      </ConfigSectionCard>
    </Stack>
  );
}
