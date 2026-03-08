/**
 * ListPageToolbar — Reusable (Phase 7)
 * Search field + optional primary action (e.g. Add). Theme-driven.
 */

import { TextField, InputAdornment, Box } from "@mui/material";
import { ReactNode } from "react";
import { Search as SearchIcon, Add as AddIcon } from "@mui/icons-material";
import { Stack } from "../primitives";
import PrimaryActionButton from "./PrimaryActionButton";

export interface ListPageToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onAddClick?: () => void;
  addLabel?: string;
  addIcon?: ReactNode;
  /** Extra actions (e.g. filters, buttons). */
  renderActions?: ReactNode;
}

export default function ListPageToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  onAddClick,
  addLabel = "Add",
  addIcon,
  renderActions,
}: ListPageToolbarProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: { xs: "100%", sm: "auto" }, flexWrap: "wrap" }}>
      <TextField
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        variant="outlined"
        size="small"
        fullWidth={false}
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
            bgcolor: theme.palette.background.paper,
            borderRadius: theme.shape.borderRadius,
            fontSize: theme.typography.body2.fontSize,
            fontWeight: theme.typography.fontWeightMedium,
            "& fieldset": { borderColor: theme.palette.divider },
            "&:hover fieldset": { borderColor: theme.palette.grey[400] },
            "&.Mui-focused fieldset": { borderColor: theme.palette.primary.main },
          },
        })}
      />
      {onAddClick != null && (
        <PrimaryActionButton
          onClick={onAddClick}
          icon={addIcon ?? <AddIcon sx={{ fontSize: 24 }} />}
          label={addLabel}
        />
      )}
      {renderActions != null && (
        <Stack direction="row" spacing={2} alignItems="center">
          {renderActions}
        </Stack>
      )}
    </Box>
  );
}
