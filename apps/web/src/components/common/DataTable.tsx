/**
 * Reusable DataTable component
 * Aadi Design System: header #F1F5F9, field label 14px/500, responsive.
 * Use for all list/table screens (Role Management, Users, etc.)
 */

import React, { useState, useMemo } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableCellProps,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
} from "@mui/material";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";

export type Column<T = Record<string, unknown>> = {
  id: string;
  label: string;
  renderCell?: (rowData: T) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  cellProps?: TableCellProps;
  headerCellProps?: TableCellProps;
  isSortable?: boolean;
  width?: string | number;
  paddingLeft?: string | number;
  align?: "left" | "center" | "right";
};

/** Row data: any object (e.g. Role, User). Use for all list tables. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RowData = Record<string, any>;

const HEADER_BG = "#F1F5F9";
const FIELD_LABEL_STYLE = { fontSize: 14, fontWeight: 500 };
const CELL_FONT_SIZE = 14;

export interface DataTableProps<T extends RowData = RowData> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  isPagination?: boolean;
  rowsPerPageOptions?: number[];
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onPageChange?: (page: number) => void;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onSortColumn?: (columnId: string) => void;
  onSortDirection?: (isAsc: boolean) => void;
  sortColumn?: string | null;
  isAsc?: boolean;
  getRowStyle?: (row: T) => React.CSSProperties;
  defaultSortColumn?: string | null;
  /** When true, data is current page from server; use with page/totalCount for pagination. */
  serverSidePagination?: boolean;
  emptyMessage?: string;
  /** Optional row key; defaults to index. */
  getRowId?: (row: T, index: number) => string | number;
}

