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
import type { Theme } from "@mui/material/styles";

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
  /**
   * inline: filters/actions and search in one flow (default).
   * stacked: search on first row; filters + renderActions wrap on a full-width second row.
   */
  layout?: "inline" | "stacked";
  /** Search field width on sm+ (inline layout). Default 280. */
  searchMinWidth?: number;
  /** Inline toolbar horizontal alignment. Default end (right). */
  toolbarAlign?: "start" | "end";
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
  layout = "inline",
  searchMinWidth = 280,
  toolbarAlign = "end",
}: ListPageToolbarProps) {
  const searchFieldSx = (_theme: Theme) => ({
    width: {
      xs: "100%",
      sm: layout === "stacked" ? "100%" : "auto",
    },
    minWidth: layout === "inline" ? { sm: searchMinWidth } : undefined,
    maxWidth: layout === "stacked" ? { sm: 480 } : undefined,
    flex: layout === "stacked" ? { sm: "1 1 280px" } : { sm: "0 0 auto" },
    flexShrink: 0,
    "& .MuiOutlinedInput-root": {
      bgcolor: "#ffffff",
      borderRadius: "15px",
      fontSize: "0.85rem",
      fontWeight: 600,
      "& fieldset": { borderColor: colorTokens.border.subtle },
      "&:hover fieldset": { borderColor: alpha(colorTokens.preschool.turquoise.main, 0.4) },
      "&.Mui-focused fieldset": { borderColor: colorTokens.preschool.turquoise.main },
    },
  });

  const filterSelectSx = {
    minWidth: { xs: "100%", sm: layout === "stacked" ? 132 : 160 },
    flex: layout === "stacked" ? { sm: "1 1 132px" } : undefined,
    maxWidth: layout === "stacked" ? { sm: 200 } : undefined,
    "& .MuiOutlinedInput-root": {
      borderRadius: "15px",
      fontSize: "0.85rem",
      fontWeight: 600,
    },
  };

  if (layout === "stacked") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%", minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 2,
            width: "100%",
            justifyContent: { xs: "stretch", sm: "flex-end" },
          }}
        >
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
            sx={searchFieldSx}
          />
          {onAddClick != null && (
            <PrimaryActionButton
              onClick={onAddClick}
              icon={addIcon ?? <AddIcon sx={{ fontSize: 24 }} />}
              label={addLabel}
              data-testid={addButtonTestId}
            />
          )}
        </Box>
        {(filters != null && filters.length > 0) || renderActions != null ? (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1.5,
              width: "100%",
              minWidth: 0,
            }}
          >
            {filters != null &&
              filters.length > 0 &&
              filters.map((filter) => (
                <Select
                  key={filter.label}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value as string)}
                  displayEmpty
                  disabled={filter.disabled}
                  size="small"
                  data-testid={filter.testId}
                  inputProps={filter.testId ? { "data-testid": `${filter.testId}-input` } : undefined}
                  sx={filterSelectSx}
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
            {renderActions}
          </Box>
        ) : null}
      </Box>
    );
  }

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
      justifyContent: toolbarAlign === "start" ? "flex-start" : "flex-end",
      width: toolbarAlign === "start" ? "100%" : { xs: "100%", sm: "auto" },
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
          flexWrap="wrap"
          useFlexGap
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
        sx={searchFieldSx}
      />
      {/* renderActions AFTER search (opt-in via actionsAfterSearch prop) */}
      {actionsAfterSearch && renderActions != null && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          flexWrap="wrap"
          useFlexGap
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
