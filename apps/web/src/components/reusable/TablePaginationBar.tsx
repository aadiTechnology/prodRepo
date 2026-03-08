/**
 * TablePaginationBar — Reusable (Phase 7)
 * Rows-per-page Select + "X–Y of Z" + prev/next. Theme-driven.
 */

import { Box, Select, MenuItem, Typography, IconButton } from "@mui/material";
import { KeyboardArrowLeft as PrevIcon, KeyboardArrowRight as NextIcon } from "@mui/icons-material";

export interface TablePaginationBarProps {
  page: number;
  rowsPerPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
}

const DEFAULT_OPTIONS = [10, 20, 25, 50];

export default function TablePaginationBar({
  page,
  rowsPerPage,
  totalRows,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = DEFAULT_OPTIONS,
}: TablePaginationBarProps) {
  const from = totalRows === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min((page + 1) * rowsPerPage, totalRows);
  const lastPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);

  return (
    <Box
      sx={(theme) => ({
        px: 2,
        py: 1,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: 1,
        borderColor: theme.palette.divider,
        bgcolor: theme.palette.background.default,
      })}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" sx={(t) => ({ fontWeight: t.typography.fontWeightMedium, color: t.palette.text.secondary })}>
          Rows per page
        </Typography>
        <Select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          size="small"
          sx={(theme) => ({
            height: 28,
            width: 65,
            fontSize: theme.typography.body2.fontSize,
            fontWeight: theme.typography.fontWeightMedium,
            bgcolor: theme.palette.background.paper,
            borderRadius: 1,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.divider },
          })}
        >
          {rowsPerPageOptions.map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </Select>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography variant="body2" sx={(t) => ({ fontWeight: t.typography.fontWeightMedium, color: t.palette.text.secondary })}>
          <Box component="span" sx={(t) => ({ color: t.palette.text.primary, fontWeight: t.typography.fontWeightBold })}>
            {from}-{to}
          </Box>
          {" of "}
          <Box component="span" sx={(t) => ({ color: t.palette.text.primary, fontWeight: t.typography.fontWeightBold })}>
            {totalRows}
          </Box>
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton
            size="small"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
            sx={(theme) => ({
              border: 1,
              borderColor: theme.palette.divider,
              borderRadius: 1,
              p: 0.4,
              "&:hover": { bgcolor: theme.palette.action.hover },
              "&.Mui-disabled": { borderColor: theme.palette.divider },
            })}
          >
            <PrevIcon sx={{ fontSize: "1.1rem" }} />
          </IconButton>
          <IconButton
            size="small"
            disabled={page >= lastPage}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
            sx={(theme) => ({
              border: 1,
              borderColor: theme.palette.divider,
              borderRadius: 1,
              p: 0.4,
              "&:hover": { bgcolor: theme.palette.action.hover },
              "&.Mui-disabled": { borderColor: theme.palette.divider },
            })}
          >
            <NextIcon sx={{ fontSize: "1.1rem" }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
