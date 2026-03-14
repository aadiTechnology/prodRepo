/**
 * DataTable — Reusable (Phase 7)
 * Generic table with configurable columns, loading and empty states. Theme-driven.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
} from "@mui/material";
import { type Key, ReactNode } from "react";

export interface DataTableColumn<T> {
  id: string;
  label: ReactNode;
  align?: "left" | "right" | "center";
  /** Custom cell render. If not set, renders row[id] or row[field]. */
  render?: (row: T) => ReactNode;
  /** Field key when render is not provided. Defaults to id. */
  field?: keyof T | string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: ReactNode;
  /** Optional row actions (e.g. Edit/Delete). */
  renderRowActions?: (row: T) => ReactNode;
  stickyHeader?: boolean;
  size?: "small" | "medium";
  /** Max height for TableContainer (e.g. "calc(100vh - 200px)"). Optional. */
  maxHeight?: string | number;
  /** Optional row click handler. */
  onRowClick?: (row: T) => void;
  /** Stable row key when index is not sufficient. */
  getRowKey?: (row: T, index: number) => Key;
}

function getCellValue<T>(row: T, field: keyof T | string): ReactNode {
  const v = (row as Record<string, unknown>)[field as string];
  if (Array.isArray(v)) return v.join(", ");
  return v != null ? String(v) : "";
}

export default function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data",
  renderRowActions,
  stickyHeader = true,
  size = "small",
  maxHeight,
  onRowClick,
  getRowKey,
}: DataTableProps<T>) {
  const hasActions = renderRowActions != null;

  return (
    <TableContainer sx={{ maxHeight: maxHeight ?? undefined }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress sx={(t) => ({ color: t.palette.primary.main })} />
        </Box>
      ) : (
        <Table size={size} stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align}
                  sx={(theme) => ({
                    fontWeight: theme.typography.fontWeightBold,
                    color: theme.palette.common.white,
                    fontSize: theme.typography.body2.fontSize,
                    px: 1.5,
                    py: 0.8,
                    bgcolor: theme.palette.grey[800],
                  })}
                >
                  {col.label}
                </TableCell>
              ))}
              {hasActions && (
                <TableCell
                  align="center"
                  sx={(theme) => ({
                    fontWeight: theme.typography.fontWeightBold,
                    color: theme.palette.common.white,
                    fontSize: theme.typography.body2.fontSize,
                    px: 1.5,
                    py: 0.8,
                    bgcolor: theme.palette.grey[800],
                  })}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} align="center" sx={{ py: 4 }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow
                  key={getRowKey ? getRowKey(row, idx) : idx}
                  hover
                  sx={(theme) => ({
                    "&.MuiTableRow-hover:hover": { bgcolor: theme.palette.action.hover },
                    cursor: onRowClick ? "pointer" : "default",
                  })}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align}
                      sx={(theme) => ({
                        color: theme.palette.text.secondary,
                        py: 0.6,
                        px: 1.5,
                        fontSize: theme.typography.body2.fontSize,
                      })}
                    >
                      {col.render ? col.render(row) : getCellValue(row, (col.field as string) ?? col.id)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell align="center" sx={{ py: 0.6, px: 1.5 }}>
                      {renderRowActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );
}