function DataTableInner<T extends RowData>({
  columns,
  data,
  isLoading = false,
  isPagination = false,
  rowsPerPageOptions = [5, 10, 20, 50],
  onRowsPerPageChange,
  onPageChange,
  page = 0,
  rowsPerPage = 10,
  totalCount,
  onSortColumn,
  onSortDirection,
  sortColumn = null,
  isAsc = true,
  getRowStyle,
  defaultSortColumn = null,
  serverSidePagination = false,
  emptyMessage = "No data available",
  getRowId,
}: DataTableProps<T>) {
  const [clientPage, setClientPage] = useState(0);
  const [clientRowsPerPage, setClientRowsPerPage] = useState(rowsPerPage);
  const [internalSortColumn, setInternalSortColumn] = useState<string | null>(defaultSortColumn);
  const [internalAsc, setInternalAsc] = useState(true);

  const effectivePage = serverSidePagination ? page : clientPage;
  const effectiveRowsPerPage = serverSidePagination ? rowsPerPage : clientRowsPerPage;
  const effectiveTotal = serverSidePagination && totalCount != null ? totalCount : data.length;
  const effectiveSortColumn = sortColumn ?? internalSortColumn;
  const effectiveAsc = isAsc ?? internalAsc;

  const getSortedData = useMemo(() => {
    if (!effectiveSortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = a[effectiveSortColumn];
      const bVal = b[effectiveSortColumn];
      const isNumeric =
        aVal != null &&
        bVal != null &&
        !Number.isNaN(Number(aVal)) &&
        !Number.isNaN(Number(bVal));
      if (isNumeric) {
        const diff = Number(aVal) - Number(bVal);
        return effectiveAsc ? diff : -diff;
      }
      const isDate = (v: unknown) => v != null && !Number.isNaN(Date.parse(String(v)));
      if (isDate(aVal) && isDate(bVal)) {
        const diff = new Date(String(aVal)).getTime() - new Date(String(bVal)).getTime();
        return effectiveAsc ? diff : -diff;
      }
      const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
      return effectiveAsc ? cmp : -cmp;
    });
  }, [data, effectiveSortColumn, effectiveAsc]);

  const paginatedData = useMemo(() => {
    if (!isPagination || serverSidePagination) return getSortedData;
    const start = clientPage * clientRowsPerPage;
    return getSortedData.slice(start, start + clientRowsPerPage);
  }, [getSortedData, isPagination, serverSidePagination, clientPage, clientRowsPerPage]);

  const handleSort = (columnId: string) => {
    const nextAsc = effectiveSortColumn === columnId ? !effectiveAsc : true;
    if (onSortColumn) onSortColumn(columnId);
    if (onSortDirection) onSortDirection(nextAsc);
    setInternalSortColumn(columnId);
    setInternalAsc(nextAsc);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    if (serverSidePagination && onPageChange) {
      onPageChange(newPage);
    } else {
      setClientPage(newPage);
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRows = parseInt(event.target.value, 10);
    if (onRowsPerPageChange) onRowsPerPageChange(newRows);
    setClientRowsPerPage(newRows);
    setClientPage(0);
  };

  const startRecord = effectiveTotal === 0 ? 0 : effectivePage * effectiveRowsPerPage + 1;
  const endRecord = Math.min((effectivePage + 1) * effectiveRowsPerPage, effectiveTotal);

  return (
    <>
      {isPagination && effectiveTotal > 0 && (
        <Box
          sx={{
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "background.paper",
            px: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 14 }}>
            <Box component="span" fontWeight={600}>
              {startRecord} to {endRecord}
            </Box>
            {" out of "}
            <Box component="span" fontWeight={600}>
              {effectiveTotal}
            </Box>
            {effectiveTotal === 1 ? " record" : " records"}
          </Typography>
        </Box>
      )}
      <Paper variant="outlined" sx={{ borderRadius: 0 }}>
        <TableContainer sx={{ "& .MuiTableRow-root": { borderRadius: 0 }, "& .MuiTableCell-root": { borderRadius: 0 } }}>
          <Table size="small" sx={{ "& .MuiTableRow-root": { borderRadius: 0 } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: HEADER_BG, borderRadius: 0 }}>
                {columns.map((column) => (
                  <TableCell
                    {...column.headerCellProps}
                    key={column.id}
                    align={column.align ?? "left"}
                    sx={{
                      ...FIELD_LABEL_STYLE,
                      width: column.width ?? "auto",
                      paddingLeft: column.paddingLeft ?? "16px",
                      height: 48,
                      borderRadius: 0,
                      ...(column.headerCellProps?.sx as object),
                    }}
                  >
                    {column.isSortable && (onSortColumn || onSortDirection) ? (
                      <Box
                        component="span"
                        onClick={() => handleSort(column.id)}
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          cursor: "pointer",
                          gap: 0.5,
                        }}
                      >
                        {column.renderHeader ? column.renderHeader() : column.label}
                        {effectiveSortColumn === column.id &&
                          (effectiveAsc ? (
                            <ArrowUpward sx={{ fontSize: 18 }} />
                          ) : (
                            <ArrowDownward sx={{ fontSize: 18 }} />
                          ))}
                      </Box>
                    ) : (
                      column.renderHeader ? column.renderHeader() : column.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow sx={{ borderRadius: 0 }}>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4, borderRadius: 0 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow sx={{ borderRadius: 0 }}>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 3, borderRadius: 0 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 14 }}>
                      {emptyMessage}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <TableRow
                    key={getRowId ? getRowId(row, rowIndex) : rowIndex}
                    hover
                    sx={{ borderRadius: 0, ...(getRowStyle ? getRowStyle(row) : {}) }}
                  >
                    {columns.map((column) => (
                      <TableCell
                        {...column.cellProps}
                        key={column.id}
                        align={column.align ?? "left"}
                        sx={{
                          fontSize: CELL_FONT_SIZE,
                          paddingTop: 1.25,
                          paddingBottom: 1.25,
                          paddingLeft: column.paddingLeft ?? "16px",
                          borderRadius: 0,
                          ...(column.cellProps?.sx as object),
                        }}
                      >
                        {column.renderCell
                          ? column.renderCell(row as T)
                          : (row[column.id] as React.ReactNode) ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {isPagination && effectiveTotal > 0 && (
        <TablePagination
          component="div"
          count={effectiveTotal}
          page={effectivePage}
          onPageChange={handleChangePage}
          rowsPerPage={effectiveRowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
              fontSize: 14,
            },
          }}
        />
      )}
    </>
  );
}

const DataTable = DataTableInner as <T extends RowData = RowData>(
  props: DataTableProps<T>
) => React.ReactElement;

export default DataTable;
