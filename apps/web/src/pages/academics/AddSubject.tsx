import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Box, IconButton, Button, Switch } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import SchoolIcon from "@mui/icons-material/School";
import ClassIcon from "@mui/icons-material/Class";
import { subjectService } from "../../api/services/subjectService";
import schoolClassService from "../../api/services/schoolClassService";
import academicYearService from "../../api/services/academicYearService";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import { createAddSubjectFormConfig, type AddSubjectFormData, type AddSubjectItem } from "./AddSubject.formConfig";
import { TextFieldInput, SelectItem } from "../../components/semantic";
import { FormSectionLabel, DataTable, type DataTableColumn } from "../../components/reusable";
import { colorTokens } from "../../tokens/colors";

const resolveCurrentAcademicYearId = (
    years: { id: number; is_current?: boolean | number; is_active?: boolean | number }[]
): string => {
    const current =
        years.find((y) => y.is_current === true || y.is_current === 1) ??
        years.find((y) => y.is_active === true || y.is_active === 1) ??
        years[0];
    return current?.id != null ? String(current.id) : "";
};

export default function AddSubject() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id && id !== "new");
    
    // Get academic_year_id, class_id, and subject_type from navigation state
    const navigationState = useMemo(() => 
        (location.state as { academic_year_id?: number; class_id?: number; subject_type?: string }) || {},
    [location.state]);

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<string | null>(null);
    // Track originally-loaded subject IDs so we can delete removed ones on save
    const [originalSubjectIds, setOriginalSubjectIds] = useState<number[]>([]);
    
    const [academicYearOptions, setAcademicYearOptions] = useState<{ id: string; label: string; value: string }[]>([]);
    const [classOptions, setClassOptions] = useState<{ id: string; label: string; value: string }[]>([]);

    const initialValues = useMemo<AddSubjectFormData>(() => ({
        academic_year_id: "",
        class_id: "",
        description: "",
        subjects: [{ name: "", code: "", subject_type: "Theory", is_mandatory: true, is_active: true }],
    }), []);

    const validationConfig = useMemo<FormValidationConfig<AddSubjectFormData>>(() => ({
        academic_year_id: [{ type: "required", message: "Academic Year is required." }],
        class_id: [{ type: "required", message: "Class is required." }],
    }), []);

    const {
        formData,
        setFormData,
        fieldErrors,
        setFieldErrors,
        handleChange,
        handleFieldValueChange,
        handleSubmit: baseHandleSubmit,
    } = useFormManager<AddSubjectFormData>({
        initialValues,
        validationConfig,
        onClearError: () => setError(null),
    });

    const handleAddSubjectRow = useCallback(() => {
        // In edit mode, use the same subject_type as existing subjects; otherwise default to "Theory"
        const defaultType = isEditMode && formData.subjects.length > 0 
            ? formData.subjects[0].subject_type 
            : "Theory";
        
        const newSubjects = [...formData.subjects, {
            name: "",
            code: "",
            subject_type: defaultType,
            is_mandatory: true,
            is_active: true
        }];
        handleFieldValueChange("subjects", newSubjects);
    }, [formData.subjects, handleFieldValueChange, isEditMode]);

    const handleRemoveSubjectRow = useCallback((index: number) => {
        const newSubjects = formData.subjects.filter((_, i) => i !== index);
        handleFieldValueChange("subjects", newSubjects);
    }, [formData.subjects, handleFieldValueChange]);

    const handleSubjectChange = useCallback((index: number, key: keyof AddSubjectItem, value: any) => {
        const newSubjects = formData.subjects.map((s, i) =>
            i === index ? { ...s, [key]: value } : s
        );
        handleFieldValueChange("subjects", newSubjects);
    }, [formData.subjects, handleFieldValueChange]);

    const formConfig = useMemo(() => {
        const config = createAddSubjectFormConfig({ 
            isEditMode, 
            academicYearOptions, 
            classOptions 
        });

        config.layoutRows.splice(0, 0, {
            kind: "custom",
            grid: { xs: 12 },
            render: () => <FormSectionLabel title="Batch Subject Assignment" icon={<SchoolIcon fontSize="small" />} />,
        });

        const tableInputSx = {
            "& .MuiInputBase-root": { fontSize: "0.875rem", fontWeight: 500 },
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "&:hover .MuiOutlinedInput-notchedOutline": { bgcolor: alpha(colorTokens.primary.main, 0.03), borderRadius: "6px" },
            "& .Mui-focused .MuiOutlinedInput-notchedOutline": { border: `1.5px solid ${colorTokens.primary.main}`, borderRadius: "6px" },
        };

        const columns: DataTableColumn<AddSubjectItem>[] = [
            {
                id: "name",
                label: "Subject Name",
                width: "35%",
                render: (row) => {
                    const index = formData.subjects.indexOf(row);
                    return (
                        <TextFieldInput
                            label=""
                            placeholder="e.g. Mathematics"
                            value={row.name}
                            onChange={(e) => handleSubjectChange(index, "name", e.target.value)}
                            sx={tableInputSx}
                            fullWidth
                            size="small"
                        />
                    );
                }
            },
            {
                id: "code",
                label: "Subject Code",
                width: "20%",
                render: (row) => {
                    const index = formData.subjects.indexOf(row);
                    return (
                        <TextFieldInput
                            label=""
                            placeholder="MAT101"
                            value={row.code}
                            onChange={(e) => handleSubjectChange(index, "code", e.target.value)}
                            sx={tableInputSx}
                            fullWidth
                            size="small"
                        />
                    );
                }
            },
            {
                id: "subject_type",
                label: "Type",
                width: "20%",
                render: (row) => {
                    const index = formData.subjects.indexOf(row);
                    return (
                        <SelectItem
                            label=""
                            value={row.subject_type}
                            onValueChange={(val) => handleSubjectChange(index, "subject_type", val as string)}
                            options={[
                                { id: "Theory", label: "Theory", value: "Theory" },
                                { id: "Practical", label: "Practical", value: "Practical" },
                                { id: "Activity", label: "Activity", value: "Activity" },
                            ]}
                            sx={tableInputSx}
                            fullWidth
                            size="small"
                        />

                    );
                }
            },
            {
                id: "is_mandatory",
                label: "Mandatory",
                align: "center",
                width: "12%",
                render: (row) => {
                    const index = formData.subjects.indexOf(row);
                    return (
                        <Switch
                            checked={row.is_mandatory}
                            onChange={(e) => handleSubjectChange(index, "is_mandatory", e.target.checked)}
                            color="primary"
                            size="small"
                        />
                    );
                }
            },
            {
                id: "is_active",
                label: "Active",
                align: "center",
                width: "10%",
                render: (row) => {
                    const index = formData.subjects.indexOf(row);
                    return (
                        <Switch
                            checked={row.is_active}
                            onChange={(e) => handleSubjectChange(index, "is_active", e.target.checked)}
                            color="success"
                            size="small"
                        />
                    );
                }
            }
        ];

        config.layoutRows.push({
            kind: "custom",
            grid: { xs: 12 },
            render: () => (
                <Box sx={{ mt: 4 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, px: 1 }}>
                        <FormSectionLabel title="Subject List for Selection" icon={<ClassIcon fontSize="small" />} sx={{ mb: 0 }} />
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            size="small"
                            onClick={handleAddSubjectRow}
                            sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700 }}
                        >
                            Add New Subject
                        </Button>
                    </Box>
                    <Box sx={{ border: `1px solid ${colorTokens.border.default}`, borderRadius: "12px", overflow: "hidden" }}>
                        <DataTable<AddSubjectItem>
                            columns={columns}
                            data={formData.subjects}
                            renderRowActions={(row) => {
                                const index = formData.subjects.indexOf(row);
                                return (
                                    <IconButton
                                        color="error"
                                        onClick={() => handleRemoveSubjectRow(index)}
                                        size="small"
                                        disabled={formData.subjects.length <= 1}
                                        sx={{ bgcolor: alpha(colorTokens.preschool.coral.main, 0.08) }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                );
                            }}
                        />
                    </Box>
                </Box>
            )
        });

        return config;
    }, [isEditMode, academicYearOptions, classOptions, formData.subjects, handleAddSubjectRow, handleRemoveSubjectRow, handleSubjectChange]);

    // Data Fetching
    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [years, classes] = await Promise.all([
                    academicYearService.listActive(),
                    schoolClassService.getAll()
                ]);
                
                const yearsData = (years || []) as {
                    id: number;
                    name?: string;
                    code?: string;
                    is_current?: boolean | number;
                    is_active?: boolean | number;
                }[];
                setAcademicYearOptions(yearsData.map((y) => ({
                    id: String(y.id),
                    label: y.name || y.code || String(y.id),
                    value: String(y.id)
                })));

                if (!isEditMode) {
                    const yearId =
                        navigationState.academic_year_id != null
                            ? String(navigationState.academic_year_id)
                            : resolveCurrentAcademicYearId(yearsData);
                    if (yearId) {
                        handleFieldValueChange("academic_year_id", yearId);
                    }
                }

                const classData = classes || [];
                const options = classData.map((c: any) => ({
                    id: String(c.id),
                    label: c.name,
                    value: String(c.id)
                }));
                
                // Add "All Classes" option
                if (options.length > 0) {
                    options.unshift({ id: "all", label: "All Classes", value: "all" });
                }
                
                setClassOptions(options);
            } catch (err) {
                console.error("Failed to load options", err);
            }
        };
        loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode, navigationState.academic_year_id]);

    const fetchSubjectForEdit = useCallback(async () => {
        if (!id || id === "new") return;
        try {
            setFetchLoading(true);
            
            // Get academic_year_id, class_id, and subject_type from navigation state
            const academicYearId = navigationState.academic_year_id;
            const classId = navigationState.class_id;
            const subjectType = navigationState.subject_type;
            
            if (academicYearId && classId && subjectType) {
                // Fetch all subjects for this academic year, class, AND subject type combination
                const response = await subjectService.getSubjects({
                    academic_year_id: academicYearId,
                    class_id: classId,
                    limit: 1000  // Get all subjects for this combination
                });
                
                // Filter by subject_type to get only subjects of the same type
                const subjects = (response.data || []).filter(s => s.subject_type === subjectType);
                
                const mappedSubjects = subjects.map(s => ({
                    id: s.id,
                    name: s.name,
                    code: s.code,
                    subject_type: s.subject_type,
                    is_mandatory: (s.classes || [])[0]?.is_mandatory ?? true,
                    is_active: s.is_active
                }));
                setOriginalSubjectIds(mappedSubjects.map(s => s.id!));
                setFormData({
                    academic_year_id: String(academicYearId),
                    class_id: String(classId),
                    description: "",
                    subjects: mappedSubjects
                });
            } else {
                // Fallback: load single subject by ID
                const data = await subjectService.getSubject(Number(id));
                setOriginalSubjectIds([data.id]);
                setFormData({
                    academic_year_id: (data.classes || [])[0]?.academic_year_id ? String((data.classes || [])[0].academic_year_id) : "",
                    class_id: (data.classes || [])[0]?.class_id ? String((data.classes || [])[0].class_id) : "",
                    description: data.description || "",
                    subjects: [{
                        id: data.id,
                        name: data.name,
                        code: data.code,
                        subject_type: data.subject_type,
                        is_mandatory: (data.classes || [])[0]?.is_mandatory ?? true,
                        is_active: data.is_active
                    }]
                });
            }
        } catch (err: any) {
            setError(err?.message || "Failed to load subject.");
        } finally {
            setFetchLoading(false);
        }
    }, [id, navigationState, setFormData]);

    useEffect(() => {
        if (isEditMode) fetchSubjectForEdit();
    }, [fetchSubjectForEdit, isEditMode]);

    const handleConfirmSubmit = async () => {
        // Validation
        for (const sub of formData.subjects) {
            if (!sub.name.trim() || !sub.code.trim()) {
                setError("Please fill Name and Code for all subjects.");
                return;
            }
        }

        setLoading(true);
        setError(null);
        try {
            if (isEditMode) {
                // Separate existing and new subjects
                const existingSubjects = formData.subjects.filter(s => s.id);
                const newSubjects = formData.subjects.filter(s => !s.id);
                
                const isAllClasses = formData.class_id === "all";

                // Delete subjects that were removed from the form
                const currentSubjectIds = new Set(existingSubjects.map(s => s.id!));
                const deletedSubjectIds = originalSubjectIds.filter(id => !currentSubjectIds.has(id));
                for (const deletedId of deletedSubjectIds) {
                    await subjectService.deleteSubject(deletedId);
                }
                
                // Update existing subjects
                for (const sub of existingSubjects) {
                    const payload = {
                        name: sub.name.trim(),
                        code: sub.code.trim(),
                        description: formData.description.trim(),
                        subject_type: sub.subject_type,
                        is_active: sub.is_active,
                        is_mandatory: sub.is_mandatory,
                        all_classes: isAllClasses,
                        academic_year_id: Number(formData.academic_year_id),
                        class_mappings: isAllClasses ? [] : [{
                            class_id: Number(formData.class_id),
                            academic_year_id: Number(formData.academic_year_id),
                            is_mandatory: sub.is_mandatory,
                            is_active: sub.is_active
                        }]
                    };
                    await subjectService.updateSubject(sub.id!, payload);
                }
                
                // Create new subjects
                for (const sub of newSubjects) {
                    const payload = {
                        name: sub.name.trim(),
                        code: sub.code.trim(),
                        description: formData.description.trim(),
                        subject_type: sub.subject_type,
                        is_active: sub.is_active,
                        is_mandatory: sub.is_mandatory,
                        all_classes: isAllClasses,
                        academic_year_id: Number(formData.academic_year_id),
                        class_mappings: isAllClasses ? [] : [{
                            class_id: Number(formData.class_id),
                            academic_year_id: Number(formData.academic_year_id),
                            is_mandatory: sub.is_mandatory,
                            is_active: sub.is_active
                        }]
                    };
                    await subjectService.createSubject(payload);
                }
                
                const deletedCount = deletedSubjectIds.length;
                setSnackbar(`Subjects updated successfully.${deletedCount > 0 ? ` ${deletedCount} subject(s) deleted.` : ""}`);

            } else {
                const isAllClasses = formData.class_id === "all";
                
                // Bulk creation
                const promises = formData.subjects.map(sub => {
                    const payload = {
                        name: sub.name.trim(),
                        code: sub.code.trim(),
                        description: formData.description.trim(),
                        subject_type: sub.subject_type,
                        is_active: sub.is_active,
                        is_mandatory: sub.is_mandatory,
                        all_classes: isAllClasses,
                        academic_year_id: Number(formData.academic_year_id),
                        class_mappings: isAllClasses ? [] : [{
                            class_id: Number(formData.class_id),
                            academic_year_id: Number(formData.academic_year_id),
                            is_mandatory: sub.is_mandatory,
                            is_active: sub.is_active
                        }]
                    };
                    return subjectService.createSubject(payload);
                });
                await Promise.all(promises);
                setSnackbar("Subjects created and assigned to class successfully.");
            }
            setTimeout(() => navigate("/subjects"), 1000);
        } catch (err: any) {
            const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
            if (apiFieldErrors) setFieldErrors(apiFieldErrors);
            setError(message || "Failed to save subjects.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseForm<AddSubjectFormData>
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
            useErrorSnackbar={true}
            onErrorDismiss={() => setError(null)}
            snackbar={snackbar}
            onSnackbarClose={() => setSnackbar(null)}
            headerConfig={{
                links: [
                    { title: "Subjects", path: "/subjects" },
                    { 
                        title: isEditMode 
                            ? `Edit ${navigationState.subject_type || "Subject"} Subjects` 
                            : "Bulk Add Subjects", 
                        path: "#" 
                    },
                ],
                homePath: "/",
            }}

            onCancelNavigate={() => navigate("/subjects")}
            confirmMessage={() => {
                if (isEditMode) {
                    const existingCount = formData.subjects.filter(s => s.id).length;
                    const newCount = formData.subjects.filter(s => !s.id).length;
                    const parts = [];
                    if (existingCount > 0) parts.push(`${existingCount} updated`);
                    if (newCount > 0) parts.push(`${newCount} created`);
                    return `Are you sure you want to ${parts.join(" and ")}?`;
                }
                return `Are you sure you want to create and assign these ${formData.subjects.length} subjects?`;
            }}
        />
    );
}


