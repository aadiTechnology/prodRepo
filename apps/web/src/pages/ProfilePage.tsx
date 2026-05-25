import { useState, useEffect, useCallback, ChangeEvent, useRef } from "react";
import {
    Box,
    Typography,
    Avatar,
    Card,
    CircularProgress,
    Snackbar,
    Alert,
    Divider,
    Tooltip,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    Grid,
    alpha,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { Button, TextField } from "../components/primitives";
import {
    PhotoCamera as PhotoCameraIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Home as HomeIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { PageHeader, PageLayout } from "../components/layout";
import PrimaryActionButton from "../components/reusable/PrimaryActionButton";
import { DetailFieldRow } from "../components/reusable";
import profileService, { ProfileResponse } from "../api/services/profileService";
import { apiBaseUrl } from "../config";
import { colorTokens } from "../tokens/colors";
import { formatShortDate } from "../utils/formatters";

// ─── helpers ────────────────────────────────────────────────────────────────

const toFullUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith("http")) {
        try {
            const url = new URL(path);
            const apiUrl = new URL(apiBaseUrl);
            if (url.hostname !== apiUrl.hostname) return undefined;
            return path;
        } catch {
            return undefined;
        }
    }
    if (path.includes("..") || path.includes("//")) return undefined;
    const root = apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${root}${path}`;
};

const formatRole = (role: string): string =>
    role
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 1.25,
                bgcolor: colorTokens.surface.card,
                borderBottom: "1px solid",
                borderColor: colorTokens.border.default,
            }}
        >
            <Box sx={{ color: colorTokens.text.primary, display: "flex", alignItems: "center" }}>
                {icon}
            </Box>
            <Typography
                variant="subtitle2"
                sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    color: colorTokens.text.secondary,
                    fontSize: "0.82rem",
                }}
            >
                {title}
            </Typography>
        </Box>
    );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

const ProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [fullName, setFullName] = useState("");
    const [nameError, setNameError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [snack, setSnack] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
    const [isModified, setIsModified] = useState(false);
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
        setNameError("");
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
    const handleChangePhoto = () => { handlePhotoMenuClose(); fileInputRef.current?.click(); };

    // ── image upload ───────────────────────────────────────────────────────
    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowedMimeTypes.includes(file.type)) {
            setSnack({ msg: "Please select a valid image file (JPEG, PNG, GIF, or WebP).", severity: "error" });
            return;
        }
        const fileName = file.name.toLowerCase();
        const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
        if (!allowedExtensions.some(ext => fileName.endsWith(ext))) {
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
            if (fileInputRef.current) fileInputRef.current.value = "";
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
            <PageLayout pageBackground maxWidth="lg">
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                    <CircularProgress sx={(theme) => ({ color: theme.palette.primary.main })} />
                </Box>
            </PageLayout>
        );
    }

    if (!profile) {
        return (
            <PageLayout pageBackground maxWidth="lg">
                <Alert severity="error">Unable to load profile. Please try again.</Alert>
            </PageLayout>
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
        <PageLayout
            pageBackground
            maxWidth="lg"
            header={
                <PageHeader
                    links={[
                        { title: "Dashboard", path: "/" },
                        { title: "My Profile", path: "#" },
                    ]}
                    homePath="/"
                />
            }
        >
            <Grid container spacing={2.5} alignItems="stretch">
                {/* ── Left Sidebar: Avatar & Quick Info ── */}
                <Grid item xs={12} md={4} sx={{ display: "flex" }}>
                    <Card
                        variant="outlined"
                        sx={{
                            flex: 1,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            borderRadius: 2,
                            borderColor: colorTokens.border.strong,
                            overflow: "hidden",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                            bgcolor: colorTokens.surface.card,
                        }}
                    >
                        {/* Avatar Section */}
                        <Box
                            sx={{
                                px: 2,
                                py: 2.5,
                                textAlign: "center",
                                background: `linear-gradient(135deg, ${alpha(colorTokens.primary.main, 0.14)} 0%, ${alpha("#10b981", 0.16)} 100%)`,
                                borderBottom: `1px solid ${colorTokens.border.default}`,
                            }}
                        >
                            {/* Avatar with Camera Overlay */}
                            <Box sx={{ position: "relative", display: "inline-block", mb: 1.5 }}>
                                <Avatar
                                    src={avatarSrc}
                                    sx={{
                                        width: 112,
                                        height: 112,
                                        fontSize: 40,
                                        fontWeight: 700,
                                        bgcolor: colorTokens.gray[300],
                                        color: colorTokens.text.primary,
                                        border: "3px solid",
                                        borderColor: "common.white",
                                        boxShadow: 2,
                                    }}
                                >
                                    {!avatarSrc && initials}
                                </Avatar>

                                {/* Active status dot */}
                                <Box
                                    sx={{
                                        position: "absolute",
                                        bottom: 5,
                                        right: 5,
                                        width: 18,
                                        height: 18,
                                        borderRadius: "50%",
                                        bgcolor: profile?.is_active ? "#10b981" : "#ef4444",
                                        border: "3px solid white",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                    }}
                                />

                                {/* Camera hover overlay */}
                                <Tooltip title={profile?.profile_image_path ? "Change or remove photo" : "Upload photo"}>
                                    <Box
                                        onClick={isPhotoLoading ? undefined : handlePhotoButtonClick}
                                        sx={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            borderRadius: "50%",
                                            bgcolor: "rgba(0,0,0,0.45)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            opacity: 0,
                                            transition: "opacity 0.2s ease",
                                            cursor: isPhotoLoading ? "default" : "pointer",
                                            "&:hover": { opacity: 1 },
                                        }}
                                    >
                                        {isPhotoLoading
                                            ? <CircularProgress size={24} sx={{ color: "white" }} />
                                            : <PhotoCameraIcon sx={{ color: "white", fontSize: 24 }} />}
                                    </Box>
                                </Tooltip>
                            </Box>

                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.4, lineHeight: 1.2, color: colorTokens.text.primary }}>
                                {profile?.full_name}
                            </Typography>
                            <Typography variant="caption" sx={{ display: "block", mb: 1.2, color: colorTokens.text.secondary }}>
                                {profile?.email}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
                                <Chip
                                    label={formatRole(profile?.role ?? "")}
                                    size="small"
                                    sx={{
                                        bgcolor: "rgba(26,26,46,0.08)",
                                        color: "#1a1a2e",
                                        fontWeight: 700,
                                        fontSize: "0.7rem",
                                        letterSpacing: "0.3px",
                                        textTransform: "uppercase",
                                        border: "1px solid rgba(26,26,46,0.15)",
                                    }}
                                />
                                <Chip
                                    label={profile?.is_active ? "Active" : "Inactive"}
                                    size="small"
                                    sx={{
                                        bgcolor: profile?.is_active ? "#d1fae5" : "#fee2e2",
                                        color: profile?.is_active ? "#065f46" : "#7f1d1d",
                                        fontWeight: 700,
                                        fontSize: "0.7rem",
                                    }}
                                />
                            </Box>
                        </Box>

                        {/* Quick Info Section */}
                        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.8 }}>
                                <EmailIcon sx={{ fontSize: 18, color: colorTokens.text.secondary }} />
                                <Typography variant="body2" sx={{ color: colorTokens.text.primary, wordBreak: "break-word" }}>
                                    {profile?.email}
                                </Typography>
                            </Box>
                            <Divider sx={{ borderColor: colorTokens.border.default }} />
                            <Box sx={{ display: "flex", gap: 1.2, pt: 1 }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={isPhotoLoading ? <CircularProgress size={13} color="inherit" /> : <PhotoCameraIcon />}
                                    onClick={isPhotoLoading ? undefined : handlePhotoButtonClick}
                                    disabled={isPhotoLoading}
                                    fullWidth
                                    sx={{
                                        borderRadius: 1,
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "0.75rem",
                                    }}
                                >
                                    {uploading ? "Uploading…" : "Upload"}
                                </Button>
                                {profile?.profile_image_path && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={deleting ? <CircularProgress size={13} color="inherit" /> : <DeleteIcon />}
                                        onClick={isPhotoLoading ? undefined : handleDeletePhoto}
                                        disabled={isPhotoLoading}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: "none",
                                            fontWeight: 600,
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        {deleting ? "Removing…" : "Remove"}
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Card>
                </Grid>

                {/* ── Right Content: Edit Form ── */}
                <Grid item xs={12} md={8} sx={{ display: "flex" }}>
                    <Card
                        variant="outlined"
                        sx={{
                            flex: 1,
                            borderRadius: 2,
                            borderColor: colorTokens.border.strong,
                            overflow: "hidden",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                            bgcolor: colorTokens.surface.card,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Profile Section */}
                        <SectionHeader title="Profile Information" icon={<EmailIcon fontSize="small" />} />

                        <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
                            {/* Full Name - Editable */}
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        color: colorTokens.text.secondary,
                                        mb: 0.8,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.4px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.4,
                                    }}
                                >
                                    Full Name <span style={{ color: colorTokens.error.main }}>*</span>
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={fullName}
                                    onChange={handleNameChange}
                                    error={Boolean(nameError)}
                                    helperText={nameError || " "}
                                    placeholder="Enter your full name"
                                    inputProps={{ maxLength: 150 }}
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            bgcolor: colorTokens.background.paper,
                                            borderRadius: 1.25,
                                            fontSize: "0.9rem",
                                            fontWeight: 500,
                                        },
                                    }}
                                />
                            </Box>

                            {/* Email - Read Only */}
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        color: colorTokens.text.secondary,
                                        mb: 0.8,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.4px",
                                    }}
                                >
                                    Email Address
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={profile?.email ?? ""}
                                    disabled
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            bgcolor: colorTokens.gray[50],
                                            borderRadius: 1.25,
                                            fontSize: "0.9rem",
                                        },
                                    }}
                                />
                                <Typography sx={{ fontSize: "0.72rem", color: colorTokens.text.secondary, mt: 0.5, fontWeight: 500 }}>
                                    Email is your unique identifier and cannot be changed
                                </Typography>
                            </Box>

                            {/* Role - Read Only */}
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        color: colorTokens.text.secondary,
                                        mb: 0.8,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.4px",
                                    }}
                                >
                                    Role
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={formatRole(profile?.role ?? "")}
                                    disabled
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            bgcolor: colorTokens.gray[50],
                                            borderRadius: 1.25,
                                            fontSize: "0.9rem",
                                        },
                                    }}
                                />
                                <Typography sx={{ fontSize: "0.72rem", color: colorTokens.text.secondary, mt: 0.5, fontWeight: 500 }}>
                                    Your role is assigned by administrator
                                </Typography>
                            </Box>

                            {/* Account Status - Read Only */}
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        color: colorTokens.text.secondary,
                                        mb: 0.8,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.4px",
                                    }}
                                >
                                    Account Status
                                </Typography>
                                <Box
                                    sx={{
                                        height: 40,
                                        borderRadius: 1.25,
                                        bgcolor: colorTokens.gray[50],
                                        border: `1.2px solid ${colorTokens.border.default}`,
                                        display: "flex",
                                        alignItems: "center",
                                        px: 1.5,
                                        gap: 1,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            bgcolor: profile?.is_active ? "#10b981" : "#ef4444",
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: colorTokens.text.primary }}>
                                        {profile?.is_active ? "Active" : "Inactive"}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        {/* Footer: Save Button */}
                        <Divider sx={{ borderColor: colorTokens.border.default }} />
                        <Box
                            sx={{
                                px: 2.5,
                                py: 2,
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 1,
                                bgcolor: colorTokens.gray[50],
                            }}
                        >
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    setFullName(profile?.full_name ?? "");
                                    setIsModified(false);
                                    setNameError("");
                                }}
                                disabled={!isModified}
                                sx={{ borderRadius: 1 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleSave}
                                disabled={!isModified || saving}
                                sx={{
                                    borderRadius: 1,
                                    bgcolor: colorTokens.success.main,
                                    "&:hover": { bgcolor: colorTokens.success.dark },
                                }}
                            >
                                {saving ? <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} /> : null}
                                {saving ? "Saving…" : "Save Changes"}
                            </Button>
                        </Box>
                    </Card>
                </Grid>
            </Grid>

            {/* ── Hidden file input ── */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageChange}
            />

            {/* ── Photo context menu ── */}
            <Menu
                anchorEl={photoMenuAnchor}
                open={Boolean(photoMenuAnchor)}
                onClose={handlePhotoMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <MenuItem onClick={handleChangePhoto} sx={{ fontSize: "0.875rem", py: 1.2, fontWeight: 600 }}>
                    <ListItemIcon><PhotoCameraIcon fontSize="small" /></ListItemIcon>
                    Change Photo
                </MenuItem>
                <MenuItem onClick={handleDeletePhoto} sx={{ color: colorTokens.error.main, fontSize: "0.875rem", py: 1.2, fontWeight: 600 }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    Remove Photo
                </MenuItem>
            </Menu>

            {/* ── Snackbar ── */}
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
                    sx={{
                        width: "100%",
                        borderRadius: 1.25,
                        fontWeight: 600,
                    }}
                >
                    {snack?.msg}
                </Alert>
            </Snackbar>
        </PageLayout>
    );
};

export default ProfilePage;
