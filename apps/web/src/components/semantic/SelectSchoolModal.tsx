/**
 * SelectSchoolModal — Semantic component
 * Pre-login school picker shown over the login page (matches "Select or Switch School" design).
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Dialog, DialogContent } from "../primitives";
import { Button } from "../primitives";
import publicSchoolService from "../../api/services/publicSchoolService";
import type { TenantSchoolPickerItem } from "../../types/tenant";

const labelBlue = "#1976d2";
const titleColor = "#334e68";
const cancelRed = "#d32f2f";
const optionHoverBg = "rgba(25, 118, 210, 0.08)";
const inputBg = "#f0f6fc";

export interface SelectSchoolModalProps {
  open: boolean;
  onClose: () => void;
  onSchoolSelected: (school: TenantSchoolPickerItem) => void;
  selectedSchoolId?: number | null;
}

export default function SelectSchoolModal({
  open,
  onClose,
  onSchoolSelected,
  selectedSchoolId = null,
}: SelectSchoolModalProps) {
  const [schools, setSchools] = useState<TenantSchoolPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>(
    selectedSchoolId != null ? String(selectedSchoolId) : "",
  );

  useEffect(() => {
    if (selectedSchoolId != null) {
      setSelectedId(String(selectedSchoolId));
    }
  }, [selectedSchoolId, open]);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let page = 1;
      const pageSize = 100;
      let total = Infinity;
      const merged: TenantSchoolPickerItem[] = [];
      while (merged.length < total) {
        const { items, total: t } = await publicSchoolService.list({ page, page_size: pageSize });
        total = t;
        merged.push(...items);
        if (items.length === 0) break;
        page += 1;
      }
      setSchools(merged);
    } catch {
      setLoadError("Unable to load schools. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadSchools();
    }
  }, [open, loadSchools]);

  const handleSelectSchool = (event: SelectChangeEvent<string>) => {
    const idStr = event.target.value;
    setSelectedId(idStr);
    if (!idStr) return;
    const id = Number(idStr);
    const school = schools.find((s) => s.id === id);
    if (!school) return;
    onSchoolSelected(school);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 1, overflow: "hidden" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", px: 2.5, pt: 2, pb: 1 }}>
        <Typography
          component="h2"
          sx={{
            fontWeight: 700,
            color: titleColor,
            fontSize: "1.1rem",
            pr: 2,
            lineHeight: 1.35,
          }}
        >
          Select or Switch School
        </Typography>
        <IconButton aria-label="Close" size="small" onClick={onClose} sx={{ color: titleColor, mt: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />
      <DialogContent sx={{ px: 2.5, py: 2.5 }}>
        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loadError}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={36} />
          </Box>
        ) : (
          <FormControl fullWidth required>
            <InputLabel
              id="school-select-modal-label"
              shrink
              sx={{
                color: labelBlue,
                fontWeight: 600,
                fontSize: "0.8rem",
                "&.Mui-focused": { color: labelBlue },
              }}
            >
              Select School
            </InputLabel>
            <Select
              labelId="school-select-modal-label"
              id="school-select-modal"
              notched
              label="Select School"
              displayEmpty
              value={selectedId}
              onChange={handleSelectSchool}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: 320,
                    "& .MuiMenuItem-root": { fontSize: "0.95rem" },
                    "& .MuiMenuItem-root.Mui-selected": { backgroundColor: optionHoverBg },
                    "& .MuiMenuItem-root.Mui-selected:hover": { backgroundColor: optionHoverBg },
                    "& .MuiMenuItem-root:hover": { backgroundColor: optionHoverBg },
                  },
                },
              }}
              sx={{
                mt: 1,
                bgcolor: inputBg,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.12)" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(25, 118, 210, 0.4)" },
              }}
            >
              <MenuItem value="" disabled>
                <Typography sx={{ color: "text.secondary" }}>Choose a school…</Typography>
              </MenuItem>
              {schools.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <Divider />
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 2.5, py: 2 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            bgcolor: cancelRed,
            textTransform: "none",
            fontWeight: 600,
            px: 2.5,
            boxShadow: "none",
            "&:hover": { bgcolor: "#b71c1c", boxShadow: "none" },
          }}
        >
          Cancel
        </Button>
      </Box>
    </Dialog>
  );
}
