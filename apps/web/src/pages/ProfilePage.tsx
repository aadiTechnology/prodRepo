import { useState, useEffect, useCallback, ChangeEvent, useRef } from "react";
import {
    Box,
    Typography,
    Avatar,
    Paper,
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
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { Button, TextField } from "../components/primitives";
import { SaveButton, EmailInput } from "../components/semantic";
import {
    PhotoCamera as PhotoCameraIcon,
    AddAPhoto as AddAPhotoIcon,
    Delete as DeleteIcon,
    Home as HomeIcon,
    Save as SaveIcon,
    Person as PersonIcon,
    Email as EmailIcon,
    Badge as BadgeIcon,
    VerifiedUser as VerifiedUserIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/common";
import profileService, { ProfileResponse } from "../api/services/profileService";
import { apiBaseUrl } from "../config";

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

// ─── reusable label ───────────────────────────────────────────────────────────

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <Typography
        sx={(theme) => ({
            fontSize: "0.78rem",
            fontWeight: 700,
            color: theme.palette.text.secondary,
            mb: 0.8,
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            display: "flex",
            alignItems: "center",
            gap: 0.4,
        })}
    >
        {children}
        {required && (
            <Typography component="span" sx={(theme) => ({ color: theme.palette.error.main, fontSize: "0.85rem", lineHeight: 1 })}>
                *
            </Typography>
        )}
    </Typography>
);

// ─── shared TextField sx ──────────────────────────────────────────────────────

const editableSx = (theme: Theme) => ({
    "& .MuiOutlinedInput-root": {
        bgcolor: theme.palette.background.paper,
        borderRadius: 1.25,
        fontSize: "0.9rem",
        fontWeight: 500,
        "& fieldset": { borderColor: theme.palette.divider, borderWidth: "1.2px" },
        "&:hover fieldset": { borderColor: theme.palette.grey[400] },
        "&.Mui-focused": {
            boxShadow: theme.shadows[2],
            "& fieldset": { borderColor: theme.palette.primary.main, borderWidth: "1.8px" },
        },
        "&.Mui-error fieldset": { borderColor: theme.palette.error.main },
    },
    "& .MuiFormHelperText-root": { fontSize: "0.74rem", mt: 0.5 },
});

const readonlySx = (theme: Theme) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: 1.25,
        bgcolor: theme.palette.grey[50],
        fontSize: "0.9rem",
        fontWeight: 500,
        "& fieldset": { borderColor: theme.palette.divider },
        "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: theme.palette.grey[600] },
    },
});

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

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

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
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress sx={(theme) => ({ color: theme.palette.primary.main })} />
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
        <Box sx={{ px: { xs: 1.5, sm: 2, md: 4 }, pb: 2, display: "flex", flexDirection: "column" }}>
            {/* ── Page Header ── */}
            <PageHeader
                title="My Profile"
                onBack={() => navigate("/")}
                backIcon={<HomeIcon sx={{ color: "white", fontSize: 24 }} />}
                actions={
                    <Tooltip title="Save Profile Changes">
                        <span>
                            <IconButton
                                onClick={handleSave}
                                disabled={!isModified || saving}
                                sx={(theme) => ({
                                    backgroundColor: "#10b981",
                                    color: "white",
                                    borderRadius: 1.2,
                                    width: 44,
                                    height: 44,
                                    boxShadow: (!isModified || saving) ? "none" : theme.shadows[4],
                                    "&:hover": {
                                        backgroundColor: "success.dark",
                                        transform: (!isModified || saving) ? "none" : "translateY(-1px)",
                                    },
                                    "&.Mui-disabled": { backgroundColor: "grey.400", color: "white" },
                                })}
                            >
                                {saving ? <CircularProgress size={22} color="inherit" /> : <SaveIcon sx={{ fontSize: 22 }} />}
                            </IconButton>
                        </span>
                    </Tooltip>
                }
            />

            {/* ── Single unified Paper ── */}
            <Paper
                elevation={0}
                sx={(theme) => ({
                    mt: 1,
                    borderRadius: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.paper,
                    overflow: "hidden",
                    boxShadow: theme.shadows[1],
                    display: "flex",
                    flexDirection: "column",
                })}
            >
                {/* ── Dark header bar (matches TenantList) ── */}
                <Box
                    sx={{
                        py: 1.2,
                        px: 3,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        bgcolor: "#1a1a2e",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "0.78rem",
                            color: "rgba(255,255,255,0.7)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                        }}
                    >
                        Profile Information
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                        Only Full Name can be edited
                    </Typography>
                </Box>

                {/* ── Avatar + identity row ── */}
                <Box
                    sx={(theme) => ({
                        px: { xs: 2.5, md: 4 },
                        py: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        flexWrap: "wrap",
                    })}
                >
                    {/* Avatar with camera overlay */}
                    <Box sx={{ position: "relative", flexShrink: 0 }}>
                        <Avatar
                            src={avatarSrc}
                            sx={(theme) => ({
                                width: 90,
                                height: 90,
                                fontSize: 30,
                                fontWeight: 700,
                                bgcolor: theme.palette.grey[300],
                                color: theme.palette.text.primary,
                                border: `3px solid ${theme.palette.grey[200]}`,
                                boxShadow: theme.shadows[2],
                            })}
                        >
                            {!avatarSrc && initials}
                        </Avatar>

                        {/* Active status dot */}
                        <Box
                            sx={{
                                position: "absolute",
                                bottom: 5,
                                right: 5,
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                bgcolor: profile?.is_active ? "#10b981" : "#ef4444",
                                border: "2.5px solid white",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                            }}
                        />

                        {/* Camera hover overlay */}
                        <Tooltip title={profile?.profile_image_path ? "Change or remove photo" : "Upload photo"}>
                            <Box
                                onClick={isPhotoLoading ? undefined : handlePhotoButtonClick}
                                sx={{
                                    position: "absolute",
                                    top: 0, left: 0, right: 0, bottom: 0,
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
                                    ? <CircularProgress size={20} sx={{ color: "white" }} />
                                    : <PhotoCameraIcon sx={{ color: "white", fontSize: 20 }} />}
                            </Box>
                        </Tooltip>
                    </Box>

                    {/* Name / email / badges */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={(theme) => ({ fontWeight: 700, fontSize: "1.1rem", color: theme.palette.text.primary, mb: 0.3 })}>
                            {profile?.full_name ?? "—"}
                        </Typography>
                        <Typography sx={(theme) => ({ fontSize: "0.85rem", color: theme.palette.text.secondary, mb: 1.2, fontWeight: 500 })}>
                            {profile?.email ?? "—"}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
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
                                    borderRadius: "6px",
                                    height: 22,
                                }}
                            />
                            <Box
                                sx={(theme) => ({
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.7,
                                    px: 1.2,
                                    py: 0.3,
                                    borderRadius: "20px",
                                    bgcolor: profile?.is_active ? theme.palette.success.light : theme.palette.error.light,
                                    color: profile?.is_active ? theme.palette.success.dark : theme.palette.error.dark,
                                    border: `1px solid ${profile?.is_active ? theme.palette.success.main : theme.palette.error.main}`,
                                })}
                            >
                                <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "currentColor" }} />
                                <Typography sx={{ fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    {profile?.is_active ? "Active" : "Inactive"}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Photo action buttons */}
                    <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", alignItems: "center" }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={isPhotoLoading ? <CircularProgress size={13} color="inherit" /> : <PhotoCameraIcon />}
                            onClick={isPhotoLoading ? undefined : handlePhotoButtonClick}
                            disabled={isPhotoLoading}
                            sx={(theme) => ({
                                borderRadius: 1,
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "0.82rem",
                                borderColor: theme.palette.primary.main,
                                color: theme.palette.text.primary,
                                px: 2,
                                "&:hover": { borderColor: theme.palette.primary.main, bgcolor: theme.palette.action.hover },
                            })}
                        >
                            {uploading ? "Uploading…" : "Upload Photo"}
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
                                    borderRadius: "8px",
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                    px: 2,
                                }}
                            >
                                {deleting ? "Removing…" : "Remove Photo"}
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* ── Form fields ── */}
                <Box
                    sx={{
                        px: { xs: 2.5, md: 4 },
                        py: 3,
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        gap: { xs: 2.5, sm: 3 },
                    }}
                >
                    {/* Full Name — editable */}
                    <Box>
                        <FieldLabel required>Full Name</FieldLabel>
                        <TextField
                            fullWidth
                            size="small"
                            value={fullName}
                            onChange={handleNameChange}
                            error={Boolean(nameError)}
                            helperText={nameError || " "}
                            placeholder="Enter your full name"
                            inputProps={{ maxLength: 255 }}
                            sx={editableSx}
                        />
                    </Box>

                    {/* Email — read only */}
                    <Box>
                        <FieldLabel>Email Address</FieldLabel>
                        <EmailInput
                            fullWidth
                            size="small"
                            value={profile?.email ?? ""}
                            disabled
                            sx={readonlySx}
                        />
                        <Typography sx={(theme) => ({ fontSize: "0.72rem", color: theme.palette.text.secondary, mt: 0.5, fontWeight: 500 })}>
                            Email cannot be changed
                        </Typography>
                    </Box>

                    {/* Role — read only */}
                    <Box>
                        <FieldLabel>Role</FieldLabel>
                        <TextField
                            fullWidth
                            size="small"
                            value={formatRole(profile?.role ?? "")}
                            disabled
                            sx={readonlySx}
                        />
                        <Typography sx={(theme) => ({ fontSize: "0.72rem", color: theme.palette.text.secondary, mt: 0.5, fontWeight: 500 })}>
                            Role is assigned by admin
                        </Typography>
                    </Box>

                    {/* Account Status — read only styled field */}
                    <Box>
                        <FieldLabel>Account Status</FieldLabel>
                        <Box
                            sx={(theme) => ({
                                height: 37,
                                borderRadius: 1.25,
                                bgcolor: theme.palette.grey[50],
                                border: `1.2px solid ${theme.palette.divider}`,
                                display: "flex",
                                alignItems: "center",
                                px: 1.5,
                                gap: 1,
                            })}
                        >
                            <Box
                                sx={(theme) => ({
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    bgcolor: profile?.is_active ? theme.palette.success.main : theme.palette.error.main,
                                    flexShrink: 0,
                                })}
                            />
                            <Typography
                                sx={(theme) => ({
                                    fontSize: "0.88rem",
                                    fontWeight: 600,
                                    color: profile?.is_active ? theme.palette.success.dark : theme.palette.error.dark,
                                })}
                            >
                                {profile?.is_active ? "Active" : "Inactive"}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* ── Footer hint bar ── */}
                <Box
                    sx={(theme) => ({
                        px: { xs: 2.5, md: 4 },
                        py: 1.5,
                        borderTop: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.grey[50],
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1,
                    })}
                >
                    <Typography sx={(theme) => ({ fontSize: "0.77rem", color: theme.palette.text.secondary, fontWeight: 500 })}>
                        JPG, PNG, GIF or WebP · max 5 MB · Click avatar to change photo
                    </Typography>
                    <SaveButton
                        variant="contained"
                        size="small"
                        onClick={handleSave}
                        disabled={!isModified || saving}
                        loading={saving}
                        sx={(theme) => ({
                            bgcolor: theme.palette.success.main,
                            color: theme.palette.success.contrastText,
                            borderRadius: 1,
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            px: 2.5,
                            boxShadow: "none",
                            "&:hover": { bgcolor: theme.palette.success.dark, boxShadow: "none" },
                            "&.Mui-disabled": { bgcolor: theme.palette.grey[300], color: theme.palette.text.secondary },
                        })}
                    >
                        {saving ? "Saving…" : "Save Changes"}
                    </SaveButton>
                </Box>
            </Paper>

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
                PaperProps={{
                    sx: (theme) => ({
                        mt: 1,
                        borderRadius: 1.25,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: theme.shadows[4],
                        minWidth: 170,
                    }),
                }}
            >
                <MenuItem onClick={handleChangePhoto} sx={{ fontSize: "0.875rem", py: 1.2, fontWeight: 600 }}>
                    <ListItemIcon><AddAPhotoIcon fontSize="small" sx={(theme) => ({ color: theme.palette.text.primary })} /></ListItemIcon>
                    Change Photo
                </MenuItem>
                <MenuItem onClick={handleDeletePhoto} sx={{ color: "error.main", fontSize: "0.875rem", py: 1.2, fontWeight: 600 }}>
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
                    sx={(theme) => ({
                        width: "100%",
                        borderRadius: 1.25,
                        boxShadow: theme.shadows[4],
                        fontWeight: 600,
                    })}
                >
                    {snack?.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProfilePage;
