import { useState, useEffect, useCallback } from "react";
import { Box, Typography, Alert, CircularProgress, IconButton, Tooltip, Switch, alpha } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { Save as SaveIcon, Cancel as CancelIcon } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import { TextField, Button } from "../../components/primitives";
import schoolClassService from "../../api/services/schoolClassService";
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

const AddClass = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id && id !== "new");
    type FormData = {
        academic_year_id: number | "";
        name: string;
        section: string;
        capacity: string;
        is_active: boolean;
    };

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [yearsLoading, setYearsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

    const [formData, setFormData] = useState<FormData>({
        academic_year_id: "",
        name: "",
        section: "",
        capacity: "",
        is_active: true,
    });

    const fetchAcademicYears = useCallback(async () => {
        try {
            setYearsLoading(true);
            const years = await academicYearService.getAll();
            setAcademicYears(years);
        } catch (err: any) {
            setError(err?.message || "Failed to load academic years.");
        } finally {
            setYearsLoading(false);
        }
    }, []);

    const fetchClass = useCallback(async () => {
        if (!id || id === "new") return;
        try {
            setFetchLoading(true);
            const data = await schoolClassService.getById(Number(id));
            setFormData({
                academic_year_id: data.academic_year_id || "",
                name: data.name || "",
                section: data.section || "",
                capacity: data.capacity ? String(data.capacity) : "",
                is_active: data.is_active,
            });
        } catch (err: any) {
            setError(err?.message || "Failed to load class.");
        } finally {
            setFetchLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isEditMode) {
            fetchClass();
        }
    }, [fetchClass, isEditMode]);

    useEffect(() => {
        fetchAcademicYears();
    }, [fetchAcademicYears]);

    useEffect(() => {
        if (isEditMode || formData.academic_year_id || academicYears.length === 0) return;
        const currentYear = academicYears.find((year) => year.is_active) || academicYears[0];
        setFormData((prev) => ({ ...prev, academic_year_id: currentYear.id }));
    }, [academicYears, formData.academic_year_id, isEditMode]);

    const validateField = (name: string, value: string | number | boolean) => {
        let e = "";
        if (name === "name") {
            const text = String(value || "").trim();
            if (!text) e = "Required.";
            else if (text.length < 2) e = "Min 2 characters.";
            else if (text.length > 100) e = "Max 100 characters.";
        } else if (name === "section") {
            const text = String(value || "").trim();
            if (!text) e = "Required.";
            else if (text.length > 50) e = "Max 50 characters.";
        } else if (name === "capacity") {
            const text = String(value || "").trim();
            if (!text) e = "Required.";
            else {
                const n = Number(text);
                if (!Number.isInteger(n)) e = "Must be a whole number.";
                else if (n < 1 || n > 1000) e = "Must be between 1 and 1000.";
            }
        }
        return e;
    };

    const handleValueChange = (name: keyof typeof formData, value: string | number | boolean) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        const finalValue =
            type === "checkbox" || name === "is_active"
                ? checked
                : name === "academic_year_id"
                    ? (value ? Number(value) : "")
                    : value;
        handleValueChange(name as keyof typeof formData, finalValue);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const fields: Array<keyof typeof formData> = [
            "name",
            "section",
            "capacity",
        ];
        fields.forEach((field) => {
            const fieldError = validateField(field, formData[field]);
            if (fieldError) newErrors[field] = fieldError;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (!formData.academic_year_id) {
            setError("No active academic year found. Please create an academic year first.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const payload = {
                academic_year_id: Number(formData.academic_year_id),
                name: formData.name.trim(),
                section: formData.section.trim() || undefined,
                capacity: formData.capacity ? Number(formData.capacity) : undefined,
                is_active: formData.is_active,
            };

            if (isEditMode && id && id !== "new") {
                await schoolClassService.update(Number(id), payload);
                setSuccess("Class updated successfully!");
            } else {
                await schoolClassService.create(payload);
                setSuccess("Class created successfully!");
            }
            setTimeout(() => navigate("/academics/classes"), 1500);
        } catch (err: any) {
            setError(err?.message || (isEditMode ? "Failed to update class." : "Failed to create class."));
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading || yearsLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress sx={{ color: colorTokens.preschool.turquoise.main }} />
            </Box>
        );
    }

    return (
        <ListPageLayout
            pageBackground={true}
            contentPaddingSize="none"
            contentSx={{ maxWidth: 1100, mx: "auto", width: "100%", height: "auto" }}
            header={
                <Box sx={{ mb: 2 }}>
                    <PageHeader
                        links={[
                            { title: "Classes", path: "/academics/classes" },
                            { title: isEditMode ? "Edit Class" : "Add Class", path: "#" },
                        ]}
                        homePath="/"
                        actions={
                            <Box sx={{ display: "flex", gap: 1.5 }}>
                                <Tooltip title="Discard Changes">
                                    <IconButton
                                        onClick={() => navigate("/academics/classes")}
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
                    p: 0,
                    overflow: "hidden",
                    border: `1px solid ${colorTokens.border.default}`,
                    display: "flex",
                    flexDirection: "column",
                    height: "auto",
                    width: "100%",
                    maxWidth: 1100,
                    mx: "auto",
                }}
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
                        {isEditMode ? "Modify Class" : "Create New Class"}
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
                                label="Class Name"
                                required
                                fullWidth
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                error={Boolean(errors.name)}
                                helperText={errors.name}
                                placeholder="e.g. Nursery"
                                sx={buildFieldSx(Boolean(errors.name))}
                            />
                            <TextField
                                label="Section"
                                required
                                fullWidth
                                name="section"
                                value={formData.section}
                                onChange={handleInputChange}
                                error={Boolean(errors.section)}
                                helperText={errors.section}
                                placeholder="e.g. A"
                                sx={buildFieldSx(Boolean(errors.section))}
                            />
                            <TextField
                                label="Capacity"
                                required
                                fullWidth
                                name="capacity"
                                type="number"
                                value={formData.capacity}
                                onChange={handleInputChange}
                                error={Boolean(errors.capacity)}
                                helperText={errors.capacity}
                                placeholder="e.g. 30"
                                sx={buildFieldSx(Boolean(errors.capacity))}
                            />
                        </Box>

                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 3,
                                p: { xs: 2, md: 4 },
                            }}
                        >
                            <Box
                                sx={{
                                    p: 3,
                                    borderRadius: "16px",
                                    border: `2px dashed ${colorTokens.border.subtle}`,
                                    bgcolor: alpha(colorTokens.preschool.turquoise.main, 0.02),
                                }}
                            >
                                <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: colorTokens.preschool.turquoise.dark, mb: 2 }}>
                                    CLASS PREVIEW
                                </Typography>
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
                                    <Box>
                                        <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Class Name</Typography>
                                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{formData.name || "-"}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Section</Typography>
                                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{formData.section || "-"}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: "0.7rem", color: colorTokens.text.secondary }}>Capacity</Typography>
                                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{formData.capacity || "-"}</Typography>
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
                                    onChange={handleInputChange}
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
                        onClick={() => navigate("/academics/classes")}
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
            </Box>
        </ListPageLayout>
    );
};

export default AddClass;
