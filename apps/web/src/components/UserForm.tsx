import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
} from "@mui/material";
import { User, UserCreate, UserUpdate } from "../types/user";

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserCreate | UserUpdate) => Promise<void>;
  user?: User | null;
  isEdit?: boolean;
}

export default function UserForm({
  open,
  onClose,
  onSubmit,
  user,
  isEdit = false,
}: UserFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isEdit) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        password: "",
      });
    } else {
      setFormData({
        email: "",
        full_name: "",
        password: "",
      });
    }
    setError(null);
  }, [user, isEdit, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!formData.full_name.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!isEdit && !formData.password.trim()) {
      setError("Password is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) {
        const updateData: UserUpdate = {
          full_name: formData.full_name,
        };
        await onSubmit(updateData);
      } else {
        const createData: UserCreate = {
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
        };
        await onSubmit(createData);
      }
      onClose();
    } catch (err: any) {
      setError(err?.detail || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            <TextField
              name="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isEdit}
              required
              fullWidth
            />
            
            <TextField
              name="full_name"
              label="Full Name"
              value={formData.full_name}
              onChange={handleChange}
              required
              fullWidth
            />
            
            {!isEdit && (
              <TextField
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                fullWidth
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
