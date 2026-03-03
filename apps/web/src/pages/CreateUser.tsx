import { useState, useEffect } from "react";
import { Box, Button, TextField, MenuItem, Typography, IconButton, InputAdornment } from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from "react-router-dom";
import userService from "../api/services/userService";
import { UserCreate } from "../types/user";
import roleService from "../api/services/roleService";

type FormData = {
  email: string;
  full_name: string;
  password: string;
  confirm_password: string;
  role_code: string;
};

export default function CreateUser() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    full_name: "",
    password: "",
    confirm_password: "",
    role_code: "",
  });
  const [roles, setRoles] = useState<{ id: string; code: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRoles() {
      setLoadingRoles(true);
      try {
        const res = await roleService.getRoles({});
        // Map roles to ensure code property exists
        const mappedRoles = (res.items || []).map((role: any) => ({
          id: role.id,
          code: role.code || role.name || role.scope || String(role.id),
          name: role.name,
        }));
        setRoles(mappedRoles);
        console.log('Fetched roles from backend:', mappedRoles);
      } catch (e) {
        setError("Failed to fetch roles");
      } finally {
        setLoadingRoles(false);
      }
    }
    fetchRoles();
  }, []);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    try {
      const payload: any = {
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        role: formData.role_code,
      };
      await userService.createUser(payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate("/users");
      }, 1500);
    } catch (err) {
      setError("Failed to create user");
    }
  };

  return (
    <>
      {success && (
        <Box sx={{ position: "fixed", top: 32, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 1500, pointerEvents: "none" }}>
          <Box sx={{ bgcolor: "#43a047", color: "#fff", px: 3, py: 2, borderRadius: 2, boxShadow: 4, display: "flex", alignItems: "center", minWidth: 340, fontSize: 18, fontWeight: 500 }}>
            User saved successfully!
          </Box>
        </Box>
      )}
      <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, mx: "auto", mt: 6, p: 4, bgcolor: "background.paper", borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h5" mb={3} align="center">ADD USER</Typography>
        <TextField label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="Email Address" name="email" value={formData.email} onChange={handleChange} fullWidth margin="normal" required />
        <TextField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Confirm Password"
          name="confirm_password"
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirm_password}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle confirm password visibility"
                  onClick={handleClickShowConfirmPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField select label="Role" name="role_code" value={formData.role_code} onChange={handleChange} fullWidth margin="normal" required disabled={loadingRoles || roles.length === 0}>
          {loadingRoles ? (
            <MenuItem value="" disabled>Loading roles...</MenuItem>
          ) : roles.length === 0 ? (
            <MenuItem value="" disabled>No roles found</MenuItem>
          ) : (
            roles.map((role) => (
              <MenuItem key={role.id} value={role.code}>{role.name}</MenuItem>
            ))
          )}
        </TextField>
        {error && (<Typography color="error" mt={2} align="center">{error}</Typography>)}
        <Box mt={3} display="flex" justifyContent="space-between">
          <Button type="submit" variant="contained" color="primary">Save User</Button>
          <Button variant="outlined" color="secondary" onClick={() => navigate("/users")}>Cancel</Button>
        </Box>
      </Box>
    </>
  );
}
