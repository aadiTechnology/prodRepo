import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField, Button, Snackbar, Alert, CircularProgress, Stack, Paper, Grid, Switch, InputAdornment, Divider } from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SaveIcon from '@mui/icons-material/Save';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import HomeIcon from '@mui/icons-material/Home';
import Tooltip from '@mui/material/Tooltip';

// Local service for password change (since no changePasswordService exists)
const changePasswordService = {
  changePassword: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    // Get token from localStorage (same as AuthContext)
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch("/api/account/change-password", {
      method: "POST",
      headers,
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { response: { data: error } };
    }
    return response.json();
  },
};

function ChangePassword() {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<React.FormEvent | null>(null);

  // Show/hide password toggles
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation
  const isOldPasswordValid = oldPassword.trim().length >= 6;
  const isNewPasswordValid = newPassword.trim().length >= 6;
  const isConfirmPasswordValid = confirmPassword === newPassword && confirmPassword.length >= 6;
  const isFormValid = isOldPasswordValid && isNewPasswordValid && isConfirmPasswordValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isOldPasswordValid) {
      setError("Old Password is required (min 6 characters)");
      return;
    }
    if (!isNewPasswordValid) {
      setError("New Password is required (min 6 characters)");
      return;
    }
    if (!isConfirmPasswordValid) {
      setError("Passwords do not match");
      return;
    }
    setConfirmOpen(true);
    setPendingSubmit(e);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      await changePasswordService.changePassword({
        currentPassword: oldPassword,
        newPassword: newPassword
      });
      setSnackbar("Password changed successfully.");
      setTimeout(() => navigate("/profile"), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setLoading(false);
      setPendingSubmit(null);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingSubmit(null);
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, pb: 2, backgroundColor: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Header - Aligned with AddRole */}
      <Box sx={{ pt: 1.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/")} sx={{ backgroundColor: "#1a1a2e", borderRadius: 1.2, width: 44, height: 44, "&:hover": { backgroundColor: "#2d2d44" } }}>
            <HomeIcon sx={{ color: "white", fontSize: 24 }} />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: "22px", color: "#1A1A2E", letterSpacing: "-1px" }}>
            Change Password
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Cancel and Go Back">
            <IconButton
              onClick={() => navigate("/profile")}
              sx={{
                color: '#fff',
                backgroundColor: '#fee2e2',
                borderRadius: '12px',
                width: 48,
                height: 48,
                boxShadow: '0 2px 8px 0 rgba(239,68,68,0.10)',
                border: 'none',
                p: 0,
                m: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
                '&:hover': {
                  backgroundColor: '#fecaca',
                  color: '#fff',
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 24, color: '#ef4444', bgcolor: '#fff', borderRadius: '50%', p: 0.375 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save Password">
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
      {/* Form content - match AddRole style */}
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <Paper sx={{ p: 0, borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)", overflow: "hidden", minWidth: 520, width: 600, maxWidth: '100%' }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "#1a1a2e" }}>
            <AssignmentIndIcon sx={{ color: "white", fontSize: 22 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "1px" }}>Change Password</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <form onSubmit={handleSubmit} autoComplete="off">
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                    type={showOldPassword ? "text" : "password"}
                    inputProps={{ minLength: 6 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showOldPassword ? "Hide current password" : "Show current password"}
                            onClick={() => setShowOldPassword((show) => !show)}
                            edge="end"
                          >
                            {showOldPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                    type={showNewPassword ? "text" : "password"}
                    inputProps={{ minLength: 6 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowNewPassword((show) => !show)}
                            edge="end"
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.85rem', mt: 0.5, display: 'block' }}>
                    Password must be at least 8 characters and must contain at least 1 letter and 1 number.
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    variant="outlined"
                    sx={{ bgcolor: '#fff' }}
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    inputProps={{ minLength: 6 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowConfirmPassword((show) => !show)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>Account Active</Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.75rem" }}>Control system access for this account</Typography>
                    </Box>
                    <Switch checked={status === "ACTIVE"} onChange={e => setStatus(e.target.checked ? "ACTIVE" : "INACTIVE")} name="is_active" size="small" color="primary" />
                  </Box>
                </Grid>
              </Grid>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
                <Button
                  type="submit"
                  variant="text"
                  sx={{
                    minWidth: 165,
                    fontWeight: 750,
                    borderRadius: 0,
                    color: '#22c55e',
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
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="text"
                  onClick={() => navigate("/profile")}
                  sx={{
                    minWidth: 132,
                    fontWeight: 700,
                    borderRadius: 0,
                    color: '#ef4444',
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
                  }}
                >
                  Cancel
                </Button>
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
        <Dialog
          open={confirmOpen}
          onClose={handleCancel}
          PaperProps={{
            sx: {
              borderRadius: 3,
              maxWidth: 600,
              width: '100%',
              p: 0,
              position: 'absolute',
              top: '5%',
              left: '50%',
              transform: 'translate(-50%, 0)',
              height: '30%',
              minHeight: '20px',
              overflowY: 'auto',
            }
          }}
        >
          {/* Header bar with title and close icon */}
          <Box sx={{
            bgcolor: '#18183a',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            px: 2,
            py: 0.10,
            minHeight: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          }}>
            <Box />
            <IconButton
              aria-label="close"
              onClick={handleCancel}
              sx={{ color: 'white', bgcolor: 'transparent', borderRadius: 2 }}
            >
              <CancelIcon sx={{ fontSize: 28 }} />
            </IconButton>
          </Box>
          {/* Message, check icon, and buttons area */}
          <Box sx={{ px: 4, pt: 4, pb: 2.5, bgcolor: 'white', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <CheckIcon sx={{ fontSize: 50, color: '#43a047', mr: 2, p: 0 }} />
              <Typography sx={{ fontWeight: 175, fontSize: '1.9rem', color: '#18183a', letterSpacing: '-1px', lineHeight: 1.1 }}>
                Please Confirm
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '1.05rem', color: '#18183a', fontWeight: 125, mb: 1.2, ml: 3 }}>
              Are you sure you want to change your password?
            </Typography>
            <Box sx={{ width: '100%', mb: 0.5 }}>
              <Divider sx={{ my: 0.5 }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, width: '100%', mt: 0.5 }}>
              <Button
                onClick={handleCancel}
                sx={{
                  color: '#ef4444',
                  backgroundColor: 'transparent',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  px: 4,
                  borderRadius: 0,
                  minWidth: 120,
                  boxShadow: 'none',
                  border: 'none',
                  '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                sx={{
                  color: '#43a047',
                  backgroundColor: 'transparent',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  px: 4,
                  borderRadius: 0,
                  minWidth: 120,
                  boxShadow: 'none',
                  border: 'none',
                  '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
                }}
              >
                Confirm
              </Button>
            </Box>
          </Box>
        </Dialog>
      </Box>
    </Box>
  );
}

export default ChangePassword;