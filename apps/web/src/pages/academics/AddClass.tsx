import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import schoolClassService from "../../api/services/schoolClassService";
import academicYearService, { type AcademicYear } from "../../api/services/academicYearService";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import { createAddClassFormConfig, type AddClassFormData } from "./AddClass.formConfig";

export default function AddClass() {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEditMode = Boolean(id && id !== "new");

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(isEditMode);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<string | null>(null);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [academicYearLoadFailed, setAcademicYearLoadFailed] = useState(false);
    const lastAcademicYears = useRef<AcademicYear[]>([]);

    const initialValues = useMemo<AddClassFormData>(() => ({
        academic_year_id: "",
        name: "",
        section: "",
        capacity: "",
        is_active: true,
    }), []);

    const validationConfig = useMemo<FormValidationConfig<AddClassFormData>>(() => ({
        name: [
            { type: "required", message: "Class Name is required." },
            { type: "minLength", value: 1, message: "Min 1 character." },
            { type: "maxLength", value: 100, message: "Max 100 characters." },
        ],
        section: [
            { type: "required", message: "Division is required." },
            { type: "minLength", value: 1, message: "Min 1 character." },
            { type: "maxLength", value: 50, message: "Max 50 characters." },
        ],
        capacity: [
            { type: "required", message: "Capacity is required." },
            { type: "pattern", regex: /^[1-9][0-9]*$/, message: "Must be a positive number." },
        ],
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
        () => createAddClassFormConfig({ isEditMode }),
        [isEditMode]
    );

    const fetchAcademicYears = useCallback(async () => {
        try {
            const years = await academicYearService.getAll();
            setAcademicYears(years);
            setAcademicYearLoadFailed(false);
        } catch (err: any) {
            setError(err?.message || "Failed to load academic years.");
            setAcademicYearLoadFailed(true);
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
                section: data.divisions?.[0]?.division_name || "",
                capacity: data.capacity ? String(data.capacity) : "",
                is_active: data.is_active ?? true,
            });
        } catch (err: any) {
            setError(err?.message || "Failed to load class.");
        } finally {
            setFetchLoading(false);
        }
    }, [id, setFormData]);

    useEffect(() => {
        fetchAcademicYears();
    }, [fetchAcademicYears]);

    useEffect(() => {
        if (isEditMode) {
            fetchClass();
        }
    }, [fetchClass, isEditMode]);

    useEffect(() => {
        if (isEditMode || formData.academic_year_id || academicYears.length === 0) return;
        if (JSON.stringify(lastAcademicYears.current) === JSON.stringify(academicYears)) return;
        const currentYear = academicYears.find((year) => year.is_active) || academicYears[0];
        setFormData((prev) => ({ ...prev, academic_year_id: currentYear.id }));
        lastAcademicYears.current = academicYears;
    }, [academicYears, formData.academic_year_id, isEditMode, setFormData]);

    const handleConfirmSubmit = async () => {
        if (!formData.academic_year_id) {
            setError("No active academic year found. Please create an academic year first.");
            return;
        }
        if (!/^[1-9][0-9]*$/.test(formData.capacity)) {
            setError("Capacity must be a positive number.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const payload = {
                academic_year_id: Number(formData.academic_year_id),
                name: formData.name.trim(),
                section: formData.section.trim(), // always present, required
                capacity: Number(formData.capacity),
                is_active: formData.is_active,
            };
            if (isEditMode && id && id !== "new") {
                await schoolClassService.update(Number(id), payload);
                setSnackbar("Class updated successfully.");
            } else {
                await schoolClassService.create(payload);
                setSnackbar("Class saved successfully.");
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
                    ? "Are you sure you want to update this class?"
                    : "Are you sure you want to create this class?"
            }
        />
    );
}
