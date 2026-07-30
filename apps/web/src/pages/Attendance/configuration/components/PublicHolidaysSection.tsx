import { useEffect, useState } from "react";
import { Box, Chip } from "@mui/material";

import {
  DataTable,
  TablePaginationBar,
  TableRowActions,
} from "../../../../components/reusable";
import type { AttendanceConfigurationController } from "../../../../hooks/useAttendanceConfigurationController";
import type { EntityStatus, HolidayFormValues, PublicHoliday } from "../attendanceConfiguration.types";
import ConfigEntityDialog, { statusField } from "./ConfigEntityDialog";
import ConfigSectionCard from "./ConfigSectionCard";
import GridSectionToolbar from "./GridSectionToolbar";

type Props = {
  controller: AttendanceConfigurationController;
};

const HOLIDAY_FIELDS = [
  { name: "name", label: "Holiday Name", type: "text" as const, testId: "input-holiday-name", required: true },
  { name: "date", label: "Holiday Date", type: "date" as const, testId: "input-holiday-date", required: true },
  { name: "description", label: "Description", type: "text" as const, testId: "input-holiday-description" },
  statusField("select-holiday-status"),
];

function emptyHolidayForm(): HolidayFormValues {
  return { name: "", date: "", description: "", status: "active" };
}

export default function PublicHolidaysSection({ controller }: Props) {
  const {
    paginatedHolidays,
    filteredHolidays,
    holidayFilters,
    editTarget,
    setEditTarget,
    setDeleteTarget,
    saveHoliday,
  } = controller;

  const [formValues, setFormValues] = useState<HolidayFormValues>(emptyHolidayForm());
  const isDialogOpen = editTarget?.type === "holiday";

  useEffect(() => {
    if (editTarget?.type === "holiday" && editTarget.item) {
      setFormValues({
        name: editTarget.item.name,
        date: editTarget.item.date,
        description: editTarget.item.description,
        status: editTarget.item.status,
      });
    } else if (editTarget?.type === "holiday" && !editTarget.item) {
      setFormValues(emptyHolidayForm());
    }
  }, [editTarget]);

  const handleCloseDialog = () => setEditTarget(null);

  return (
    <ConfigSectionCard
      id="section-public-holidays"
      title="Public Holidays"
      description="Manage school-wide public holidays."
      data-testid="section-public-holidays"
    >
      <GridSectionToolbar
        searchValue={holidayFilters.search}
        onSearchChange={holidayFilters.setSearch}
        searchTestId="input-holiday-search"
        onAdd={() => setEditTarget({ type: "holiday", item: null })}
        addLabel="Add Holiday"
        addTestId="btn-add-holiday"
      />

      <DataTable<PublicHoliday>
        columns={[
          { id: "name", label: "Holiday Name", field: "name" },
          { id: "date", label: "Holiday Date", field: "date" },
          { id: "description", label: "Description", field: "description" },
          {
            id: "status",
            label: "Status",
            render: (row) => (
              <Chip
                size="small"
                label={row.status === "active" ? "Active" : "Inactive"}
                color={row.status === "active" ? "success" : "default"}
                data-testid={`chip-holiday-status-${row.id}`}
              />
            ),
          },
        ]}
        data={paginatedHolidays}
        emptyMessage="No holidays configured yet."
        data-testid="grid-public-holidays"
        emptyTestId="grid-public-holidays-empty"
        rowTestId={(row) => `grid-public-holidays-row-${row.id}`}
        renderRowActions={(row) => (
          <TableRowActions
            onEdit={() => setEditTarget({ type: "holiday", item: row })}
            onDelete={() => setDeleteTarget({ type: "holiday", item: row })}
            editTestId={`btn-edit-holiday-${row.id}`}
            deleteTestId={`btn-delete-holiday-${row.id}`}
          />
        )}
      />

      <Box sx={{ mt: 0 }}>
        <TablePaginationBar
          page={holidayFilters.page}
          rowsPerPage={holidayFilters.rowsPerPage}
          totalRows={filteredHolidays.length}
          onPageChange={holidayFilters.setPage}
          onRowsPerPageChange={holidayFilters.setRowsPerPage}
        />
      </Box>

      <ConfigEntityDialog
        open={isDialogOpen}
        title={editTarget?.item ? "Edit Holiday" : "Add Holiday"}
        values={formValues}
        fields={HOLIDAY_FIELDS}
        onClose={handleCloseDialog}
        onChange={(name, value) =>
          setFormValues((prev) => ({
            ...prev,
            [name]: value as string | EntityStatus,
          }))
        }
        onSave={() => saveHoliday(formValues)}
        data-testid="dialog-holiday-form"
      />
    </ConfigSectionCard>
  );
}
