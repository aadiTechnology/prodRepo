import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import SchoolIcon from "@mui/icons-material/School";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import HomeIcon from "@mui/icons-material/Home";

import teacherService, { type TeacherCreate, type TeacherResponse, type TeacherUpdate } from "../../api/services/teacherService";
import schoolClassService, { type SchoolClass } from "../../api/services/schoolClassService";
import { useAuth } from "../../context/AuthContext";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { emailRequiredPatternRules } from "../../utils/formValidationPresets";
import { useFormManager } from "../../hooks/useFormManager";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import BaseForm from "../../components/reusable/BaseForm";
import type { SelectItemOption, MediaUploadSlotItem } from "../../components/semantic";
import { addTeacherFormConfig, type AddTeacherFormData } from "./AddTeacher.formConfig";
import { toMediaUrl } from "../../utils/mediaUrl";

const MULTI_ASSIGNED_CLASS_VALUE = "__multi_assigned_class__";
const MULTI_ASSIGNED_DIVISION_VALUE = "__multi_assigned_division__";

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
  const { buildFormBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();
  const listPath = "/teachers";
  const { user } = useAuth();
  const activeTenantId = user?.tenant_id ?? user?.tenant?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Dropdown states
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [loadedTeacher, setLoadedTeacher] = useState<TeacherResponse | null>(null);
  
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
    email: emailRequiredPatternRules<AddTeacherFormData>(),
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
      setLoadedTeacher(teacher);
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
        setUploadItems([{ id: "existing", previewUrl: toMediaUrl(teacher.photo_url) || teacher.photo_url }]);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to load teacher data");
    } finally {
      setInitLoading(false);
    }
  }, [id, setFormData]);

  const assignmentSummaryRows = useMemo(() => {
    if (!loadedTeacher?.assignment_rows || loadedTeacher.assignment_rows.length === 0) return [];
    return loadedTeacher.assignment_rows.filter((row) => !!row.class_name);
  }, [loadedTeacher]);

  const hasMultipleAssignments = isEditMode && assignmentSummaryRows.length > 1;

  useEffect(() => {
    if (!isEditMode || !loadedTeacher || classesLoading || classes.length === 0) return;
    if (formData.class_id) return;

    const normalize = (value?: string | null) => value?.trim().toLowerCase();
    const resolveByNames = (className?: string | null, divisionName?: string | null) => {
      const normalizedClass = normalize(className);
      if (!normalizedClass) return null;

      const matchedClass = classes.find((c: SchoolClass) => normalize(c.name) === normalizedClass);
      if (!matchedClass) return null;

      const normalizedDivision = normalize(divisionName);
      const matchedDivision = normalizedDivision
        ? matchedClass.divisions?.find((d: any) => normalize(d.division_name) === normalizedDivision)
        : undefined;

      return {
        class_id: String(matchedClass.id),
        class_division_id: matchedDivision ? String(matchedDivision.id) : null,
      };
    };

    if (hasMultipleAssignments) {
      setFormData((prev) => ({
        ...prev,
        class_id: prev.class_id || MULTI_ASSIGNED_CLASS_VALUE,
        class_division_id: prev.class_division_id || MULTI_ASSIGNED_DIVISION_VALUE,
      }));
      return;
    }

    const singleAssignmentRow = assignmentSummaryRows.length === 1 ? assignmentSummaryRows[0] : null;
    const hasSingleDivisionInSingleRow =
      !!singleAssignmentRow && (singleAssignmentRow.division_names?.length || 0) === 1;
    const resolvedFromAssignmentRow =
      singleAssignmentRow && hasSingleDivisionInSingleRow
        ? resolveByNames(
            singleAssignmentRow.class_name,
            singleAssignmentRow.division_names?.[0] || null
          )
        : null;
    const resolvedFromTeacherFields = resolveByNames(loadedTeacher.class_name, loadedTeacher.division_name);
    const resolved = resolvedFromAssignmentRow || resolvedFromTeacherFields;

    if (!resolved) return;

    setFormData((prev) => ({
      ...prev,
      class_id: prev.class_id || resolved.class_id,
      class_division_id: prev.class_division_id || resolved.class_division_id,
    }));
  }, [isEditMode, loadedTeacher, classesLoading, classes, formData.class_id, setFormData, assignmentSummaryRows, hasMultipleAssignments]);

  useEffect(() => {
    loadClasses();
    if (isEditMode) {
      loadTeacher();
    }
  }, [isEditMode, loadClasses, loadTeacher]);

  // Derive dropdown options
  const classOptions: SelectItemOption[] = useMemo(() => {
    const baseOptions = classes.map((c: SchoolClass) => ({
      id: String(c.id),
      value: String(c.id),
      label: c.name
    }));
    if (!hasMultipleAssignments) return baseOptions;
    const classLabels = assignmentSummaryRows
      .map((row) => row.class_name?.trim())
      .filter((name): name is string => !!name);
    return [
      {
        id: MULTI_ASSIGNED_CLASS_VALUE,
        value: MULTI_ASSIGNED_CLASS_VALUE,
        label: classLabels.join(", "),
      },
      ...baseOptions,
    ];
  }, [classes, hasMultipleAssignments, assignmentSummaryRows]);

  const divisionOptions: SelectItemOption[] = useMemo(() => {
    if (hasMultipleAssignments) {
      const divisionLabel = assignmentSummaryRows
        .map((row) => {
          const className = row.class_name || "N/A";
          const divisions = row.division_names?.length ? row.division_names.join(", ") : "N/A";
          return `${className}: ${divisions}`;
        })
        .join(" | ");
      return [
        {
          id: MULTI_ASSIGNED_DIVISION_VALUE,
          value: MULTI_ASSIGNED_DIVISION_VALUE,
          label: divisionLabel,
        },
      ];
    }
    if (!formData.class_id) return [];
    const selectedClass = classes.find((c: SchoolClass) => String(c.id) === formData.class_id);
    if (!selectedClass || !selectedClass.divisions) return [];
    return selectedClass.divisions.map((d: any) => ({
      id: String(d.id),
      value: String(d.id),
      label: d.division_name
    }));
  }, [classes, formData.class_id, hasMultipleAssignments, assignmentSummaryRows]);

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
        disableAssignmentFields: isEditMode,
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
      const parseNumericSelect = (value: string | null) => {
        if (!value) return null;
        return /^[0-9]+$/.test(value) ? Number(value) : null;
      };
      const parsedClassId = parseNumericSelect(values.class_id);
      const parsedDivisionId = parseNumericSelect(values.class_division_id);

      const payload: TeacherCreate | TeacherUpdate = {
        full_name: values.full_name,
        date_of_birth: values.date_of_birth,
        gender: values.gender,
        mobile_number: values.mobile_number,
        email: values.email,
        qualification: values.qualification,
        experience_years: values.experience_years ? Number(values.experience_years) : null,
        class_id: parsedClassId,
        class_division_id: parsedDivisionId,
        photo_url: values.photo_url || null,
        is_active: isEditMode ? values.is_active : true,
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
      };

      if (isEditMode && id) {
        if (hasMultipleAssignments && (payload as TeacherUpdate).class_id === null) {
          delete (payload as TeacherUpdate).class_id;
        }
        if (hasMultipleAssignments && (payload as TeacherUpdate).class_division_id === null) {
          delete (payload as TeacherUpdate).class_division_id;
        }
        await teacherService.update(Number(id), payload as TeacherUpdate);
        setSnackbar("Teacher updated successfully");
        setTimeout(() => navigateWithConfigHub(listPath), 1000);
      } else {
        await teacherService.create(payload as TeacherCreate, activeTenantId);
        setSnackbar("Teacher added successfully");
        if (actionType === 'SAVE_AND_ADD') {
          setFormData(emptyForm());
        } else {
          setTimeout(() => navigateWithConfigHub(listPath), 1000);
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

  const handleCancel = useCallback(() => {
    if (isEditMode && loadedTeacher) {
      setFormData({
        full_name: loadedTeacher.full_name,
        date_of_birth: loadedTeacher.date_of_birth || null,
        gender: loadedTeacher.gender || null,
        mobile_number: loadedTeacher.mobile_number,
        email: loadedTeacher.email || null,
        qualification: loadedTeacher.qualification || null,
        experience_years: loadedTeacher.experience_years || null,
        class_id: loadedTeacher.class_id ? String(loadedTeacher.class_id) : null,
        class_division_id: loadedTeacher.class_division_id ? String(loadedTeacher.class_division_id) : null,
        photo_url: loadedTeacher.photo_url || "",
        is_active: loadedTeacher.is_active,
        address: loadedTeacher.address || null,
        city: loadedTeacher.city || null,
        state: loadedTeacher.state || null,
        pincode: loadedTeacher.pincode || null,
      });
      setUploadItems(
        loadedTeacher.photo_url
          ? [{ id: "existing", previewUrl: toMediaUrl(loadedTeacher.photo_url) || loadedTeacher.photo_url }]
          : []
      );
    } else {
      setFormData(emptyForm());
      setUploadItems([]);
    }
    setFieldErrors({});
    setError(null);
    setSnackbar(null);
  }, [isEditMode, loadedTeacher, setFormData, setFieldErrors]);

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
        links: buildFormBreadcrumbs(
          { title: "Teachers", path: listPath },
          isEditMode ? "Edit Teacher" : "Add Teacher"
        ),
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Save",
      }}
      onCancelNavigate={handleCancel}
      confirmMessage={(ctx: any) =>
        ctx.isEditMode
          ? "Are you sure you want to update this teacher?"
          : "Are you sure you want to add this teacher?"
      }
    />
  );
}
