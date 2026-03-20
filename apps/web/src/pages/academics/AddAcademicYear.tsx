import { useState, useEffect, useCallback } from "react";
import { Box, Typography, Alert, CircularProgress, IconButton, Tooltip, Switch, alpha } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { Save as SaveIcon, Cancel as CancelIcon } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import { TextField, Button } from "../../components/primitives";
import academicYearService, { AcademicYear } from "../../api/services/academicYearService";
import { colorTokens } from "../../tokens/colors";

const buildFieldSx = (hasError: boolean) => (theme: Theme) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: "12px",
        bgcolor: "#ffffff",
        fontSize: "0.875rem",
        fontWeight: 500,
        transition: "all 0.2s ease-in-out",
        "& fieldset": {
            borderColor: hasError ? colorTokens.preschool.coral.main : colorTokens.border.subtle,
            borderWidth: "1.5px"
        },
        "&:hover fieldset": {
            borderColor: hasError ? colorTokens.preschool.coral.main : colorTokens.preschool.turquoise.main
        },
        "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(colorTokens.preschool.turquoise.main, 0.1)}`,
            "& fieldset": {
                borderColor: colorTokens.preschool.turquoise.main,
                borderWidth: "2px"
            },
        },
        "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: theme.palette.grey[500] },
    },
    "& .MuiInputLabel-root": {
        fontSize: "0.875rem",
        fontWeight: 500,
        color: alpha(colorTokens.text.primary, 0.6),
        "&.Mui-focused": {
            color: colorTokens.preschool.turquoise.dark,
        },
    },
    "& .MuiFormLabel-asterisk": {
        color: `${colorTokens.preschool.coral.main} !important`,
    },
    "& .MuiFormHelperText-root": { fontSize: "0.75rem", mt: 0.5, ml: 1, fontWeight: 500 },
});

