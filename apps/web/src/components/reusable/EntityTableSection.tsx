import type { ReactNode } from "react";
import DirectoryInfoBar from "./DirectoryInfoBar";
import DataTable, { type DataTableProps } from "./DataTable";
import TablePaginationBar from "./TablePaginationBar";
import TableRowActions, { type TableRowActionsProps } from "./TableRowActions";

type RowActionsFactory<T extends object> = (row: T) => TableRowActionsProps | undefined;

export interface EntityTableSectionProps<T extends object> {
  label: string;
  loading?: boolean;
  totalRows: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  columns: DataTableProps<T>["columns"];
  data: DataTableProps<T>["data"];
  emptyMessage?: ReactNode;
  stickyHeader?: DataTableProps<T>["stickyHeader"];
  size?: DataTableProps<T>["size"];
  maxHeight?: DataTableProps<T>["maxHeight"];
  onRowClick?: DataTableProps<T>["onRowClick"];
  getRowKey?: DataTableProps<T>["getRowKey"];
  renderRowActions?: DataTableProps<T>["renderRowActions"];
  rowActions?: RowActionsFactory<T>;
  showInfoBar?: boolean;
  showPagination?: boolean;
}

export default function EntityTableSection<T extends object>({
  label,
  loading = false,
  totalRows,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  columns,
  data,
  emptyMessage,
  stickyHeader = true,
  size = "small",
  maxHeight,
  onRowClick,
  getRowKey,
  renderRowActions,
  rowActions,
  showInfoBar,
  showPagination,
}: EntityTableSectionProps<T>) {
  const rangeStart = totalRows > 0 ? Math.min(page * rowsPerPage + 1, totalRows) : 0;
  const rangeEnd = Math.min((page + 1) * rowsPerPage, totalRows);
  const shouldShowInfoBar = showInfoBar ?? (!loading && totalRows > 0);
  const shouldShowPagination = showPagination ?? (!loading && totalRows > 0);

  const resolvedRowActions: DataTableProps<T>["renderRowActions"] =
    renderRowActions ??
    (rowActions
      ? (row) => {
          const actions = rowActions(row);
          return actions ? <TableRowActions {...actions} /> : null;
        }
      : undefined);

  return (
    <>
      {shouldShowInfoBar && (
        <DirectoryInfoBar label={label} rangeStart={rangeStart} rangeEnd={rangeEnd} total={totalRows} />
      )}
      <DataTable<T>
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage={emptyMessage}
        renderRowActions={resolvedRowActions}
        stickyHeader={stickyHeader}
        size={size}
        maxHeight={maxHeight}
        onRowClick={onRowClick}
        getRowKey={getRowKey}
      />
      {shouldShowPagination && (
        <TablePaginationBar
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={totalRows}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      )}
    </>
  );
}
