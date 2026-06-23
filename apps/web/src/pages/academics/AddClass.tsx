import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography, IconButton, Button, Switch } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import schoolClassService from "../../api/services/schoolClassService";
import academicYearService from "../../api/services/academicYearService";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import BaseForm from "../../components/reusable/BaseForm";
import { createAddClassFormConfig, type AddClassFormData, type AddClassDivision } from "./AddClass.formConfig";
import { TextFieldInput } from "../../components/semantic";
import { FormSectionLabel, DataTable, type DataTableColumn } from "../../components/reusable";
import SchoolIcon from "@mui/icons-material/School";
import LayersIcon from "@mui/icons-material/Layers";
import { colorTokens } from "../../tokens/colors";
import { alpha } from "@mui/material/styles";
import { resolveCurrentAcademicYearId } from "../../utils/academicYear";

export default function AddClass() {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const { buildFormBreadcrumbs, navigateWithConfigHub, navigateToList } = useConfigHubNavigation();
    const listPath = "/classes";
    const isEditMode = Boolean(id && id !== "new");

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<string | null>(null);
    const [academicYearOptions, setAcademicYearOptions] = useState<
        { id: string; label: string; value: string }[]
    >([]);
    const [defaultAcademicYearId, setDefaultAcademicYearId] = useState("");

    const initialValues = useMemo<AddClassFormData>(() => ({
        name: "",
        academic_year_id: "",
        is_active: true,
        divisions: [{ division_name: "", capacity: "", is_active: true }],
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
        resetForm,
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
            const tableInputSx = {
                "& .MuiInputBase-root": {
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "text.primary",
                    backgroundColor: "transparent",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                    backgroundColor: alpha(colorTokens.primary.main, 0.03),
                    borderRadius: "6px",
                },
                "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                    border: `1.5px solid ${colorTokens.primary.main}`,
                    borderRadius: "6px",
                    backgroundColor: "transparent",
                },
                "& .MuiInputBase-input": {
                    padding: "8px 12px",
                }
            };

            const columns: DataTableColumn<AddClassDivision>[] = [
                {
                    id: "division_name",
                    label: "Division Name",
                    width: isEditMode ? "55%" : "70%",
                    render: (row) => {
                        const index = formData.divisions.indexOf(row);
                        return (
                            <TextFieldInput
                                label=""
                                placeholder="Enter Division (e.g. A)"
                                value={row.division_name}
                                onChange={(e) => handleDivisionChange(index, "division_name", e.target.value)}
                                sx={tableInputSx}
                                fullWidth
                                size="small"
                                required
                            />
                        );
                    }
                },
                {
                    id: "capacity",
                    label: "Capacity",
                    width: isEditMode ? "20%" : "25%",
                    render: (row) => {
                        const index = formData.divisions.indexOf(row);
                        return (
                            <TextFieldInput
                                label=""
                                placeholder="Enter capacity (e.g. 50)"
                                type="text"
                                value={row.capacity}
                                htmlInput={{ inputMode: "numeric", pattern: "[0-9]*" }}
                                onChange={(e) =>
                                    handleDivisionChange(
                                        index,
                                        "capacity",
                                        e.target.value.replace(/\D/g, "")
                                    )
                                }
                                sx={tableInputSx}
                                fullWidth
                                size="small"
                                required
                            />
                        );
                    }
                },
                ...(isEditMode ? [{
                    id: "is_active" as const,
                    label: "Status",
                    align: "center" as const,
                    width: "15%",
                    render: (row: AddClassDivision) => {
                        const index = formData.divisions.indexOf(row);
                        return (
                            <Switch
                                checked={row.is_active}
                                onChange={(e) => handleDivisionChange(index, "is_active", e.target.checked)}
                                color="primary"
                                size="small"
                            />
                        );
                    }
                }] : [])
            ];

            // 2. Add custom row for divisions management
            const divisionsRow = {
                kind: "custom" as const,
                grid: { xs: 12 },
                render: () => (
                    <Box sx={{ mt: 6 }}>
                        <Box sx={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            mb: 2.5, 
                            px: 1,
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
                                sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, px: 2 }}
                            >
                                Add Division
                            </Button>
                        </Box>

                        <Box sx={{ 
                            border: `1px solid ${colorTokens.border.default}`, 
                            borderRadius: "12px", 
                            overflow: "hidden",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
                        }}>
                            <DataTable<AddClassDivision>
                                columns={columns}
                                data={formData.divisions}
                                renderRowActions={(row) => {
                                    const index = formData.divisions.indexOf(row);
                                    return (
                                        <IconButton
                                            color="error"
                                            onClick={() => handleRemoveDivision(index)}
                                            size="small"
                                            disabled={formData.divisions.length <= 1}
                                            sx={{ 
                                                bgcolor: alpha(colorTokens.preschool.coral.main, 0.08),
                                                "&:hover": { bgcolor: colorTokens.preschool.coral.main, color: "white" } 
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    );
                                }}
                            />
                        </Box>
                    </Box>
                )
            };

            config.layoutRows.push(divisionsRow);

            return config;
        },
        [isEditMode, academicYearOptions, formData.divisions]
    );

    const handleAddDivision = () => {
        const newDivs = [...formData.divisions, { division_name: "", capacity: "", is_active: true }];
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
            .listActive()
            .then((data: unknown) => {
                const items = (Array.isArray(data) ? data : (data as { data?: unknown[] })?.data) || [];
                const years = items as {
                    id: number;
                    name?: string;
                    code?: string;
                    is_current?: boolean | number;
                    is_active?: boolean | number;
                }[];
                setAcademicYearOptions(
                    years.map((year) => ({
                        id: String(year.id),
                        label: year.name || year.code || String(year.id),
                        value: String(year.id),
                    }))
                );
                if (!isEditMode) {
                    const currentYearId = resolveCurrentAcademicYearId(years);
                    setDefaultAcademicYearId(currentYearId);
                    setFormData((prev) => ({
                        ...prev,
                        academic_year_id: currentYearId,
                    }));
                }
            })
            .catch(() => {
                setAcademicYearOptions([]);
            });
    }, [isEditMode, setFormData]);

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
                await schoolClassService.create({
                    name: payload.name,
                    academic_year_id: payload.academic_year_id,
                    is_active: payload.is_active,
                    divisions: payload.divisions.map((d) => ({
                        division_name: d.division_name,
                        capacity: d.capacity,
                        is_active: d.is_active,
                    })),
                });
                setSnackbar("Class created successfully.");
            }
            setTimeout(() => navigateWithConfigHub(listPath), 1000);
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

    const handleCancel = () => {
        navigateToList(listPath);
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
                links: buildFormBreadcrumbs(
                    { title: "Classes", path: listPath },
                    isEditMode ? "Edit Class" : "Add Class"
                ),
                homePath: "/",
                cancelTooltip: "Cancel",
                saveTooltipCreate: "Save",
                saveTooltipEdit: "Save",
            }}
            onCancelNavigate={handleCancel}
            confirmMessage={(ctx) =>
                ctx.isEditMode
                    ? "Are you sure you want to update this class and its divisions?"
                    : "Are you sure you want to create this class?"
            }
        />
    );
}
