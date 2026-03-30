import type { ReactNode } from "react";
import { EntityTableSection } from "../reusable";
import type { DataTableColumn } from "../reusable";

export interface ReportTableProps<T extends object> {
  label: string;
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: ReactNode;
}

/**
 * Full-dataset table: reuses EntityTableSection + DataTable styling without server pagination.
 */
export default function ReportTable<T extends object>({
  label,
  columns,
  data,
  loading = false,
  emptyMessage,
}: ReportTableProps<T>) {
  const n = data.length;
  return (
    <EntityTableSection<T>
      label={label}
      totalRows={n}
      page={0}
      rowsPerPage={Math.max(n, 1)}
      onPageChange={() => {}}
      onRowsPerPageChange={() => {}}
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage={emptyMessage}
      showPagination={false}
      stickyHeader
      size="small"
    />
  );
}
