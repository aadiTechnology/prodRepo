import React, { useState, useEffect } from "react";
import {
  Search as SearchIcon,
} from "@mui/icons-material";
import { 
  Select, 
  MenuItem, 
  Typography, 
  alpha, 
  InputAdornment, 
  TextField,
  Stack 
} from "@mui/material";

import { AppCard } from "../../../components/primitives";
import { colorTokens } from "../../../tokens/colors";

export interface FeeReportFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  academicYearId: string;
  setAcademicYearId: (id: string) => void;
  classId: string;
  setClassId: (id: string) => void;
  installment: string;
  setInstallment: (inst: string) => void;
  options: {
    academicYears: { label: string; value: string }[];
    classes: { label: string; value: string }[];
    installments: { label: string; value: string }[];
  };
}

// ── Shared filter select style (matches MarkAttendance exactly) ──────────────
const filterSelectSx = {
  minWidth: { xs: "100%", sm: 160 },
  "& .MuiOutlinedInput-root": {
    borderRadius: "15px",
    fontSize: "0.85rem",
    fontWeight: 600,
    bgcolor: "#ffffff",
    "& fieldset": { borderColor: colorTokens.border.subtle },
    "&:hover fieldset": { borderColor: alpha(colorTokens.preschool.turquoise.main, 0.4) },
    "&.Mui-focused fieldset": { borderColor: colorTokens.preschool.turquoise.main },
  },
};

export const FeeReportFilters: React.FC<FeeReportFiltersProps> = ({
  search,
  setSearch,
  academicYearId,
  setAcademicYearId,
  classId,
  setClassId,
  installment,
  setInstallment,
  options,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, search, setSearch]);

  return (
    <AppCard
      paddingSize="none"
      sx={{
        borderRadius: "14px",
        border: `1px solid ${colorTokens.border.default}`,
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
        overflow: "visible", // To allow dropdowns to pop out
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        gap={2}
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          bgcolor: alpha(colorTokens.primary.main, 0.01),
        }}
      >
        {/* Filter Group First */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ width: { xs: "100%", md: "auto" } }}
        >
          <Select
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value as string)}
            displayEmpty
            size="small"
            sx={filterSelectSx}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.secondary">Academic Year</Typography>
            </MenuItem>
            {options.academicYears.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>

          <Select
            value={classId}
            onChange={(e) => setClassId(e.target.value as string)}
            displayEmpty
            size="small"
            sx={filterSelectSx}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.secondary">Class</Typography>
            </MenuItem>
            {options.classes.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>

          <Select
            value={installment}
            onChange={(e) => setInstallment(e.target.value as string)}
            displayEmpty
            size="small"
            sx={filterSelectSx}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.secondary">Installment</Typography>
            </MenuItem>
            {options.installments.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>

        </Stack>

        {/* Search Field After Filters */}
        <TextField
          placeholder="Search student or invoice..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: alpha(colorTokens.text.secondary, 0.4), fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              bgcolor: "#ffffff",
              borderRadius: "15px",
              fontSize: "0.85rem",
              fontWeight: 600,
              "& fieldset": { borderColor: alpha(colorTokens.text.secondary, 0.25) },
              "&:hover fieldset": { borderColor: alpha(colorTokens.preschool.turquoise.main, 0.4) },
              "&.Mui-focused fieldset": { borderColor: colorTokens.preschool.turquoise.main },
            },
          }}
        />
      </Stack>
    </AppCard>
  );
};
