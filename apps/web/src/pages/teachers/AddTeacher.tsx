import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import SchoolIcon from "@mui/icons-material/School";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import HomeIcon from "@mui/icons-material/Home";

import teacherService, { type TeacherCreate, type TeacherUpdate } from "../../api/services/teacherService";
import schoolClassService, { type SchoolClass } from "../../api/services/schoolClassService";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import type { SelectItemOption, MediaUploadSlotItem } from "../../components/semantic";
import { addTeacherFormConfig, type AddTeacherFormData } from "./AddTeacher.formConfig";

const emptyForm = (): AddTeacherFormData => ({
  full_name: "",
  date_of_birth: null,
  gender: null,
  mobile_number: "",
  email: null,
  qualification: null,
  experience_years: null,
  class_id: null,
  class_division_id: null,
  photo_url: "",
  is_active: true,
  address: null,
  city: null,
  state: null,
  pincode: null,
});

export default function AddTeacher() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Dropdown states
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  
  // Media states
  const [uploadItems, setUploadItems] = useState<MediaUploadSlotItem[]>([]);

  
  // Setup validation
  const validationConfig = useMemo<FormValidationConfig<AddTeacherFormData>>(() => ({
    full_name: [
      { type: "required", message: "Teacher Name is required" },
      { type: "minLength", value: 2, message: "Min 2 characters." },
    ],
    mobile_number: [
      { type: "required", message: "Mobile number is required" },
      { type: "pattern", regex: /^[0-9]{10}$/, message: "Invalid mobile number" }
    ],
    email: [
      { type: "pattern", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" }
    ],
    experience_years: [
      { type: "pattern", regex: /^\d*$/, message: "Must be a whole number" }
    ]
  }), []);

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<AddTeacherFormData>({
    initialValues: emptyForm(),
    validationConfig,
    onClearError: () => setError(null),
  });

  // Fetch classes for dropdown
  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const cls = await schoolClassService.getAll();
      setClasses(cls);
    } catch {
      console.error("Failed to load classes");
    } finally {
      setClassesLoading(false);
    }
  }, []);

  // Fetch teacher data if edit mode
  const loadTeacher = useCallback(async () => {
    if (!id) return;
    try {
      const teacher = await teacherService.getById(Number(id));
      setFormData({
        full_name: teacher.full_name,
        date_of_birth: teacher.date_of_birth || null,
        gender: teacher.gender || null,
        mobile_number: teacher.mobile_number,
        email: teacher.email || null,
        qualification: teacher.qualification || null,
        experience_years: teacher.experience_years || null,
        class_id: teacher.class_id ? String(teacher.class_id) : null,
        class_division_id: teacher.class_division_id ? String(teacher.class_division_id) : null,
        photo_url: teacher.photo_url || "",
        is_active: teacher.is_active,
        address: teacher.address || null,
        city: teacher.city || null,
        state: teacher.state || null,
        pincode: teacher.pincode || null,
      });
      if (teacher.photo_url) {
        setUploadItems([{ id: "existing", previewUrl: teacher.photo_url }]);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to load teacher data");
    } finally {
      setInitLoading(false);
    }
  }, [id, setFormData]);

  useEffect(() => {
    loadClasses();
    if (isEditMode) {
      loadTeacher();
    }
  }, [isEditMode, loadClasses, loadTeacher]);

  // Derive dropdown options
  const classOptions: SelectItemOption[] = useMemo(() => {
    return classes.map((c: SchoolClass) => ({
      id: String(c.id),
      value: String(c.id),
      label: c.name
    }));
  }, [classes]);

  const divisionOptions: SelectItemOption[] = useMemo(() => {
    if (!formData.class_id) return [];
    const selectedClass = classes.find((c: SchoolClass) => String(c.id) === formData.class_id);
    if (!selectedClass || !selectedClass.divisions) return [];
    return selectedClass.divisions.map((d: any) => ({
      id: String(d.id),
      value: String(d.id),
      label: d.division_name
    }));
  }, [classes, formData.class_id]);

  // When class changes, reset division
  useEffect(() => {
    // Don't clear division while classes are still loading or if classes aren't available yet
    if (classesLoading || classes.length === 0) return;

    if (formData.class_id && formData.class_division_id) {
      const validIds = divisionOptions.map((d: SelectItemOption) => d.value);
      if (!validIds.includes(formData.class_division_id)) {
        handleFieldValueChange("class_division_id", null);
      }
    }
  }, [formData.class_id, divisionOptions, formData.class_division_id, handleFieldValueChange, classesLoading, classes.length]);

  const handleAddMediaFiles = async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadItems([{ id: file.name, previewUrl: dataUrl }]);
      handleFieldValueChange("photo_url", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMediaItem = (itemId: string) => {
    setUploadItems((prev) => prev.filter((i) => i.id !== itemId));
    handleFieldValueChange("photo_url", "");
  };

  const formConfig = useMemo(
    () =>
      addTeacherFormConfig({
        isEditMode,
        classOptions,
        divisionOptions,
        classesLoading,
        divisionsLoading: false, // Divs load with classes
        uploadItems,
        handleAddMediaFiles,
        handleRemoveMediaItem,
        icons: {
          personal: <PersonIcon fontSize="small" />,
          contact: <ContactPhoneIcon fontSize="small" />,
          academic: <SchoolIcon fontSize="small" />,
          assignment: <AssignmentIndIcon fontSize="small" />,
          address: <HomeIcon fontSize="small" />,
        },
      }),
    [isEditMode, classOptions, divisionOptions, classesLoading, uploadItems, handleAddMediaFiles, handleRemoveMediaItem]
  );



  const handleConfirmSubmit = async (values: AddTeacherFormData, actionType: 'SAVE' | 'SAVE_AND_ADD') => {
    setLoading(true);
    setError(null);
    try {
      const payload: TeacherCreate | TeacherUpdate = {
        full_name: values.full_name,
        date_of_birth: values.date_of_birth,
        gender: values.gender,
        mobile_number: values.mobile_number,
        email: values.email,
        qualification: values.qualification,
        experience_years: values.experience_years ? Number(values.experience_years) : null,
        class_id: values.class_id ? Number(values.class_id) : null,
        class_division_id: values.class_division_id ? Number(values.class_division_id) : null,
        photo_url: values.photo_url || null,
        is_active: values.is_active,
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
      };

      if (isEditMode && id) {
        await teacherService.update(Number(id), payload as TeacherUpdate);
        setSnackbar("Teacher updated successfully");
        setTimeout(() => navigate("/teachers"), 1000);
      } else {
        await teacherService.create(payload as TeacherCreate);
        setSnackbar("Teacher added successfully");
        if (actionType === 'SAVE_AND_ADD') {
          setFormData(emptyForm());
        } else {
          setTimeout(() => navigate("/teachers"), 1000);
        }
      }
    } catch (err: unknown) {
      console.error("Save error:", err);
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((p: any) => ({ ...p, ...apiFieldErrors }));
      
      // Only show banner error if it's a real message and not just the generic validation hint
      if (message && message !== "Please fix the highlighted errors.") {
        setError(message);
      } else {
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<AddTeacherFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleSubmit}
      setFormError={setError}
      onConfirmSubmit={() => handleConfirmSubmit(formData, 'SAVE')}
      isEditMode={isEditMode}
      loading={loading || initLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Teachers", path: "/teachers" },
          { title: isEditMode ? "Edit Teacher" : "Add Teacher", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Save",
      }}
      onCancelNavigate={() => navigate("/teachers")}
      confirmMessage={(ctx: any) =>
        ctx.isEditMode
          ? "Are you sure you want to update this teacher?"
          : "Are you sure you want to add this teacher?"
      }
    />
  );
}
