import { useState, useEffect, useCallback, ChangeEvent, useRef } from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    Avatar,
    Paper,
    Chip,
    CircularProgress,
    Snackbar,
    Alert,
    Divider,
    Tooltip,
    InputAdornment,
    Menu,
    MenuItem,
    ListItemIcon,
    Breadcrumbs,
    Link,
    Tabs,
    Tab,
    Grid,
    Select,
    FormControl,
    InputLabel,
    MenuItem as MuiMenuItem,
} from "@mui/material";
import {
    PhotoCamera as PhotoCameraIcon,
    Email as EmailIcon,
    Shield as ShieldIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Person as PersonIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AddAPhoto as AddAPhotoIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import profileService, { ProfileResponse } from "../api/services/profileService";
import { apiBaseUrl } from "../config";

// ─── helpers ────────────────────────────────────────────────────────────────

const toFullUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    // Security: Prevent malicious URLs - only allow relative paths to our API
    if (path.startsWith("http")) {
        try {
            const url = new URL(path);
            const apiUrl = new URL(apiBaseUrl);
            if (url.hostname !== apiUrl.hostname) return undefined; // Reject external URLs
            return path;
        } catch {
            return undefined; // Invalid URL format
        }
    }
    // Prevent path traversal attacks
    if (path.includes("..") || path.includes("//")) return undefined;
    const root = apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${root}${path}`;
};

const formatRole = (role: string): string =>
    role
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { bg: string; color: string; dot: string }> = {
        active: { bg: "#e8f5e9", color: "#1b5e20", dot: "#4caf50" },
        pending: { bg: "#fff3e0", color: "#e65100", dot: "#ff9800" },
        inactive: { bg: "#ffebee", color: "#b71c1c", dot: "#f44336" },
        blocked: { bg: "#ffebee", color: "#b71c1c", dot: "#f44336" },
    };

    const s = status.toLowerCase();
    const { bg, color, dot } = config[s] || config.inactive;

    return (
        <Box sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: bg,
            color: color,
            fontWeight: 600,
            fontSize: "0.85rem",
            width: "fit-content",
            border: "1px solid rgba(0,0,0,0.03)"
        }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: dot }} />
            {status}
        </Box>
    );
};

// ─── ProfilePage ──────────────────────────────────────────────────────────────

const ProfilePage = () => {
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [fullName, setFullName] = useState("");
    const [nameError, setNameError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [snack, setSnack] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
    const [isModified, setIsModified] = useState(false);

    // Photo menu anchor
    const [photoMenuAnchor, setPhotoMenuAnchor] = useState<null | HTMLElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── fetch ──────────────────────────────────────────────────────────────
    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const data = await profileService.getProfile();
            setProfile(data);
            setFullName(data.full_name);
        } catch (err) {
            console.error("Profile fetch error:", err instanceof Error ? err.message : "Unknown error");
            setSnack({ msg: "Unable to load profile data. Please refresh.", severity: "error" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Clear sensitive data on unmount for security
    useEffect(() => {
        return () => {
            setProfile(null);
            setFullName("");
            setNameError("");
            setSnack(null);
        };
    }, []);

    // ── name change ────────────────────────────────────────────────────────
    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFullName(val);
        setIsModified(val !== (profile?.full_name ?? ""));
        setNameError(""); // Clear on typing
    };

    // ── save ───────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const trimmedName = fullName.trim();
        if (trimmedName.length < 2) {
            setNameError("Full Name must be at least 2 characters.");
            return;
        }
        setSaving(true);
        try {
            const updated = await profileService.updateProfile({ full_name: trimmedName });
            setProfile(updated);
            setFullName(updated.full_name);
            setIsModified(false);
            setNameError("");
            setSnack({ msg: "Profile updated successfully.", severity: "success" });
        } catch {
            setSnack({ msg: "Unable to update profile. Please try again.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    // ── photo menu ─────────────────────────────────────────────────────────
    const handlePhotoButtonClick = (e: React.MouseEvent<HTMLElement>) => {
        if (profile?.profile_image_path) {
            setPhotoMenuAnchor(e.currentTarget);
        } else {
            fileInputRef.current?.click();
        }
    };

    const handlePhotoMenuClose = () => setPhotoMenuAnchor(null);

    const handleChangePhoto = () => {
        handlePhotoMenuClose();
        fileInputRef.current?.click();
    };

    // ── image upload ───────────────────────────────────────────────────────
    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate MIME type (client-side check - server should also validate)
        const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowedMimeTypes.includes(file.type)) {
            setSnack({ msg: "Please select a valid image file (JPEG, PNG, GIF, or WebP).", severity: "error" });
            return;
        }

        // Validate file extension to prevent MIME type spoofing
        const fileName = file.name.toLowerCase();
        const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
        if (!hasValidExtension) {
            setSnack({ msg: "Invalid file extension. Use JPEG, PNG, GIF, or WebP.", severity: "error" });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setSnack({ msg: "Image must be smaller than 5 MB.", severity: "error" });
            return;
        }

        setUploading(true);
        try {
            const updated = await profileService.uploadImage(file);
            setProfile(updated);
            setSnack({ msg: "Profile photo updated successfully.", severity: "success" });
            window.dispatchEvent(new Event("profile-image-updated"));
        } catch {
            setSnack({ msg: "Unable to upload image. Please try again.", severity: "error" });
        } finally {
            setUploading(false);
            // Reset file input for security - prevents re-uploading same file
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // ── delete photo ───────────────────────────────────────────────────────
    const handleDeletePhoto = async () => {
        handlePhotoMenuClose();
        setDeleting(true);
        try {
            const updated = await profileService.deleteImage();
            setProfile(updated);
            setSnack({ msg: "Profile photo removed.", severity: "success" });
            window.dispatchEvent(new Event("profile-image-updated"));
        } catch {
            setSnack({ msg: "Unable to remove photo. Please try again.", severity: "error" });
        } finally {
            setDeleting(false);
        }
    };

    // ── loading ────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    const avatarSrc = toFullUrl(profile?.profile_image_path);
    const initials = (profile?.full_name ?? "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const isPhotoLoading = uploading || deleting;

    return (
        <Box sx={{ maxWidth: 850, mx: "auto", py: 4, px: { xs: 2, md: 0 } }}>
            {/* ── Breadcrumbs ── */}
            <Typography variant="h5" fontWeight={700} color="#1a237e" sx={{ mb: 1 }}>
                My Profile
            </Typography>
            <Breadcrumbs sx={{ mb: 4, fontSize: "0.875rem" }}>
                <Link underline="hover" color="inherit" component={RouterLink} to="/">
                    Settings
                </Link>
                <Typography color="primary.main" fontWeight={500}>
                    My Profile
                </Typography>
            </Breadcrumbs>

            <Paper
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "rgba(0, 0, 0, 0.08)",
                    overflow: "hidden",
                    bgcolor: "#fff",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
                }}
            >
                {/* ── Header Section ── */}
                <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 3, borderBottom: "1px solid", borderColor: "rgba(0, 0, 0, 0.05)" }}>
                    <Box sx={{ position: "relative" }}>
                        <Avatar
                            src={avatarSrc}
                            sx={{
                                width: 90,
                                height: 90,
                                fontSize: 32,
                                fontWeight: 700,
                                bgcolor: "#e3f2fd",
                                color: "#1976d2",
                                border: "4px solid white",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                        >
                            {!avatarSrc && initials}
                        </Avatar>
                        {/* Status Badge */}
                        <Box
                            sx={{
                                position: "absolute",
                                bottom: 2,
                                right: 2,
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                bgcolor: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                        >
                            {profile?.is_active ? (
                                <CheckCircleIcon sx={{ fontSize: 18, color: "#4caf50" }} />
                            ) : (
                                <CancelIcon sx={{ fontSize: 18, color: "#f44336" }} />
                            )}
                        </Box>
                        {/* Camera Button overlay */}
                        <Tooltip title="Update Photo">
                            <Box
                                onClick={isPhotoLoading ? undefined : handlePhotoButtonClick}
                                sx={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "50%",
                                    bgcolor: "rgba(0,0,0,0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: 0,
                                    transition: "opacity 0.2s",
                                    cursor: "pointer",
                                    "&:hover": { opacity: 1 },
                                }}
                            >
                                {isPhotoLoading ? (
                                    <CircularProgress size={24} sx={{ color: "white" }} />
                                ) : (
                                    <PhotoCameraIcon sx={{ color: "white" }} />
                                )}
                            </Box>
                        </Tooltip>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, color: "#2c3e50" }}>
                            {profile?.full_name ?? "—"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {profile?.email ?? "—"}
                        </Typography>
                        <Chip
                            label={formatRole(profile?.role ?? "")}
                            size="small"
                            sx={{
                                bgcolor: "rgba(63, 81, 181, 0.1)",
                                color: "#3f51b5",
                                fontWeight: 600,
                                borderRadius: 1.5,
                                border: "1px solid rgba(63, 81, 181, 0.2)",
                            }}
                        />
                    </Box>

                </Box>

                {/* ── Tabs (Static) ── */}
                <Box sx={{ px: 2, borderBottom: "1px solid", borderColor: "rgba(0, 0, 0, 0.05)" }}>
                    <Tabs
                        value={0}
                        sx={{
                            minHeight: 48,
                            "& .MuiTab-root": {
                                textTransform: "none",
                                fontWeight: 600,
                                minWidth: 100,
                                fontSize: "0.95rem",
                                color: "text.secondary",
                            },
                            "& .Mui-selected": {
                                color: "primary.main",
                            },
                        }}
                    >
                        <Tab label="General" />
                    </Tabs>
                </Box>

                {/* ── Content ── */}
                <Box sx={{ p: 4 }}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                                Full Name <Typography component="span" color="error" sx={{ ml: 0.5 }}>*</Typography>
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={fullName}
                                onChange={handleNameChange}
                                error={Boolean(nameError)}
                                helperText={nameError}
                                placeholder="John Doe"
                                inputProps={{ maxLength: 255 }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 2.5,
                                        bgcolor: "#fafafa",
                                    },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                                Email Address
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={profile?.email ?? ""}
                                disabled
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 2.5,
                                        bgcolor: "#fafafa",
                                        "& .MuiInputBase-input.Mui-disabled": {
                                            WebkitTextFillColor: "rgba(0,0,0,0.5)",
                                        },
                                    },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                                Role
                            </Typography>
                            <FormControl fullWidth size="small" disabled>
                                <Select
                                    value={profile?.role ?? ""}
                                    sx={{
                                        borderRadius: 2.5,
                                        bgcolor: "#fafafa",
                                        "& .MuiSelect-select.Mui-disabled": {
                                            WebkitTextFillColor: "rgba(0,0,0,0.5)",
                                        },
                                    }}
                                >
                                    <MuiMenuItem value={profile?.role ?? ""}>{formatRole(profile?.role ?? "")}</MuiMenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                                Status
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                                <StatusBadge status={profile?.is_active ? "Active" : "Inactive"} />
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                {/* ── Footer / Actions ── */}
                <Divider sx={{ opacity: 0.5 }} />
                <Box sx={{ p: 3, display: "flex", justifyContent: "flex-end", bgcolor: "#fafafa" }}>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!isModified || saving}
                        sx={{
                            bgcolor: "#3f51b5",
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 4,
                            py: 1.2,
                            boxShadow: "0 4px 12px rgba(63, 81, 181, 0.2)",
                            "&:hover": { bgcolor: "#303f9f", boxShadow: "0 6px 16px rgba(63, 81, 181, 0.3)" },
                            "&.Mui-disabled": { bgcolor: "rgba(63, 81, 181, 0.5)", color: "#fff" },
                        }}
                    >
                        {saving ? <CircularProgress size={20} color="inherit" /> : "Save Changes"}
                    </Button>
                </Box>
            </Paper>

            {/* Hidden components */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageChange}
            />

            <Menu
                anchorEl={photoMenuAnchor}
                open={Boolean(photoMenuAnchor)}
                onClose={handlePhotoMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
                PaperProps={{ sx: { mt: 1, borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" } }}
            >
                <MenuItem onClick={handleChangePhoto}>
                    <ListItemIcon><AddAPhotoIcon fontSize="small" /></ListItemIcon>
                    Change Photo
                </MenuItem>
                <MenuItem onClick={handleDeletePhoto} sx={{ color: "error.main" }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    Remove Photo
                </MenuItem>
            </Menu>

            <Snackbar
                open={Boolean(snack)}
                autoHideDuration={5000}
                onClose={() => setSnack(null)}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnack(null)}
                    severity={snack?.severity ?? "info"}
                    variant="filled"
                    sx={{ width: "100%", borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                >
                    {snack?.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProfilePage;