const AddAcademicYear = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id && id !== "new");

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        start_date: "",
        end_date: "",
        is_active: true,
    });
    const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);

    const fetchAcademicYear = useCallback(async () => {
        if (!id || id === "new") return;
        try {
            setFetchLoading(true);
            const data = await academicYearService.getById(Number(id));
            const d = {
                name: data.name || "",
                code: data.code || "",
                start_date: data.start_date || "",
                end_date: data.end_date || "",
                is_active: data.is_active,
            };
            setFormData(d);
            setInitialFormData(d);
        } catch (err: any) {
            setError(err?.message || "Failed to load academic year.");
        } finally {
            setFetchLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isEditMode) fetchAcademicYear();
    }, [fetchAcademicYear, isEditMode]);

    const validateField = (name: string, value: any) => {
        let e = "";
        if (name === "name") {
            if (!value) e = "Required.";
            else if (value.trim().length < 2) e = "Min 2 characters.";
        } else if (name === "code") {
            if (!value) e = "Required.";
            else if (value.trim().length < 2) e = "Min 2 characters.";
        } else if (name === "start_date") {
            if (!value) e = "Required.";
        } else if (name === "end_date") {
            if (!value) e = "Required.";
        }
        return e;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        const v = type === "checkbox" || name === "is_active" ? checked : value;
        setFormData(prev => ({ ...prev, [name]: v }));
        setErrors(prev => ({ ...prev, [name]: validateField(name, v) }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        ["name", "code", "start_date", "end_date"].forEach(f => {
            const e = validateField(f, formData[f as keyof typeof formData]);
            if (e) newErrors[f] = e;
        });

        // Date range validation
        if (formData.start_date && formData.end_date) {
            if (new Date(formData.end_date) <= new Date(formData.start_date)) {
                newErrors.end_date = "End date must be after start date.";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoading(true);
        setError(null);
        try {
            if (isEditMode && id && id !== "new") {
                await academicYearService.update(Number(id), formData);
                setSuccess("Academic Year updated successfully!");
            } else {
                await academicYearService.create(formData);
                setSuccess("Academic Year created successfully!");
            }
            setTimeout(() => navigate("/academic-years"), 1500);
        } catch (err: any) {
            console.error("Save error:", err);
            setError(err?.message || (isEditMode ? "Failed to update academic year." : "Failed to create academic year."));
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
            <CircularProgress sx={{ color: colorTokens.preschool.turquoise.main }} />
        </Box>
    );

    return (
        <ListPageLayout
            pageBackground={true}
            contentPaddingSize="none"
            contentSx={{ maxWidth: 1100, mx: "auto", width: "100%", height: "auto" }}
            header={
                <Box sx={{ mb: 2 }}>
                    <PageHeader
                        links={[
                            { title: "Academic Years", path: "/academic-years" },
                            { title: isEditMode ? "Edit Academic Year" : "Add Academic Year", path: "#" },
                        ]}
                        homePath="/"
                        actions={
                            <Box sx={{ display: "flex", gap: 1.5 }}>
                                <Tooltip title="Discard Changes">
                                    <IconButton
                                        onClick={() => navigate("/academic-years")}
                                        sx={{
                                            color: colorTokens.preschool.coral.main,
                                            backgroundColor: alpha(colorTokens.preschool.coral.main, 0.08),
                                            borderRadius: "12px",
                                            width: 44,
                                            height: 44,
                                            border: `1.5px solid ${alpha(colorTokens.preschool.coral.main, 0.2)}`,
                                            "&:hover": { backgroundColor: alpha(colorTokens.preschool.coral.main, 0.15) },
                                        }}
                                    >
                                        <CancelIcon sx={{ fontSize: 22 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={isEditMode ? "Update Changes" : "Finish & Create"}>
                                    <IconButton
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        sx={{
                                            background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                                            color: "white",
                                            borderRadius: "12px",
                                            width: 44,
                                            height: 44,
                                            boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
                                            "&:hover": {
                                                transform: "translateY(-2px)",
                                                boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.4)}`,
                                            },
                                            "&.Mui-disabled": { background: "#e2e8f0", color: "#94a3b8" },
                                        }}
                                    >
                                        {loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon sx={{ fontSize: 20 }} />}
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        }
                    />
                    {error && (
                        <Alert severity="error" variant="filled" sx={{ mt: 2, borderRadius: "12px" }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" variant="filled" sx={{ mt: 2, borderRadius: "12px" }}>
                            {success}
                        </Alert>
                    )}
                </Box>
            }
        >
                <Box
                    sx={{
                        py: 1.5,
                        px: 3,
                        background: `linear-gradient(90deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexShrink: 0,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "0.85rem",
                            color: "white",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                        }}
                    >
                        {isEditMode ? "Modify Academic Year" : "Create New Academic Year"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                        <Box component="span" sx={{ color: colorTokens.preschool.coral.main, mr: 0.5 }}>*</Box> Mandatory Fields
                    </Typography>
                </Box>

                <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                            gap: 0,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 3,
                                p: { xs: 2, md: 4 },
                                borderRight: { md: `1px solid ${colorTokens.border.subtle}` },
                            }}
                        >
                            <TextField
                                label="Academic Year Name"
                                required
                                fullWidth
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                error={Boolean(errors.name)}
                                helperText={errors.name}
                                placeholder="e.g. 2024-2025"
                                sx={buildFieldSx(Boolean(errors.name))}
                            />
                            <TextField
                                label="Code"
                                required
                                fullWidth
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                error={Boolean(errors.code)}
                                helperText={errors.code}
                                placeholder="e.g. AY2425"
                                sx={buildFieldSx(Boolean(errors.code))}
                            />
                            <TextField
                                label="Start Date"
                                required
                                fullWidth
                                name="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={handleChange}
                                error={Boolean(errors.start_date)}
                                helperText={errors.start_date}
                                InputLabelProps={{ shrink: true }}
                                sx={buildFieldSx(Boolean(errors.start_date))}
                            />
                            <TextField
                                label="End Date"
                                required
                                fullWidth
                                name="end_date"
                                type="date"
                                value={formData.end_date}
                                onChange={handleChange}
                                error={Boolean(errors.end_date)}
                                helperText={errors.end_date}
                                InputLabelProps={{ shrink: true }}
                                sx={buildFieldSx(Boolean(errors.end_date))}
                            />
                        </Box>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: { xs: 2, md: 4 } }}>
                            <Box
                                sx={{
                                    p: 3,
                                    borderRadius: "16px",
                                    border: `2px dashed ${colorTokens.border.subtle}`,
                                    bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.02),
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.5,
                                }}
                            >
                                <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: colorTokens.preschool.turquoise.dark }}>
                                    ACADEMIC YEAR PREVIEW
                                </Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                                    <Box>
                                        <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Name</Typography>
                                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{formData.name || "-"}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Code</Typography>
                                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{formData.code || "-"}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Start Date</Typography>
                                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{formData.start_date || "-"}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>End Date</Typography>
                                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{formData.end_date || "-"}</Typography>
                                    </Box>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    p: 2,
                                    borderRadius: "12px",
                                    bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.04),
                                    border: `1.5px solid ${alpha(colorTokens.preschool.turquoise.main, 0.1)}`,
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            bgcolor: formData.is_active ? colorTokens.preschool.mint.main : colorTokens.preschool.coral.main,
                                            boxShadow: `0 0 8px ${formData.is_active ? colorTokens.preschool.mint.main : colorTokens.preschool.coral.main}`,
                                        }}
                                    />
                                    <Box>
                                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: colorTokens.preschool.turquoise.dark }}>
                                            Status
                                        </Typography>
                                        <Typography sx={{ fontSize: "0.72rem", color: colorTokens.text.secondary }}>
                                            {formData.is_active ? "Active" : "Inactive"}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Switch
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    name="is_active"
                                    sx={{
                                        "& .MuiSwitch-switchBase.Mui-checked": { color: colorTokens.preschool.mint.main },
                                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: colorTokens.preschool.mint.main },
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Box
                    sx={{
                        p: 2.5,
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 2,
                        bgcolor: alpha(colorTokens.background.default, 0.5),
                        borderTop: `1px solid ${colorTokens.border.subtle}`,
                        flexShrink: 0,
                    }}
                >
                    <Button
                        variant="text"
                        onClick={() => navigate("/academic-years")}
                        sx={{
                            color: colorTokens.preschool.coral.main,
                            fontWeight: 700,
                            px: 4,
                            "&:hover": { bgcolor: alpha(colorTokens.preschool.coral.main, 0.05) },
                        }}
                    >
                        Discard
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                        sx={{
                            background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                            color: "white",
                            fontWeight: 800,
                            px: 5,
                            borderRadius: "10px",
                            boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.2)}`,
                            "&:hover": { transform: "translateY(-1px)", boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}` },
                        }}
                    >
                        {loading ? "Processing…" : isEditMode ? "Save Changes" : "Finish & Create"}
                    </Button>
                </Box>
        </ListPageLayout>
    );
};

export default AddAcademicYear;
