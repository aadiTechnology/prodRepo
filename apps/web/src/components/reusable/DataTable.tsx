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
  alpha
} from "@mui/material";
import { type Key, ReactNode } from "react";
import { colorTokens } from "../../tokens/colors";

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
  // Defensive: always use an array
  const safeData = Array.isArray(data) ? data : [];
  return (
    <TableContainer sx={{ maxHeight: maxHeight ?? undefined }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress sx={(t) => ({ color: t.palette.primary.main })} />
        </Box>
      ) : (
        <Table size={size} stickyHeader={stickyHeader} sx={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align}
                  sx={(theme) => ({
                    fontWeight: 800,
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    px: 2,
                    py: 1.5,
                    background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                    borderBottom: `1px solid ${colorTokens.border.default}`,
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  })}
                >
                  {col.label}
                </TableCell>
              ))}
              {hasActions && (
                <TableCell
                  align="center"
                  sx={(theme) => ({
                    fontWeight: 800,
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    px: 2,
                    py: 1.5,
                    background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                    borderBottom: `1px solid ${colorTokens.border.default}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  })}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {safeData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} align="center" sx={{ py: 8 }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              safeData.map((row, idx) => (
                <TableRow
                  key={getRowKey ? getRowKey(row, idx) : idx}
                  hover
                  sx={(theme) => ({
                    "&.MuiTableRow-hover:hover": { 
                      bgcolor: alpha(colorTokens.background.default, 0.6),
                    },
                    cursor: onRowClick ? "pointer" : "default",
                    transition: "background-color 0.2s ease",
                  })}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align}
                      sx={(theme) => ({
                        color: colorTokens.text.secondary,
                        py: 1.5,
                        px: 2,
                        fontSize: "0.875rem",
                        borderBottom: `1px solid ${colorTokens.border.subtle}`,
                        fontWeight: 500,
                      })}
                    >
                      {col.render ? col.render(row) : getCellValue(row, (col.field as string) ?? col.id)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell align="center" sx={{ py: 1.5, px: 2, borderBottom: `1px solid ${colorTokens.border.subtle}` }}>
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
