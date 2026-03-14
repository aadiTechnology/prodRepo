import React, { useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  TextField,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from "@mui/material";
import { classFeeStructureAssignmentService, ClassFeeStructureAssignment, ClassFeeStructureAssignmentCreate } from "../../api/services/classFeeStructureAssignmentService";

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editAssignment: ClassFeeStructureAssignment | null;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ open, onClose, onSuccess, editAssignment }) => {
  const [form, setForm] = useState<ClassFeeStructureAssignmentCreate>({
    academic_year: "",
    class_id: null,
    fee_structure_id: null,
    effective_date: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // TODO: Fetch dropdown options for academic years, classes, fee structures
  const academicYears = ["2024-25", "2025-26"];
  const classes = [{ id: 1, name: "Class 1" }, { id: 2, name: "Class 2" }];
  const feeStructures = [{ id: 1, name: "Standard" }, { id: 2, name: "Premium" }];

  useEffect(() => {
    if (editAssignment) {
      setForm({
        academic_year: editAssignment.academic_year,
        class_id: editAssignment.class_id as any, // TODO: Map to id
        fee_structure_id: editAssignment.fee_structure_id as any, // TODO: Map to id
        effective_date: editAssignment.effective_date,
      });
    } else {
      setForm({ academic_year: "", class_id: null, fee_structure_id: null, effective_date: "" });
    }
    setErrors({});
    setApiError(null);
  }, [editAssignment, open]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.academic_year) errs.academic_year = "Please select academic year";
    if (!form.class_id) errs.class_id = "Please select class";
    if (!form.fee_structure_id) errs.fee_structure_id = "Please select fee structure";
    if (!form.effective_date) errs.effective_date = "Please select effective date";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name as string]: value }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    try {
      if (editAssignment) {
        await classFeeStructureAssignmentService.update(editAssignment.id, form);
      } else {
        await classFeeStructureAssignmentService.create(form);
      }
      onSuccess();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setApiError("Fee structure already assigned to this class");
      } else if (err?.response?.status === 401) {
        setApiError("Session expired. Please login again.");
      } else if (err?.response?.status === 404) {
        setApiError("Requested data not found");
      } else if (err?.response?.status === 500) {
        setApiError("Something went wrong. Please try again.");
      } else {
        setApiError(err?.message || "Failed to assign fee structure");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{editAssignment ? "Edit Assignment" : "Assign Fee Structure"}</DialogTitle>
      <DialogContent>
        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
        <FormControl fullWidth margin="normal" error={!!errors.academic_year}>
          <InputLabel>Academic Year</InputLabel>
          <Select
            name="academic_year"
            value={form.academic_year}
            onChange={handleChange}
            label="Academic Year"
          >
            <MenuItem value=""><em>Select</em></MenuItem>
            {academicYears.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
          {errors.academic_year && <Typography color="error" variant="caption">{errors.academic_year}</Typography>}
        </FormControl>
        <FormControl fullWidth margin="normal" error={!!errors.class_id}>
          <InputLabel>Class</InputLabel>
          <Select
            name="class_id"
            value={form.class_id || ""}
            onChange={handleChange}
            label="Class"
          >
            <MenuItem value=""><em>Select</em></MenuItem>
            {classes.map((cls) => (
              <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
            ))}
          </Select>
          {errors.class_id && <Typography color="error" variant="caption">{errors.class_id}</Typography>}
        </FormControl>
        <FormControl fullWidth margin="normal" error={!!errors.fee_structure_id}>
          <InputLabel>Fee Structure</InputLabel>
          <Select
            name="fee_structure_id"
            value={form.fee_structure_id || ""}
            onChange={handleChange}
            label="Fee Structure"
          >
            <MenuItem value=""><em>Select</em></MenuItem>
            {feeStructures.map((fs) => (
              <MenuItem key={fs.id} value={fs.id}>{fs.name}</MenuItem>
            ))}
          </Select>
          {errors.fee_structure_id && <Typography color="error" variant="caption">{errors.fee_structure_id}</Typography>}
        </FormControl>
        <TextField
          fullWidth
          margin="normal"
          name="effective_date"
          label="Effective Date"
          type="date"
          value={form.effective_date}
          onChange={e => setForm(prev => ({ ...prev, effective_date: e.target.value }))}
          InputLabelProps={{ shrink: true }}
          error={!!errors.effective_date}
          helperText={errors.effective_date}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : (editAssignment ? "Update" : "Assign Fee Structure")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignmentModal;
