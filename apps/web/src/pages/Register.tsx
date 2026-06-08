/**
 * Register Page
 * User registration page
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  Alert,
} from "@mui/material";
import { TextField, Button } from "../components/primitives";
import { EmailInput, PhoneInput, PasswordInput } from "../components/semantic";
import apiClient from "../api/client";
import { UserResponse } from "../types/user";
import { EMAIL_PATTERN, PHONE_PATTERN } from "../utils/validationPatterns";

type RegisterFieldErrors = {
  email?: string;
  full_name?: string;
  password?: string;
  confirmPassword?: string;
  phone_number?: string;
};

export default function Register() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    confirmPassword: "",
    phone_number: "",
  });
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof RegisterFieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const newErrors: RegisterFieldErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_PATTERN.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    const phone = formData.phone_number.trim();
    if (phone && !PHONE_PATTERN.test(phone)) {
      newErrors.phone_number = "Please enter a valid phone number (10-15 digits)";
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post<UserResponse>("/auth/register", {
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        phone_number: formData.phone_number.trim() || undefined,
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setSubmitError(err?.message || err?.detail || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
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
          <Paper elevation={3} sx={{ padding: 4, width: "100%", textAlign: "center" }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Registration successful! Redirecting to login...
            </Alert>
            <Typography variant="body2" color="text.secondary">
              You will be redirected to the login page shortly.
            </Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

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
            Sign Up
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
            Create an account to get started
          </Typography>

          {submitError && (
            <Alert severity="error" onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <EmailInput
              name="email"
              label="Email"
              value={formData.email}
              onChange={handleChange}
              required
              fullWidth
              autoComplete="email"
              autoFocus
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
            />

            <TextField
              name="full_name"
              label="Full Name"
              value={formData.full_name}
              onChange={handleChange}
              required
              fullWidth
              autoComplete="name"
              error={!!fieldErrors.full_name}
              helperText={fieldErrors.full_name}
            />

            <PhoneInput
              name="phone_number"
              label="Phone Number"
              value={formData.phone_number}
              onChange={handleChange}
              fullWidth
              autoComplete="tel"
              error={!!fieldErrors.phone_number}
              helperText={fieldErrors.phone_number ?? "Optional - 10 to 15 digits only"}
            />

            <PasswordInput
              name="password"
              label="Password"
              value={formData.password}
              onChange={handleChange}
              required
              fullWidth
              autoComplete="new-password"
              error={!!fieldErrors.password}
              helperText={fieldErrors.password ?? "Password must be at least 6 characters"}
            />

            <PasswordInput
              name="confirmPassword"
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              fullWidth
              autoComplete="new-password"
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isSubmitting}
              sx={{ mt: 2 }}
            >
              {isSubmitting ? "Creating Account..." : "Sign Up"}
            </Button>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{" "}
                <Link to="/login" style={{ textDecoration: "none" }}>
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
