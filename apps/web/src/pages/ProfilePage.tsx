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
import profileService, { ProfileResponse } from "../api/services/profileService";
import { apiBaseUrl } from "../config";

// ─── helpers ────────────────────────────────────────────────────────────────

const toFullUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    const root = apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${root}${path}`;
};

const formatRole = (role: string): string =>
    role
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

// ─── ReadOnlyField ────────────────────────────────────────────────────────────

interface ReadOnlyFieldProps {
    label: string;
    value: string;
    icon?: React.ReactNode;
    helperText?: string;
}

const ReadOnlyField = ({ label, value, icon, helperText }: ReadOnlyFieldProps) => (
    <Box>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
            {label}
        </Typography>
        {helperText && (
            <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                — {helperText}
            </Typography>
        )}
        <TextField
            fullWidth
            value={value}
            disabled
            size="small"
            sx={{
                mt: 0.5,
                "& .MuiInputBase-input.Mui-disabled": {
                    WebkitTextFillColor: "rgba(0,0,0,0.75)",
                    cursor: "default",
                },
                "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(0,0,0,0.1)",
                },
                bgcolor: "#f5f5f5",
                borderRadius: 1,
            }}
            InputProps={icon ? { endAdornment: <InputAdornment position="end">{icon}</InputAdornment> } : undefined}
        />
    </Box>
);

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
            console.error("Profile fetch error:", err);
            setSnack({ msg: "Unable to load profile data. Please refresh.", severity: "error" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // ── name change ────────────────────────────────────────────────────────
    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFullName(val);
        setIsModified(val !== (profile?.full_name ?? ""));
        setNameError(val.trim().length < 2 ? "Please enter Full Name (minimum 2 characters)." : "");
    };

    // ── save ───────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (fullName.trim().length < 2) {
            setNameError("Please enter Full Name.");
            return;
        }
        setSaving(true);
        try {
            const updated = await profileService.updateProfile({ full_name: fullName.trim() });
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

    // ── discard ────────────────────────────────────────────────────────────
    const handleDiscard = () => {
        setFullName(profile?.full_name ?? "");
        setIsModified(false);
        setNameError("");
    };

    // ── photo menu ─────────────────────────────────────────────────────────
    const handlePhotoButtonClick = (e: React.MouseEvent<HTMLElement>) => {
        if (profile?.profile_image_path) {
            // Has photo → show menu with Change / Delete options
            setPhotoMenuAnchor(e.currentTarget);
        } else {
            // No photo → directly open file picker
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

        if (!file.type.startsWith("image/")) {
            setSnack({ msg: "Please select a valid image file.", severity: "error" });
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
        <Box sx={{ maxWidth: 780, mx: "auto", py: 3, px: { xs: 2, md: 0 } }}>
            {/* ── Page header ── */}
            <Typography variant="h5" fontWeight={700} gutterBottom>
                My Profile
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                View and manage your account information.
            </Typography>

            {/* ── Avatar card ── */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    flexWrap: "wrap",
                }}
            >
                {/* Avatar + camera button */}
                <Box sx={{ position: "relative", flexShrink: 0 }}>
                    <Avatar
                        src={avatarSrc}
                        sx={{
                            width: 100,
                            height: 100,
                            fontSize: 36,
                            fontWeight: 700,
                            bgcolor: "primary.main",
                            border: "3px solid",
                            borderColor: "primary.light",
                        }}
                    >
                        {!avatarSrc && initials}
                    </Avatar>

                    {/* Camera / loading button */}
                    <Tooltip title={profile?.profile_image_path ? "Change or remove photo" : "Upload profile photo"}>
                        <Box
                            onClick={isPhotoLoading ? undefined : handlePhotoButtonClick}
                            sx={{
                                position: "absolute",
                                bottom: 0,
                                right: 0,
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                bgcolor: isPhotoLoading ? "grey.400" : "primary.main",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: isPhotoLoading ? "default" : "pointer",
                                border: "2px solid white",
                                "&:hover": { bgcolor: isPhotoLoading ? "grey.400" : "primary.dark" },
                                transition: "background-color 0.2s",
                            }}
                        >
                            {isPhotoLoading ? (
                                <CircularProgress size={16} sx={{ color: "white" }} />
                            ) : (
                                <PhotoCameraIcon sx={{ fontSize: 16, color: "white" }} />
                            )}
                        </Box>
                    </Tooltip>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        style={{ display: "none" }}
                        onChange={handleImageChange}
                    />

                    {/* Photo options menu (shown only when photo exists) */}
                    <Menu
                        anchorEl={photoMenuAnchor}
                        open={Boolean(photoMenuAnchor)}
                        onClose={handlePhotoMenuClose}
                        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                        transformOrigin={{ vertical: "top", horizontal: "center" }}
                        PaperProps={{ sx: { mt: 1, minWidth: 180, borderRadius: 2, boxShadow: 3 } }}
                    >
                        <MenuItem onClick={handleChangePhoto}>
                            <ListItemIcon>
                                <AddAPhotoIcon fontSize="small" color="primary" />
                            </ListItemIcon>
                            <Typography variant="body2" fontWeight={500}>
                                Change Photo
                            </Typography>
                        </MenuItem>
                        <MenuItem onClick={handleDeletePhoto} sx={{ color: "error.main" }}>
                            <ListItemIcon>
                                <DeleteIcon fontSize="small" color="error" />
                            </ListItemIcon>
                            <Typography variant="body2" fontWeight={500} color="error.main">
                                Delete Photo
                            </Typography>
                        </MenuItem>
                    </Menu>
                </Box>

                {/* Name + badges */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={700} noWrap>
                        {profile?.full_name ?? "—"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                        {profile?.email ?? "—"}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Chip
                            icon={<ShieldIcon sx={{ fontSize: "14px !important" }} />}
                            label={formatRole(profile?.role ?? "")}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: 11 }}
                        />
                        <Chip
                            icon={
                                profile?.is_active ? (
                                    <CheckCircleIcon sx={{ fontSize: "14px !important" }} />
                                ) : (
                                    <CancelIcon sx={{ fontSize: "14px !important" }} />
                                )
                            }
                            label={profile?.is_active ? "Active" : "Inactive"}
                            size="small"
                            color={profile?.is_active ? "success" : "error"}
                            sx={{ fontWeight: 600, fontSize: 11 }}
                        />
                    </Box>
                </Box>
            </Paper>

            {/* ── General Information card ── */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    overflow: "hidden",
                }}
            >
                <Box sx={{ px: 3, py: 2, bgcolor: "grey.50", display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon color="primary" fontSize="small" />
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                            General Information
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Only Full Name can be edited. Other fields are read-only.
                        </Typography>
                    </Box>
                </Box>
                <Divider />

                <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
                    {/* Full Name — EDITABLE */}
                    <Box>
                        <Typography
                            variant="caption"
                            fontWeight={600}
                            color="text.secondary"
                            sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}
                        >
                            Full Name
                            <EditIcon sx={{ fontSize: 12, color: "primary.main" }} />
                            <Typography component="span" variant="caption" color="error.main">
                                *
                            </Typography>
                        </Typography>
                        <TextField
                            fullWidth
                            value={fullName}
                            onChange={handleNameChange}
                            error={Boolean(nameError)}
                            helperText={nameError || (isModified ? "Unsaved changes" : " ")}
                            FormHelperTextProps={{
                                sx: { color: nameError ? "error.main" : isModified ? "warning.main" : "transparent" },
                            }}
                            size="small"
                            placeholder="Enter your full name"
                            sx={{ mt: 0.5 }}
                            inputProps={{ maxLength: 150 }}
                        />
                    </Box>

                    {/* Email — READ ONLY */}
                    <ReadOnlyField
                        label="Email Address"
                        value={profile?.email ?? ""}
                        helperText="read-only"
                        icon={<EmailIcon fontSize="small" color="disabled" />}
                    />

                    {/* Role — READ ONLY */}
                    <ReadOnlyField
                        label="Role"
                        value={formatRole(profile?.role ?? "")}
                        helperText="read-only"
                        icon={<ShieldIcon fontSize="small" color="primary" />}
                    />

                    {/* Account Status — READ ONLY */}
                    <Box>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Account Status
                            <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                                — read-only
                            </Typography>
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                            <Chip
                                icon={
                                    profile?.is_active ? (
                                        <CheckCircleIcon sx={{ fontSize: "14px !important" }} />
                                    ) : (
                                        <CancelIcon sx={{ fontSize: "14px !important" }} />
                                    )
                                }
                                label={profile?.is_active ? "Active" : "Inactive"}
                                color={profile?.is_active ? "success" : "error"}
                                sx={{ fontWeight: 700 }}
                            />
                        </Box>
                    </Box>
                </Box>

                <Divider />

                {/* Action buttons */}
                <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "flex-end", gap: 2, bgcolor: "grey.50" }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleDiscard}
                        disabled={!isModified || saving}
                        sx={{ borderColor: "divider" }}
                    >
                        Discard
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!isModified || saving || Boolean(nameError)}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ px: 4, borderRadius: 2, minWidth: 140 }}
                    >
                        {saving ? "Saving…" : "Save Changes"}
                    </Button>
                </Box>
            </Paper>

            {/* ── Snackbar ── */}
            <Snackbar
                open={Boolean(snack)}
                autoHideDuration={5000}
                onClose={() => setSnack(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnack(null)}
                    severity={snack?.severity ?? "info"}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snack?.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProfilePage;
