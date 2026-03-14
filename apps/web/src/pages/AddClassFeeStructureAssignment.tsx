// ...existing code...
// ...existing code...
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Box, Typography, Snackbar, Alert, Stack, Paper, Grid, Switch } from "@mui/material";
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import classFeeStructureAssignmentService, { ClassFeeStructureAssignmentCreate, ClassFeeStructureAssignmentUpdate } from "../api/services/classFeeStructureAssignmentService";
import { useAuth } from "../context/AuthContext";
import HomeIcon from '@mui/icons-material/Home';
import Tooltip from '@mui/material/Tooltip';
import { TextField, IconButton, CircularProgress } from "../components/primitives";
import { Select, MenuItem, InputLabel, FormControl } from "@mui/material";
import { classService, academicYearService, feeStructureService } from "../api/services/dropdownServices";
import { SaveButton, CancelButton } from "../components/semantic";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { FormSectionTitle } from "../components/reusable";

function AddClassFeeStructureAssignment() {
      // Start and End Date fields
      const [startDate, setStartDate] = useState("");
      const [endDate, setEndDate] = useState("");
    // Dropdown state
    const [classOptions, setClassOptions] = useState<{ id: number; name: string }[]>([]);
    const [academicYearOptions, setAcademicYearOptions] = useState<{ id: number; name: string }[]>([]);
      const [feeStructureOptions, setFeeStructureOptions] = useState<{ id: number; name: string; fee_category_id: string }[]>([]);

    // Use number | "" for dropdown values
    const [academicYear, setAcademicYear] = useState<number | "">("");
    const [classId, setClassId] = useState<number | "">("");
    const [feeStructureId, setFeeStructureId] = useState<number | "">("");

    // Track when dropdowns are loaded
    const [dropdownsLoaded, setDropdownsLoaded] = useState(false);
    // Function to refresh dropdowns
    const refreshDropdowns = useCallback(() => {
      setDropdownsLoaded(false);
      Promise.all([
        classService.list(),
        academicYearService.list(),
        feeStructureService.list()
      ]).then(([classes, years, fees]) => {
        setClassOptions(classes);
        setAcademicYearOptions(years);
        setFeeStructureOptions(fees);
        setDropdownsLoaded(true);
      });
    }, []);

    useEffect(() => {
      refreshDropdowns();
    }, [refreshDropdowns]);
  // --- Success Toast Handler ---
  const showSuccessToast = (message: string) => setSnackbar(message);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: assignmentId } = useParams();
  const auth = useAuth();
  const tenantId = auth?.user?.tenant_id;
  const userRole = auth?.user?.role;
  const isEditMode = !!assignmentId;
  // ...handled above...
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<React.FormEvent | null>(null);
  // Store original values for edit mode
  const [originalValues, setOriginalValues] = useState({
    academicYear: "",
    classId: "",
    feeStructureId: "",
    description: "",
    status: "ACTIVE",
  });

  // Fetch assignment data in edit mode
  // Only fetch assignment data after dropdowns are loaded
  useEffect(() => {
    if (!dropdownsLoaded) return;
    if (isEditMode) {
      setFetching(true);
      (classFeeStructureAssignmentService as any).getById(assignmentId as string)
        .then((data: any) => {
          // Debug logging
          console.log('Assignment data from backend:', data);
          console.log('Academic year options:', academicYearOptions);
          console.log('Class options:', classOptions);
          console.log('Fee structure options:', feeStructureOptions);

          // Academic Year: try to find id by matching name or value
          let academicYearId: number | "" = "";
          if (data.academic_year_id) {
            academicYearId = Number(data.academic_year_id);
          } else if (data.academic_year) {
            // Try to find by name or value
            const foundYear = academicYearOptions.find(
              y => String(y.id) === String(data.academic_year) || y.name === data.academic_year
            );
            academicYearId = foundYear ? foundYear.id : "";
          }

          // Class: try to find id by matching id or name
          let classIdValue: number | "" = "";
          if (data.class_id) {
            classIdValue = Number(data.class_id);
          } else if (data.class_name) {
            const foundClass = classOptions.find(
              c => String(c.id) === String(data.class_name) || c.name === data.class_name
            );
            classIdValue = foundClass ? foundClass.id : "";
          }

              // Fee Structure: try to find id by matching id
              let feeStructureIdValue: number | "" = "";
              if (data.fee_structure_id) {
                feeStructureIdValue = Number(data.fee_structure_id);
              }

          console.log('Resolved academicYearId:', academicYearId);
          console.log('Resolved classIdValue:', classIdValue);
          console.log('Resolved feeStructureIdValue:', feeStructureIdValue);

          setAcademicYear(academicYearId === "" ? "" : academicYearId);
          setClassId(classIdValue === "" ? "" : classIdValue);
          setFeeStructureId(feeStructureIdValue === "" ? "" : feeStructureIdValue);
          setDescription(data.description || "");
          setStatus(data.status || "ACTIVE");
          setOriginalValues({
            academicYear: academicYearId === "" ? "" : String(academicYearId),
            classId: classIdValue === "" ? "" : String(classIdValue),
            feeStructureId: feeStructureIdValue === "" ? "" : String(feeStructureIdValue),
            description: data.description || "",
            status: data.status || "ACTIVE",
          });
        })
        .catch(() => setError("Failed to fetch assignment data."))
        .finally(() => setFetching(false));
    } else {
      setAcademicYear("");
      setClassId("");
      setFeeStructureId("");
      setDescription("");
      setStatus("ACTIVE");
      setOriginalValues({
        academicYear: "",
        classId: "",
        feeStructureId: "",
        description: "",
        status: "ACTIVE",
      });
    }
  }, [isEditMode, assignmentId, dropdownsLoaded]);

  const isFormChanged = isEditMode
    ? (
        academicYear !== originalValues.academicYear ||
        classId !== originalValues.classId ||
        feeStructureId !== originalValues.feeStructureId ||
        description !== originalValues.description ||
        status !== originalValues.status
      )
    : true;

  // Validation
  const isAcademicYearValid = academicYear !== "";
  const isClassIdValid = classId !== "";
  const isFeeStructureIdValid = feeStructureId !== "";
  const isFormValid = isAcademicYearValid && isClassIdValid && isFeeStructureIdValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isAcademicYearValid) {
      setError("Academic Year is required (min 4 characters)");
      return;
    }
    if (!isClassIdValid) {
      setError("Class is required");
      return;
    }
    if (!isFeeStructureIdValid) {
      setError("Fee Structure is required");
      return;
    }
    setConfirmOpen(true);
    setPendingSubmit(e);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      let payload = {
        academic_year: academicYear.toString(), // string
        class_id: typeof classId === "string" ? Number(classId) : classId,
        fee_structure_id: typeof feeStructureId === "string" ? Number(feeStructureId) : feeStructureId,
        effective_date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      };
      if (isEditMode) {
        // Always include class_id in update payload
        await (classFeeStructureAssignmentService as any).update(assignmentId, {
          class_id: payload.class_id,
          fee_structure_id: payload.fee_structure_id,
          effective_date: payload.effective_date,
        });
        showSuccessToast("Assignment updated successfully.");
      } else {
        await (classFeeStructureAssignmentService as any).create(payload);
        showSuccessToast("Assignment saved successfully.");
        // Refresh dropdowns so new fee structure appears in the list
        refreshDropdowns();
      }
      setTimeout(() => navigate("/fees", { state: { newlyCreated: true } }), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || (isEditMode ? "Failed to update assignment." : "Failed to create assignment."));
    } finally {
      setLoading(false);
      setPendingSubmit(null);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingSubmit(null);
  };

  if (isEditMode && fetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, pb: 2, backgroundColor: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Header - Aligned with AddRole */}
      <Box sx={{ pt: 1.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/")} sx={(theme) => ({ backgroundColor: theme.palette.grey[800], borderRadius: 1.2, width: 44, height: 44, "&:hover": { backgroundColor: theme.palette.grey[700] } })}>
            <HomeIcon sx={{ color: "white", fontSize: 24 }} />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "22px", color: "#1A1A2E", letterSpacing: "-1px" }}>
            <Box component="span" onClick={() => navigate("/class-fee-structure-assignments")} sx={{ color: "#94a3b8", cursor: "pointer", "&:hover": { color: "#1a1a2e" } }}>Class Fee Structure Assignments</Box>
            <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>/</Box>
            {isEditMode ? "Edit Assignment" : "Add Assignment"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Cancel and Go Back">
            <IconButton
              onClick={() => navigate("/class-fee-structure-assignments")}
              sx={(theme) => ({
                color: theme.palette.error.contrastText,
                backgroundColor: theme.palette.error.light,
                borderRadius: 1.5,
                width: 48,
                height: 48,
                boxShadow: theme.shadows[2],
                border: 'none',
                p: 0,
                m: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
                '&:hover': {
                  backgroundColor: theme.palette.error.light,
                  color: theme.palette.error.contrastText,
                },
              })}
            >
              <CloseIcon sx={(theme) => ({ fontSize: 24, color: theme.palette.error.main, bgcolor: theme.palette.background.paper, borderRadius: '50%', p: 0.375 })} />
            </IconButton>
          </Tooltip>
          <Tooltip title={isEditMode ? "Update Assignment" : "Save Assignment"}>
            <IconButton
              onClick={handleSubmit}
              sx={{
                color: '#fff',
                backgroundColor: '#22c55e',
                borderRadius: '12px',
                width: 48,
                height: 48,
                boxShadow: '0 2px 8px 0 rgba(34,197,94,0.10)',
                border: 'none',
                p: 0,
                m: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
                '&:hover': {
                  backgroundColor: '#4ade80',
                  color: '#fff',
                },
              }}
              // Save button always enabled
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : <SaveIcon sx={{ fontSize: 24, color: '#fff' }} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      {/* Form Section - Strictly match AddRole */}
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <Paper sx={(theme) => ({ p: 0, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[1], overflow: "hidden", minWidth: 540, width: 630, maxWidth: '100%' })}>
          {/* Header */}
          <Box sx={(theme) => ({ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: theme.palette.grey[800] })}>
            <AssignmentIndIcon sx={{ color: "white", fontSize: 22 }} />
            <FormSectionTitle sx={(theme) => ({ color: theme.palette.common.white, mb: 0 })}>Assignment Information</FormSectionTitle>
          </Box>
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleSubmit} autoComplete="off">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required sx={{ bgcolor: '#fff' }}>
                    <InputLabel>Academic Year</InputLabel>
                    <Select
                      value={academicYear}
                      label="Academic Year"
                      onChange={e => setAcademicYear(e.target.value === "" ? "" : Number(e.target.value))}
                    >
                      <MenuItem value=""><em>Select Academic Year</em></MenuItem>
                      {academicYearOptions.map(opt => (
                        <MenuItem key={opt.id} value={Number(opt.id)}>{opt.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required sx={{ bgcolor: '#fff' }}>
                    <InputLabel>Class</InputLabel>
                    <Select
                      value={classId}
                      label="Class"
                      onChange={e => setClassId(e.target.value === "" ? "" : Number(e.target.value))}
                    >
                      <MenuItem value=""><em>Select Class</em></MenuItem>
                      {classOptions.map(opt => (
                        <MenuItem key={opt.id} value={Number(opt.id)}>{opt.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required sx={{ bgcolor: '#fff' }}>
                    <InputLabel>Fee Structure</InputLabel>
                    <Select
                      value={feeStructureId}
                      label="Fee Structure"
                      onChange={e => setFeeStructureId(e.target.value === "" ? "" : Number(e.target.value))}
                    >
                      <MenuItem value=""><em>Select Fee Structure</em></MenuItem>
                      {feeStructureOptions.map(opt => (
                        <MenuItem key={opt.id} value={Number(opt.id)}>{opt.fee_category_id}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Enter description"
                    variant="outlined"
                    multiline
                    minRows={3}
                    sx={{ bgcolor: '#fff' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: '#fff' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: '#fff' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={(theme) => ({ p: 2, bgcolor: theme.palette.grey[100], borderRadius: 2, border: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" })}>
                    <Box>
                      <Typography sx={(theme) => ({ fontSize: "0.9rem", fontWeight: 700, color: theme.palette.text.primary })}>Assignment Active</Typography>
                      <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, fontSize: "0.75rem" })}>Control system access for this assignment</Typography>
                    </Box>
                    <Switch checked={status === "ACTIVE"} onChange={e => setStatus(e.target.checked ? "ACTIVE" : "INACTIVE")} name="is_active" size="small" color="primary" />
                  </Box>
                </Grid>
              </Grid>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
                <SaveButton
                  type="submit"
                  variant="text"
                  loading={loading}
                  sx={(theme) => ({
                    minWidth: 165,
                    fontWeight: 750,
                    borderRadius: 0,
                    color: theme.palette.success.main,
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    fontSize: '1.21rem',
                    px: 4.4,
                    py: 1.1,
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                  })}
                >
                  Save
                </SaveButton>
                <CancelButton
                  variant="text"
                  onClick={() => navigate("/fees")}
                  sx={(theme) => ({
                    minWidth: 132,
                    fontWeight: 700,
                    borderRadius: 0,
                    color: theme.palette.error.main,
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    fontSize: '1.21rem',
                    px: 4.4,
                    py: 1.1,
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                  })}
                >
                  Cancel
                </CancelButton>
              </Box>
            </form>
          </Box>
        </Paper>
        <Snackbar
          open={!!snackbar}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          onClose={() => setSnackbar(null)}
        >
          <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: '100%' }}>
            {snackbar}
          </Alert>
        </Snackbar>
        <ConfirmDialog
          open={confirmOpen}
          title="Please Confirm"
          message={isEditMode ? "Are you sure you want to update this assignment?" : "Are you sure you want to assign this fee structure?"}
          confirmText="Confirm"
          confirmVariant="primary"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </Box>
    </Box>
  );
}

export default AddClassFeeStructureAssignment;
