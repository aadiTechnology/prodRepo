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
import { ReactNode } from "react";

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
}

function getCellValue<T>(row: T, field: keyof T | string): ReactNode {
  const v = (row as Record<string, unknown>)[field as string];
  if (Array.isArray(v)) return v.join(", ");
  return v != null ? String(v) : "";
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data",
  renderRowActions,
  stickyHeader = true,
  size = "small",
  maxHeight,
}: DataTableProps<T>) {
  const hasActions = renderRowActions != null;

  return (
    <TableContainer sx={{ maxHeight: maxHeight ?? undefined }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
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
                    px: 2,
                    py: 1.2,
                    bgcolor: theme.palette.grey[800],
                  })}
                >
                  {col.label}
                </TableCell>
              ))}
              {hasActions && (
                <TableCell
                  sx={(theme) => ({
                    fontWeight: theme.typography.fontWeightBold,
                    color: theme.palette.common.white,
                    fontSize: theme.typography.body2.fontSize,
                    px: 2,
                    py: 1.2,
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
                <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} align="center" sx={{ py: 8 }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow
                  key={idx}
                  hover
                  sx={(theme) => ({
                    "&.MuiTableRow-hover:hover": { bgcolor: theme.palette.action.hover },
                  })}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align}
                      sx={(theme) => ({
                        color: theme.palette.text.secondary,
                        py: 0.8,
                        px: 2,
                        fontSize: theme.typography.body2.fontSize,
                      })}
                    >
                      {col.render ? col.render(row) : getCellValue(row, (col.field as string) ?? col.id)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell sx={{ py: 0.8, px: 2 }}>
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
