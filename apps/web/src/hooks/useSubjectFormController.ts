import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { subjectService } from "../api/services/subjectService";
import { classService } from "../api/services/dropdownServices";
import { type AddSubjectFormData } from "../pages/academics/AddSubject.formConfig";

export function useSubjectFormController() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState<AddSubjectFormData>({
    name: "",
    code: "",
    description: "",
    subject_type: "Theory",
    is_active: true,
    class_ids: [],
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AddSubjectFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [classOptions, setClassOptions] = useState<{ id: number; label: string }[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const classes = await classService.list();
        setClassOptions(classes.map((c: any) => ({ id: c.id, label: c.name })));

        if (isEditMode && id) {
          const data = await subjectService.getSubject(parseInt(id));
          setFormData({
            name: data.name,
            code: data.code,
            description: data.description || "",
            subject_type: data.subject_type,
            is_active: data.is_active,
            class_ids: data.classes?.map((c) => c.class_id) || [],
          });
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load data");
      } finally {
        setFetchLoading(false);
      }
    };
    init();
  }, [id, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === "checkbox") {
      finalValue = (e.target as HTMLInputElement).checked;
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleFieldValueChange = (name: keyof AddSubjectFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.subject_type) {
      setError("Please fill in all required fields.");
      return;
    }
    await onConfirmSubmit();
  };

  const onConfirmSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      if (isEditMode && id) {
        await subjectService.updateSubject(parseInt(id), formData);
        setSnackbar("Subject updated successfully!");
        setTimeout(() => navigate("/subjects"), 1500);
      } else {
        await subjectService.createSubject(formData);
        setSnackbar("Subject created successfully!");
        setTimeout(() => navigate("/subjects"), 1500);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return {
    isEditMode,
    formData,
    setFormData,
    fieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
    onConfirmSubmit,
    loading,
    fetchLoading,
    error,
    setError,
    snackbar,
    setSnackbar,
    navigate,
    classOptions,
  };
}
