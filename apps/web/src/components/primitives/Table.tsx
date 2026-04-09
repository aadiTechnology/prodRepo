/**
 * Table — UI Primitives
 * Single point of access to MUI Table building blocks.
 */

import {
  Table as MuiTable,
  TableHead as MuiTableHead,
  TableBody as MuiTableBody,
  TableRow as MuiTableRow,
  TableCell as MuiTableCell,
} from "@mui/material";

export type TableProps = React.ComponentProps<typeof MuiTable>;
export type TableHeadProps = React.ComponentProps<typeof MuiTableHead>;
export type TableBodyProps = React.ComponentProps<typeof MuiTableBody>;
export type TableRowProps = React.ComponentProps<typeof MuiTableRow>;
export type TableCellProps = React.ComponentProps<typeof MuiTableCell>;

export const Table = MuiTable;
export const TableHead = MuiTableHead;
export const TableBody = MuiTableBody;
export const TableRow = MuiTableRow;
export const TableCell = MuiTableCell;

