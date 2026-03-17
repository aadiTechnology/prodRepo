/**
 * ListPageToolbar — Reusable (Phase 7)
 * Search field + optional primary action (e.g. Add). Theme-driven.
 */

import { TextField, InputAdornment, Box } from "@mui/material";
import { ReactNode } from "react";
import { Search as SearchIcon, Add as AddIcon } from "@mui/icons-material";
import { Stack } from "../primitives";
import PrimaryActionButton from "./PrimaryActionButton";
import { colorTokens } from "../../tokens/colors";
import { alpha } from "@mui/material";

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
    /* 
      Arrangement: Filter (renderActions) > Search (Field) > Add (PrimaryActionButton)
      Responsive: Column on xs, Row on sm; Stretch on xs for full-width touch targets
    */
    <Box sx={{ 
      display: "flex", 
      alignItems: { xs: "stretch", sm: "center" }, 
      flexDirection: { xs: "column", sm: "row" },
      gap: 2, 
      width: { xs: "100%", sm: "auto" }, 
      flexWrap: "wrap",
      justifyContent: "flex-end"
    }}>
      {renderActions != null && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
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
      {onAddClick != null && (
        <PrimaryActionButton
          onClick={onAddClick}
          icon={addIcon ?? <AddIcon sx={{ fontSize: 24 }} />}
          label={addLabel}
        />
      )}
    </Box>
  );
}
