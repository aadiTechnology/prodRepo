
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Box, Typography, Snackbar, Alert, Stack, Paper, Grid, Switch } from "@mui/material";
import DiscountIcon from '@mui/icons-material/LocalOffer';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import feeDiscountService from "../api/services/feeDiscountService";
import { classService, feeCategoryService } from "../api/services/classFeeCategoryService";
import { useAuth } from "../context/AuthContext";
import HomeIcon from '@mui/icons-material/Home';
import Tooltip from '@mui/material/Tooltip';
import { TextField, IconButton, CircularProgress, MenuItem } from "../components/primitives";
import { SaveButton, CancelButton } from "../components/semantic";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { FormSectionTitle } from "../components/reusable";

function AddFeeDiscount() {
    const [feeCategoryOptions, setFeeCategoryOptions] = useState<string[]>([]);
    const [classOptions, setClassOptions] = useState<string[]>([]);
  const showSuccessToast = (message: string) => setSnackbar(message);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: discountId } = useParams();
  const auth = useAuth();
  const tenantId = auth?.user?.tenant_id;
  const userRole = auth?.user?.role;
  const isEditMode = !!discountId;
  const [discountName, setDiscountName] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountAmount, setDiscountAmount] = useState<number | "">("");
  const [feeCategory, setFeeCategory] = useState("");
  const [applicableClass, setApplicableClass] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<React.FormEvent | null>(null);
  const [originalValues, setOriginalValues] = useState({
    discountName: "",
    discountType: "PERCENTAGE",
    discountAmount: "",
    feeCategory: "",
    applicableClass: "",
    description: "",
    status: "ACTIVE",
  });
  // ...existing code...

  useEffect(() => {
    feeCategoryService.list().then((res) => {
      setFeeCategoryOptions((res || []).map((cat: any) => cat.name));
    });
    classService.list().then((res) => {
      setClassOptions((res || []).map((cls: any) => cls.name));
    });
  }, []);

  useEffect(() => {
    if (isEditMode) {
      setFetching(true);
      feeDiscountService.getById(Number(discountId))
        .then((data) => {
          if (!data) {
            setError("Discount not found.");
            return;
          }
          const name = data.discount_name || "";
          const type = data.discount_type === "FIXED" ? "FIXED" : "PERCENTAGE";
          const amount = typeof data.discount_value === "number" ? data.discount_value : "";
          const desc = data.description || "";
          const stat = data.status ? "ACTIVE" : "INACTIVE";
          setDiscountName(name);
          setDiscountType(type);
          setDiscountAmount(amount);
          setFeeCategory(data.fee_category || "");
          setApplicableClass(data.applicable_class || "");
          setDescription(desc);
          setStatus(stat);
          setOriginalValues({
            discountName: name,
            discountType: type,
            discountAmount: amount,
            feeCategory: data.fee_category || "",
            applicableClass: data.applicable_class || "",
            description: desc,
            status: stat
          });
        })
        .catch(() => setError("Failed to fetch discount data."))
        .finally(() => setFetching(false));
    } else {
      setDiscountName("");
      setDiscountType("PERCENTAGE");
      setDiscountAmount("");
      setFeeCategory("");
      setApplicableClass("");
      setDescription("");
      setStatus("ACTIVE");
      setOriginalValues({
        discountName: "",
        discountType: "PERCENTAGE",
        discountAmount: "",
        feeCategory: "",
        applicableClass: "",
        description: "",
        status: "ACTIVE",
      });
    }
  }, [isEditMode, discountId]);

  const isFormChanged = isEditMode
    ? (
        discountName !== originalValues.discountName ||
        discountType !== originalValues.discountType ||
        discountAmount !== originalValues.discountAmount ||
        description !== originalValues.description ||
        status !== originalValues.status
      )
    : true;

  const isDiscountNameValid = discountName.trim().length >= 2;
  const isDiscountAmountValid = typeof discountAmount === "number" && discountAmount > 0;
  const isFormValid = isDiscountNameValid && isDiscountAmountValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isDiscountNameValid) {
      setError("Discount Name is required (min 2 characters)");
      return;
    }
    if (!isDiscountAmountValid) {
      setError("Discount Amount is required and must be greater than 0");
      return;
    }
    setConfirmOpen(true);
    setPendingSubmit(e);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      let payload: any = {
        discount_name: discountName,
        discount_type: discountType,
        discount_value: discountAmount,
        fee_category: feeCategory,
        applicable_class: applicableClass,
        description,
        status: status === "ACTIVE",
      };
      if (isEditMode) {
        await feeDiscountService.update(Number(discountId), payload);
        showSuccessToast("Discount updated successfully.");
      } else {
        await feeDiscountService.create(payload);
        showSuccessToast("Discount created successfully.");
      }
      setTimeout(() => navigate("/fees/discounts"), 1200);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        (isEditMode ? "Failed to update discount." : "Failed to create discount.")
      );
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
      <Box sx={{ pt: 1.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/")} sx={(theme) => ({ backgroundColor: theme.palette.grey[800], borderRadius: 1.2, width: 44, height: 44, "&:hover": { backgroundColor: theme.palette.grey[700] } })}>
            <HomeIcon sx={{ color: "white", fontSize: 24 }} />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "22px", color: "#1A1A2E", letterSpacing: "-1px" }}>
            <Box component="span" onClick={() => navigate("/fees/discounts")} sx={{ color: "#94a3b8", cursor: "pointer", "&:hover": { color: "#1a1a2e" } }}>Fee Discounts</Box>
            <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>/</Box>
            {isEditMode ? "Edit Fee Discount" : "Add Fee Discount"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Cancel and Go Back">
            <IconButton
              onClick={() => navigate("/fees/discounts")}
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
          <Tooltip title={isEditMode ? "Update Fee Discount" : "Save Fee Discount"}>
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
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : <SaveIcon sx={{ fontSize: 24, color: '#fff' }} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <Paper sx={(theme) => ({ p: 0, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[1], overflow: "hidden", minWidth: 520, width: 640, maxWidth: '100%' })}>
          <Box sx={(theme) => ({ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: theme.palette.grey[800] })}>
            <DiscountIcon sx={{ color: "white", fontSize: 22 }} />
            <FormSectionTitle sx={(theme) => ({ color: theme.palette.common.white, mb: 0 })}>Fee Discount Information</FormSectionTitle>
          </Box>
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleSubmit} autoComplete="off">
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Discount Name"
                    value={discountName}
                    onChange={e => setDiscountName(e.target.value)}
                    placeholder="Enter discount name"
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                    inputProps={{ minLength: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Discount Type"
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as "PERCENTAGE" | "FIXED")}
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                  >
                    <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                    <MenuItem value="FIXED">Fixed</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={discountType === "PERCENTAGE" ? "Discount %" : "Discount Amount"}
                    type="number"
                    value={discountAmount}
                    onChange={e => setDiscountAmount(Number(e.target.value))}
                    placeholder={discountType === "PERCENTAGE" ? "Enter percentage" : "Enter amount"}
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                    inputProps={{ min: 0, max: discountType === "PERCENTAGE" ? 100 : undefined }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Fee Category"
                    value={feeCategory}
                    onChange={e => setFeeCategory(e.target.value)}
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                  >
                    {feeCategoryOptions.map(option => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Applicable Class"
                    value={applicableClass}
                    onChange={e => setApplicableClass(e.target.value)}
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                  >
                    {classOptions.map(option => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </TextField>
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
                <Grid item xs={12}>
                  <Box sx={(theme) => ({ p: 2, bgcolor: theme.palette.grey[100], borderRadius: 2, border: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" })}>
                    <Box>
                      <Typography sx={(theme) => ({ fontSize: "0.9rem", fontWeight: 700, color: theme.palette.text.primary })}>Discount Active</Typography>
                      <Typography variant="caption" sx={(theme) => ({ color: theme.palette.text.secondary, fontSize: "0.75rem" })}>Control system access for this discount</Typography>
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
                  onClick={() => navigate("/fees/discounts")}
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
          message={isEditMode ? "Are you sure you want to update this discount?" : "Are you sure you want to save this discount?"}
          confirmText="Confirm"
          confirmVariant="primary"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </Box>
    </Box>
  );
}

export default AddFeeDiscount;
