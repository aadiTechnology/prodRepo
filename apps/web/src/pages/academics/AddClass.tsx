import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography, IconButton, Button, Switch } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import schoolClassService from "../../api/services/schoolClassService";
import academicYearService from "../../api/services/academicYearService";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import { createAddClassFormConfig, type AddClassFormData, type AddClassDivision } from "./AddClass.formConfig";
import { TextFieldInput } from "../../components/semantic";
import { FormSectionLabel } from "../../components/reusable";
import SchoolIcon from "@mui/icons-material/School";
import LayersIcon from "@mui/icons-material/Layers";

export default function AddClass() {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id && id !== "new");

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<string | null>(null);
    const [academicYearOptions, setAcademicYearOptions] = useState<
        { id: string; label: string; value: string }[]
    >([]);

    const initialValues = useMemo<AddClassFormData>(() => ({
        name: "",
        academic_year_id: "",
        is_active: true,
        divisions: [{ division_name: "", capacity: "30", is_active: true }],
    }), []);

    const validationConfig = useMemo<FormValidationConfig<AddClassFormData>>(() => ({
        name: [
            { type: "required", message: "Class Name is required." },
            { type: "minLength", value: 1, message: "Min 1 character." },
        ],
        academic_year_id: [{ type: "required", message: "Academic year is required." }],
    }), []);

    const {
        formData,
        setFormData,
        fieldErrors,
        setFieldErrors,
        handleChange,
        handleFieldValueChange,
        handleSubmit: baseHandleSubmit,
    } = useFormManager<AddClassFormData>({
        initialValues,
        validationConfig,
        onClearError: () => setError(null),
    });

    const formConfig = useMemo(
        () => {
            const config = createAddClassFormConfig({ isEditMode, academicYearOptions });

            // 1. Basic Information Section Header
            config.layoutRows.splice(0, 0, {
                kind: "custom",
                grid: { xs: 12 },
                render: () => <FormSectionLabel title="Class Basic Information" icon={<SchoolIcon fontSize="small" />} />,
            });

            // 2. Add custom row for divisions management
            const divisionsRow = {
                kind: "custom" as const,
                grid: { xs: 12 },
                render: () => (
                    <Box sx={{ mt: 2 }}>
                        <Box sx={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            mb: 2, 
                            px: 1,
                            pb: 0.5,
                            borderBottom: "1px solid",
                            borderColor: "divider"
                        }}>
                            <FormSectionLabel 
                                title="Class Divisions / Sections" 
                                icon={<LayersIcon fontSize="small" />} 
                                spacing={0}
                                sx={{ mb: 0 }}
                            />
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                size="small"
                                onClick={handleAddDivision}
                                sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600, mb: 1 }}
                            >
                                Add Division
                            </Button>
                        </Box>

                        {/* Table Header */}
                        <Box sx={{
                            display: { xs: "none", md: "flex" },
                            px: 2.5,
                            py: 1,
                            bgcolor: "grey.50",
                            borderRadius: "8px",
                            mb: 1.5,
                            gap: 3,
                            alignItems: "center"
                        }}>
                            <Typography variant="caption" sx={{ flex: 3, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Division Name
                            </Typography>
                            <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Capacity
                            </Typography>
                            <Typography variant="caption" sx={{ width: 80, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", textAlign: "center", letterSpacing: "0.5px" }}>
                                Status
                            </Typography>
                            <Box sx={{ width: 44 }} /> {/* Action spacer */}
                        </Box>

                        {formData.divisions.map((div, index) => (
                            <Box key={index} sx={{
                                display: "flex",
                                gap: 3,
                                alignItems: "center",
                                mb: 1.5,
                                px: { xs: 1, md: 2.5 },
                                py: 0.5,
                                flexWrap: { xs: "wrap", md: "nowrap" },
                                borderRadius: "12px",
                                "&:hover": { bgcolor: "action.hover" },
                                transition: "all 0.2s"
                            }}>
                                <Box sx={{ flex: { xs: "1 1 100%", md: 3 } }}>
                                    <TextFieldInput
                                        label={index === 0 && window.innerWidth < 900 ? "Division Name" : ""}
                                        placeholder="e.g. A"
                                        value={div.division_name}
                                        onChange={(e) => handleDivisionChange(index, "division_name", e.target.value)}
                                        required
                                        fullWidth
                                        size="small"
                                    />
                                </Box>
                                <Box sx={{ flex: { xs: "1 1 45%", md: 1 } }}>
                                    <TextFieldInput
                                        label={index === 0 && window.innerWidth < 900 ? "Capacity" : ""}
                                        placeholder="30"
                                        type="number"
                                        value={div.capacity}
                                        onChange={(e) => handleDivisionChange(index, "capacity", e.target.value)}
                                        required
                                        fullWidth
                                        size="small"
                                    />
                                </Box>
                                <Box sx={{ width: { xs: "45%", md: 80 }, display: "flex", justifyContent: "center" }}>
                                    <Switch
                                        checked={div.is_active}
                                        onChange={(e) => handleDivisionChange(index, "is_active", e.target.checked)}
                                        color="primary"
                                        size="small"
                                    />
                                </Box>
                                <Box sx={{ width: 44, display: "flex", justifyContent: "flex-end" }}>
                                    {formData.divisions.length > 1 && (
                                        <IconButton
                                            color="error"
                                            onClick={() => handleRemoveDivision(index)}
                                            size="small"
                                            sx={{ 
                                                bgcolor: "error.lighter",
                                                "&:hover": { bgcolor: "error.light", color: "white" } 
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )
            };

            config.layoutRows.push(divisionsRow);

            return config;
        },
        [isEditMode, academicYearOptions, formData.divisions]
    );

    const handleAddDivision = () => {
        const newDivs = [...formData.divisions, { division_name: "", capacity: "30", is_active: true }];
        handleFieldValueChange("divisions", newDivs);
    };

    const handleRemoveDivision = (index: number) => {
        const newDivs = formData.divisions.filter((_, i) => i !== index);
        handleFieldValueChange("divisions", newDivs);
    };

    const handleDivisionChange = (index: number, key: keyof AddClassDivision, value: any) => {
        const newDivs = formData.divisions.map((div, i) =>
            i === index ? { ...div, [key]: value } : div
        );
        handleFieldValueChange("divisions", newDivs);
    };

    useEffect(() => {
        academicYearService
            .getAll()
            .then((data: any) => {
                const items = data?.data || data || [];
                setAcademicYearOptions(
                    items.map((year: any) => ({
                        id: String(year.id),
                        label: year.name || year.code || String(year.id),
                        value: String(year.id),
                    }))
                );
            })
            .catch(() => {
                setAcademicYearOptions([]);
            });
    }, []);

    const fetchClass = useCallback(async () => {
        if (!id || id === "new") return;
        try {
            setFetchLoading(true);
            const data = await schoolClassService.getById(Number(id));
            setFormData({
                name: data.name || "",
                academic_year_id: data.academic_year_id ? String(data.academic_year_id) : "",
                is_active: data.is_active ?? true,
                divisions: data.divisions.map(d => ({
                    id: d.id,
                    division_name: d.division_name,
                    capacity: String(d.capacity || ""),
                    is_active: d.is_active
                }))
            });
        } catch (err: any) {
            setError(err?.message || "Failed to load class.");
        } finally {
            setFetchLoading(false);
        }
    }, [id, setFormData]);

    useEffect(() => {
        if (isEditMode) {
            fetchClass();
        }
    }, [fetchClass, isEditMode]);

    const handleConfirmSubmit = async () => {
        // Validation for divisions
        for (const div of formData.divisions) {
            if (!div.division_name.trim()) {
                setError("Division name is required for all divisions.");
                return;
            }
            if (!div.capacity || isNaN(Number(div.capacity)) || Number(div.capacity) <= 0) {
                setError(`Valid capacity is required for division ${div.division_name}.`);
                return;
            }
        }

        setLoading(true);
        setError(null);
        try {
            const payload = {
                name: formData.name.trim(),
                academic_year_id: Number(formData.academic_year_id),
                is_active: formData.is_active,
                divisions: formData.divisions.map(d => ({
                    id: d.id,
                    division_name: d.division_name.trim(),
                    capacity: Number(d.capacity),
                    is_active: d.is_active
                }))
            };

            if (isEditMode && id && id !== "new") {
                await schoolClassService.update(Number(id), payload);
                setSnackbar("Class and its divisions updated successfully.");
            } else {
                const createPayload = {
                    ...payload,
                    divisions: formData.divisions.map(d => d.division_name.trim())
                };
                await schoolClassService.create(createPayload);
                setSnackbar("Class created successfully.");
            }
            setTimeout(() => navigate("/classes"), 1000);
        } catch (err: unknown) {
            console.error("Class save error:", err);
            const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
            if (apiFieldErrors) {
                setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
            }
            setError(
                message || (isEditMode ? "Failed to update class." : "Failed to create class.")
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseForm<AddClassFormData>
            formConfig={formConfig}
            formData={formData}
            setFormData={setFormData}
            fieldErrors={fieldErrors}
            handleChange={handleChange}
            handleFieldValueChange={handleFieldValueChange}
            handleSubmit={baseHandleSubmit}
            setFormError={setError}
            onConfirmSubmit={handleConfirmSubmit}
            isEditMode={isEditMode}
            loading={loading}
            fetchLoading={fetchLoading}
            error={error}
            onErrorDismiss={() => setError(null)}
            snackbar={snackbar}
            onSnackbarClose={() => setSnackbar(null)}
            headerConfig={{
                links: [
                    { title: "Classes", path: "/classes" },
                    { title: isEditMode ? "Edit Class" : "Add Class", path: "#" },
                ],
                homePath: "/",
                cancelTooltip: "Cancel",
                saveTooltipCreate: "Finish & Create",
                saveTooltipEdit: "Save Changes",
            }}
            onCancelNavigate={() => navigate("/classes")}
            confirmMessage={(ctx) =>
                ctx.isEditMode
                    ? "Are you sure you want to update this class and its divisions?"
                    : "Are you sure you want to create this class?"
            }
        />
    );
}
