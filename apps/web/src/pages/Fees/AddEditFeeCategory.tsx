import { useState, useEffect } from "react";
import {
    Box,
    Paper,
    Typography,
    Alert,
    CircularProgress,
    IconButton,
    Tooltip,
    Switch,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { TextField } from "../../components/primitives";
import { SaveButton, CancelButton } from "../../components/semantic";
import {
    Home as HomeIcon,
    Category as CategoryIcon,
    ErrorOutline as ErrorIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common";
import { createFeeCategory, updateFeeCategory, getFeeCategory } from "../../api/services/feeService";
import type { FeeCategoryCreate, FeeCategoryResponse } from "../../types/fee";
import { ListPageLayout, FormSectionLabel, FieldLabel } from "../../components/reusable";

const buildFieldSx = (hasError: boolean) => (theme: Theme) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: 1,
        bgcolor: theme.palette.background.paper,
        fontSize: "0.875rem",
        fontWeight: 500,
        "& fieldset": { borderColor: hasError ? theme.palette.error.main : theme.palette.divider, borderWidth: hasError ? "1.5px" : "1.2px" },
        "&:hover fieldset": { borderColor: hasError ? theme.palette.error.main : theme.palette.grey[400] },
        "&.Mui-focused": {
            "& fieldset": { borderColor: hasError ? theme.palette.error.main : theme.palette.primary.main, borderWidth: "1.8px" },
        },
        "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: theme.palette.grey[500] },
    },
    "& .MuiFormHelperText-root": { fontSize: "0.7rem", mt: 0.3, ml: 0 },
});

