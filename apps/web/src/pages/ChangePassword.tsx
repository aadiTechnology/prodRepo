import { useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

export default function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    api: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validation rules
  const validate = () => {
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      api: "",
    };
    if (!form.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    if (!form.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (form.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/[A-Za-z]/.test(form.newPassword)) {
      newErrors.newPassword = "Password must include at least one letter";
    } else if (!/\d/.test(form.newPassword)) {
      newErrors.newPassword = "Password must include at least one number";
    }
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (form.confirmPassword !== form.newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => v === "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setErrors((prev) => ({
      ...prev,
      [e.target.name]: "",
      api: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors((prev) => ({ ...prev, api: "" }));
    try {
      const res = await apiClient.post("/api/account/change-password", form);
      if (res.data.success) {
        setSuccess(true);
        setForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setErrors((prev) => ({
          ...prev,
          api: res.data.message || "Failed to update password",
        }));
      }
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        api:
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Failed to update password",
      }));
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    !!form.currentPassword &&
    !!form.newPassword &&
    !!form.confirmPassword &&
    form.newPassword.length >= 8 &&
    /[A-Za-z]/.test(form.newPassword) &&
    /\d/.test(form.newPassword) &&
    form.newPassword === form.confirmPassword;

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Change Password
          </Typography>

          {/* Success Message */}
          {success && (
            <Alert
              icon={<CheckCircle fontSize="inherit" />}
              severity="success"
              variant="filled"
              sx={{
                mb: 2,
                backgroundColor: "#5ed366",
                color: "#fff",
                fontSize: "1rem",      // <-- smaller font size
                fontWeight: 500,       // <-- normal boldness
                alignItems: "center",
                py: 1,                 // <-- less vertical padding
              }}
            >
              Password updated successfully.
            </Alert>
          )}

          {/* Error Message */}
          {errors.api && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.api}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Current Password */}
            <Typography fontWeight={600} sx={{ mb: 0.5 }}>
              Current Password *
            </Typography>
            <TextField
              name="currentPassword"
              placeholder="Enter your current password"
              type="password"
              value={form.currentPassword}
              onChange={handleChange}
              error={!!errors.currentPassword}
              helperText={errors.currentPassword}
              required
              fullWidth
              autoComplete="current-password"
            />

            {/* New Password */}
            <Typography fontWeight={600} sx={{ mb: 0.5 }}>
              New Password *
            </Typography>
            <TextField
              name="newPassword"
              placeholder="Enter your new password"
              type={showNewPassword ? "text" : "password"}
              value={form.newPassword}
              onChange={handleChange}
              error={!!errors.newPassword}
              helperText={
                errors.newPassword ||
                "Password must be at least 8 characters and include at least one letter and one number."
              }
              required
              fullWidth
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowNewPassword((show) => !show)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm New Password */}
            <Typography fontWeight={600} sx={{ mb: 0.5 }}>
              Confirm New Password *
            </Typography>
            <TextField
              name="confirmPassword"
              placeholder="Enter your new password again"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              required
              fullWidth
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmPassword((show) => !show)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Buttons */}
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !isFormValid}
                startIcon={loading && <CircularProgress size={20} />}
              >
                Update Password
              </Button>
              <Button
                variant="text"
                color="secondary"
                fullWidth
                disabled={loading}
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}