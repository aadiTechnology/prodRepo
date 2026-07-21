import type { ListConfig } from "../../components/reusable/listFramework.types";
import {
  HolidayListItem,
  holidayInclusiveDayCount,
  parseHolidayDateRange,
} from "../../services/holidayApi";

type HolidayListConfigArgs = {
  navigate: (path: string) => void;
  selectedAcademicYearId: number | "";
  onDeleteClick: (row: HolidayListItem) => void;
};

export function createHolidayListConfig({
  navigate,
  selectedAcademicYearId,
  onDeleteClick,
}: HolidayListConfigArgs): ListConfig<HolidayListItem> {
  return {
    columns: [
      { id: "holiday_name", label: "Holiday Name", field: "holiday_name" },
      {
        id: "start_date",
        label: "Start Date",
        render: (row: HolidayListItem) => {
          const { start } = parseHolidayDateRange(row.holiday_date);
          return start || "—";
        },
      },
      {
        id: "end_date",
        label: "End Date",
        render: (row: HolidayListItem) => {
          const { start, end } = parseHolidayDateRange(row.holiday_date);
          return end && end !== start ? end : start || "—";
        },
      },
      {
        id: "total_days",
        label: "Total Days",
        render: (row: HolidayListItem) =>
          row.total_days != null ? String(row.total_days) : String(holidayInclusiveDayCount(row.holiday_date)),
      },
      { id: "applicable_for", label: "Applicable For", field: "applicable_for" },
    ],
    sortOptions: [],
    uiPolicy: {
      emptyMessage: "No holidays found. Click 'Add Holiday' to begin.",
      errorFallbackMessage: "Failed to load holidays.",
      retryLabel: "Retry",
    },
    actions: {
      rowActions: (row: HolidayListItem) => ({
        onEdit: () =>
          navigate(
            selectedAcademicYearId !== ""
              ? `/academics/configuration/holidays/${row.id}/edit?academic_year_id=${selectedAcademicYearId}`
              : `/academics/configuration/holidays/${row.id}/edit`,
          ),
        onDelete: () => onDeleteClick(row),
      }),
    },
  };
}