const AddEditFeeCategory = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState<FeeCategoryCreate>({
        name: "",
        status: true,
    });

    useEffect(() => {
        if (isEditMode && id) {
            setFetchLoading(true);
            getFeeCategory(id)
                .then((data: FeeCategoryResponse) => {
                    setFormData({
                        name: data.name || "",
                        status: !!data.status,
                    });
                })
                .catch(() => setError("Failed to load category."))
                .finally(() => setFetchLoading(false));
        }
    }, [id, isEditMode]);

    const validateField = (name: string, value: any) => {
        let e = "";
        if (name === "name") {
            if (!value) e = "Required.";
            else if (value.length < 3) e = "Min 3 characters.";
        }
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        const v = name === "status" ? checked : value;
        setFormData((prev) => ({ ...prev, [name]: v }));
        setErrors((prev) => ({ ...prev, [name]: validateField(name, v) }));
    };

    const validateForm = () => {
        const fields = ["name"];
        const newErrors: Record<string, string> = {};
        fields.forEach((f) => {
            const e = validateField(f, formData[f as keyof FeeCategoryCreate]);
            if (e) newErrors[f] = e;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoading(true);
        setError(null);
        try {
            if (isEditMode && id) {
                await updateFeeCategory(id, formData);
                setSuccess("Category updated successfully!");
            } else {
                await createFeeCategory(formData);
                setSuccess("Category created successfully!");
            }
            setTimeout(() => navigate("/fees/categories"), 1000);
        } catch (err: any) {
            setError(err?.message || (isEditMode ? "Failed to update category." : "Failed to create category."));
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading)
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress sx={{ color: "#1a1a2e" }} />
            </Box>
        );

    return (
        <ListPageLayout
            pageBackground={true}
            contentPaddingSize="none"
            header={
                <>
                    <PageHeader
                        onBack={() => navigate("/fees/categories")}
                        backIcon={<HomeIcon sx={{ color: "white", fontSize: 24 }} />}
                        title={
                            <>
                                <Box
                                    component="span"
                                    onClick={() => navigate("/fees/categories")}
                                    sx={(theme) => ({
                                        color: theme.palette.text.secondary,
                                        cursor: "pointer",
                                        "&:hover": { color: theme.palette.text.primary },
                                    })}
                                >
                                    Categories
                                </Box>
                                <Box component="span" sx={{ color: "#cbd5e1", mx: 1.5 }}>
                                    /
                                </Box>
                                {isEditMode ? "Edit Fee Category" : "Add Fee Category"}
                            </>
                        }
                        actions={
                            <>
                                <Tooltip title="Cancel">
                                    <IconButton
                                        onClick={() => navigate("/fees/categories")}
                                        sx={(theme) => ({
                                            color: theme.palette.error.main,
                                            backgroundColor: theme.palette.error.light,
                                            borderRadius: 1.2,
                                            width: 40,
                                            height: 40,
                                            "&:hover": { backgroundColor: theme.palette.error.light },
                                        })}
                                    >
                                        <CancelIcon sx={{ fontSize: 22 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={isEditMode ? "Update Category" : "Save Category"}>
                                    <span>
                                        <IconButton
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            sx={(theme) => ({
                                                backgroundColor: theme.palette.success.main,
                                                color: theme.palette.success.contrastText,
                                                borderRadius: 1.2,
                                                width: 40,
                                                height: 40,
                                                "&:hover": { backgroundColor: theme.palette.success.dark },
                                                "&.Mui-disabled": {
                                                    backgroundColor: theme.palette.grey[400],
                                                    color: "white",
                                                },
                                            })}
                                        >
                                            {loading ? (
                                                <CircularProgress size={20} color="inherit" />
                                            ) : (
                                                <SaveIcon sx={{ fontSize: 20 }} />
                                            )}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </>
                        }
                    />
                    {error && (
                        <Alert
                            severity="error"
                            icon={<ErrorIcon />}
                            sx={{ mb: 1, borderRadius: "8px", py: 0.3 }}
                            onClose={() => setError(null)}
                        >
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ mb: 1, borderRadius: "8px", py: 0.3 }}>
                            {success}
                        </Alert>
                    )}
                </>
            }
        >
            <Box sx={{ flex: 1, overflowY: "auto", pb: 2, pr: 0.5 }}>
                <Paper
                    elevation={0}
                    sx={(theme) => ({
                        borderRadius: 1.25,
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.background.paper,
                        overflow: "hidden",
                    })}
                >
                    {/* Dark header */}
                    <Box
                        sx={{
                            py: 1,
                            px: { xs: 2, md: 3 },
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            bgcolor: "#1a1a2e",
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: "0.75rem",
                                color: "rgba(255,255,255,0.7)",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                            }}
                        >
                            {isEditMode ? "Edit Fee Category Details" : "New Fee Category Details"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                            <Box component="span" sx={(theme) => ({ color: theme.palette.error.light })}>
                                *
                            </Box>{" "}
                            required fields
                        </Typography>
                    </Box>

                    {/* Form body */}
                    <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: 2 }}>
                        <FormSectionLabel
                            icon={<CategoryIcon sx={{ fontSize: 15 }} />}
                            title="Category Information"
                        />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                            <Box>
                                <FieldLabel required>Category Name</FieldLabel>
                                <TextField
                                    fullWidth
                                    size="small"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Tuition"
                                    error={Boolean(errors.name)}
                                    helperText={errors.name}
                                    inputProps={{ maxLength: 255 }}
                                    sx={buildFieldSx(Boolean(errors.name))}
                                />
                            </Box>
                            {/* Code and Description fields removed as per requirements */}
                            <Box
                                sx={(theme) => ({
                                    gridColumn: "1 / -1",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    px: 1.5,
                                    py: 0.8,
                                    borderRadius: 1,
                                    border: `1.2px solid ${theme.palette.divider}`,
                                    bgcolor: theme.palette.grey[50],
                                })}
                            >
                                <Box>
                                    <Typography
                                        sx={(theme) => ({
                                            fontSize: "0.82rem",
                                            fontWeight: 700,
                                            color: theme.palette.text.primary,
                                        })}
                                    >
                                        Status
                                    </Typography>
                                    <Typography
                                        sx={(theme) => ({
                                            fontSize: "0.7rem",
                                            color: theme.palette.text.secondary,
                                        })}
                                    >
                                        Active categories are available for use
                                    </Typography>
                                </Box>
                                <Switch
                                    checked={!!formData.status}
                                    onChange={handleChange}
                                    name="status"
                                    size="small"
                                    sx={(theme) => ({
                                        "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.success.main },
                                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                            bgcolor: theme.palette.success.main,
                                        },
                                    })}
                                />
                            </Box>
                        </Box>
                    </Box>

                    {/* Footer */}
                    <Box
                        sx={(theme) => ({
                            px: { xs: 2, md: 3 },
                            py: 1.2,
                            borderTop: `1px solid ${theme.palette.divider}`,
                            bgcolor: theme.palette.grey[50],
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: 0,
                        })}
                    >
                        <CancelButton
                            onClick={() => navigate("/fees/categories")}
                            sx={{
                                color: "#ef4444",
                                backgroundColor: "transparent",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                                px: 4,
                                borderRadius: 0,
                                minWidth: 120,
                                boxShadow: "none",
                                border: "none",
                                textTransform: "none",
                                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                            }}
                        >
                            Cancel
                        </CancelButton>
                        <SaveButton
                            onClick={loading ? undefined : handleSubmit}
                            disabled={loading}
                            loading={loading}
                            sx={(theme) => ({
                                color: theme.palette.success.main,
                                backgroundColor: "transparent",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                                px: 4,
                                borderRadius: 0,
                                minWidth: 120,
                                boxShadow: "none",
                                border: "none",
                                textTransform: "none",
                                "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                                "&.Mui-disabled": { color: theme.palette.text.secondary },
                            })}
                        >
                            {loading ? "Saving…" : isEditMode ? "Update" : "Save"}
                        </SaveButton>
                    </Box>
                </Paper>
            </Box>
        </ListPageLayout>
    );
};

export default AddEditFeeCategory;
