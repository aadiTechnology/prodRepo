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
  rowsPerPageOptions?: number[];
  columns: DataTableProps<T>["columns"];
  data: DataTableProps<T>["data"];
  emptyMessage?: ReactNode;
  stickyHeader?: DataTableProps<T>["stickyHeader"];
  size?: DataTableProps<T>["size"];
  maxHeight?: DataTableProps<T>["maxHeight"];
  onRowClick?: DataTableProps<T>["onRowClick"];
  getRowKey?: DataTableProps<T>["getRowKey"];
  getRowSx?: DataTableProps<T>["getRowSx"];
  renderRowActions?: DataTableProps<T>["renderRowActions"];
  rowActions?: RowActionsFactory<T>;
  showInfoBar?: boolean;
  showPagination?: boolean;
  /** Stable test hook for the table wrapper. */
  "data-testid"?: string;
  rowTestId?: DataTableProps<T>["rowTestId"];
  emptyTestId?: string;
  loadingTestId?: string;
}

export default function EntityTableSection<T extends object>({
  label,
  loading = false,
  totalRows,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions,
  columns,
  data,
  emptyMessage,
  stickyHeader = true,
  size = "small",
  maxHeight,
  onRowClick,
  getRowKey,
  getRowSx,
  renderRowActions,
  rowActions,
  showInfoBar,
  showPagination,
  "data-testid": dataTestId,
  rowTestId,
  emptyTestId,
  loadingTestId,
}: EntityTableSectionProps<T>) {
  const rangeStart = totalRows > 0 ? Math.min(page * rowsPerPage + 1, totalRows) : 0;
  const rangeEnd = Math.min((page + 1) * rowsPerPage, totalRows);
  const shouldShowInfoBar = showInfoBar ?? totalRows > 0;
  // Always show when there is data so changing page size (20/25/50) does not hide controls.
  const shouldShowPagination = showPagination ?? totalRows > 0;

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
        data-testid={dataTestId}
        rowTestId={rowTestId}
        emptyTestId={emptyTestId}
        loadingTestId={loadingTestId}
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
        getRowSx={getRowSx}
      />
      {shouldShowPagination && (
        <TablePaginationBar
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={totalRows}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      )}
    </>
  );
}
