/**
 * ListPageToolbar — Reusable (Phase 7)
 * Search field + optional primary action (e.g. Add). Theme-driven.
 */

import { TextField, InputAdornment, Box, Select, MenuItem, Typography } from "@mui/material";
import { ReactNode } from "react";
import { Search as SearchIcon, Add as AddIcon } from "@mui/icons-material";
import { Stack } from "../primitives";
import PrimaryActionButton from "./PrimaryActionButton";
import { colorTokens } from "../../tokens/colors";
import { alpha } from "@mui/material";

export interface ToolbarFilter {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { label: string; value: string; testId?: string }[];
  disabled?: boolean;
  /** Stable test hook for Playwright (e.g. filter-syllabus-month). */
  testId?: string;
}

export interface ListPageToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onAddClick?: () => void;
  addLabel?: string;
  addIcon?: ReactNode;
  /** Extra actions (e.g. filters, buttons). */
  renderActions?: ReactNode;
  /** Reusable dropdown filters */
  filters?: ToolbarFilter[];
  /**
   * When true, renderActions is placed AFTER the search field.
   * Default (false) keeps original behaviour: renderActions before search.
   */
  actionsAfterSearch?: boolean;
  /** Stable test hook for the search input. */
  searchTestId?: string;
  /** Stable test hook for the primary add action button. */
  addButtonTestId?: string;
}

export default function ListPageToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  onAddClick,
  addLabel = "Add",
  addIcon,
  renderActions,
  filters,
  actionsAfterSearch = false,
  searchTestId = "input-search",
  addButtonTestId = "btn-add",
}: ListPageToolbarProps) {
  return (
    /* 
      Arrangement: Filters > renderActions (default) > Search > Add
      When actionsAfterSearch=true: Filters > Search > renderActions > Add
      Responsive: Column on xs, Row on sm
    */
    <Box sx={{
      display: "flex",
      alignItems: { xs: "stretch", sm: "center" },
      flexDirection: { xs: "column", sm: "row" },
      gap: 2,
      width: { xs: "100%", sm: "auto" },
      minWidth: 0,
      maxWidth: "100%",
      flexWrap: "wrap",
      justifyContent: "flex-end"
    }}>
      {filters && filters.length > 0 && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
          {filters.map((filter) => (
            <Select
              key={filter.label}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value as string)}
              displayEmpty
              disabled={filter.disabled}
              size="small"
              data-testid={filter.testId}
              inputProps={filter.testId ? { "data-testid": `${filter.testId}-input` } : undefined}
              sx={{
                minWidth: { xs: "100%", sm: 160 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "15px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                },
              }}
            >
              <MenuItem value="">
                <Typography variant="body2" color="text.secondary">
                  {filter.label}
                </Typography>
              </MenuItem>
              {filter.options.map((opt) => (
                <MenuItem key={`${filter.label}-${opt.value}`} value={opt.value} data-testid={opt.testId}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          ))}
        </Stack>
      )}
      {/* renderActions BEFORE search (default behaviour — preserves all existing pages) */}
      {!actionsAfterSearch && renderActions != null && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ minWidth: 0, maxWidth: "100%", alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          {renderActions}
        </Stack>
      )}
      <TextField
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        variant="outlined"
        size="small"
        fullWidth={false}
        inputProps={{ "data-testid": searchTestId }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={(theme) => ({ color: theme.palette.grey[500], fontSize: 20 })} />
            </InputAdornment>
          ),
        }}
        sx={(theme) => ({
          width: { xs: "100%", sm: 280 },
          "& .MuiOutlinedInput-root": {
            bgcolor: "#ffffff",
            borderRadius: '15px',
            fontSize: "0.85rem",
            fontWeight: 600,
            "& fieldset": { borderColor: colorTokens.border.subtle },
            "&:hover fieldset": { borderColor: alpha(colorTokens.preschool.turquoise.main, 0.4) },
            "&.Mui-focused fieldset": { borderColor: colorTokens.preschool.turquoise.main },
          },
        })}
      />
      {/* renderActions AFTER search (opt-in via actionsAfterSearch prop) */}
      {actionsAfterSearch && renderActions != null && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ minWidth: 0, maxWidth: "100%", alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          {renderActions}
        </Stack>
      )}
      {onAddClick != null && (
        <PrimaryActionButton
          onClick={onAddClick}
          icon={addIcon ?? <AddIcon sx={{ fontSize: 24 }} />}
          label={addLabel}
          data-testid={addButtonTestId}
        />
      )}
    </Box>
  );
}
