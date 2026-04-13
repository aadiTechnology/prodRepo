import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import studentService from "../../api/services/studentService";
import { classService } from "../../api/services/dropdownServices";
import BaseForm from "../../components/reusable/BaseForm";
import type { FormValidationConfig } from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import { mapApiErrorsToFields } from "../../utils/formValidation";

// --- Form Data Type ---

export type AddStudentFormData = {
  student_name: string;
  gender: string;
  date_of_birth: string;
  mobile_number: string;
  email?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  class_id: number | "";
  class_division_id: number | "";
  is_active: boolean;
  mother_name: string;
  mother_contact_number: string;
  tenant_id: number;
};

const emptyForm = (): AddStudentFormData => ({
  student_name: "",
  gender: "",
  date_of_birth: "",
  mobile_number: "",
  email: "",
  address: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
  class_id: "",
  class_division_id: "",
  is_active: true,
  mother_name: "",
  mother_contact_number: "",
  tenant_id: 0, // Will be set from user context
});


export default function AddStudent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const isEditMode = Boolean(id);

  // Initial values for add/edit
  const initialValues = useMemo(() => {
    const form = emptyForm();
    if (user?.tenant_id) {
      form.tenant_id = user.tenant_id;
    }
    return form;
  }, [user]);

  const validationConfig = useMemo<FormValidationConfig<AddStudentFormData>>(
    () => ({
      student_name: [{ type: "required", message: "Required." }],
      gender: [{ type: "required", message: "Required." }],
      date_of_birth: [{ type: "required", message: "Required." }],
      mobile_number: [
        { type: "required", message: "Required." },
        { type: "pattern", regex: /^\d{10}$/, message: "Must be 10 digits." },
      ],
      mother_contact_number: [
        { type: "required", message: "Required." },
        { type: "pattern", regex: /^\d{10}$/, message: "Must be 10 digits." },
      ],
      email: [
        { type: "pattern", regex: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: "Invalid email." },
      ],
      class_id: [{ type: "required", message: "Required." }],
      class_division_id: [{ type: "required", message: "Required." }],
      mother_name: [{ type: "required", message: "Required." }],
    }),
    []
  );

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<AddStudentFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  // Fetch student data for edit mode
  useEffect(() => {
    if (!isEditMode) return;
    setFetchLoading(true);
    studentService.getStudentById(id as string)
      .then((data) => {
        setFormData((prev) => ({
          ...prev,
          student_name: data.name || "",
          gender: data.gender || "",
          date_of_birth: data.date_of_birth || "",
          mobile_number: data.mobile || "",
          email: data.email || "",
          address: data.address || "",
          area: data.area || "",
          city: data.city || "",
          state: data.state || "",
          pincode: data.pincode || "",
          class_id: data.class_id ?? "",
          class_division_id: data.class_division_id ?? "",
          is_active: data.is_active ?? true,
          mother_name: data.parent_name || "",
          mother_contact_number: data.parent_mobile || "",
          tenant_id: data.tenant_id ?? prev.tenant_id,
        }));
      })
      .catch(() => setError("Failed to fetch student details."))
      .finally(() => setFetchLoading(false));
  }, [isEditMode, id, setFormData]);

  useEffect(() => {
    classService.list().then((data) => setClasses(data.items || data)).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!formData.class_id) {
      setDivisions([]);
      setFormData((prev) => ({ ...prev, class_division_id: "" }));
      return;
    }
    const selected = classes.find((c) => String(c.id) === String(formData.class_id));
    setDivisions(selected?.divisions || []);
  }, [formData.class_id, classes, setFormData]);

  // Section header component for visual separation (uses CSS class)
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="section-header">{title}</div>
  );

  const formConfig = useMemo<import("../../components/reusable/formFramework.types").FormConfig<AddStudentFormData>>(
    () => {
      const fields = {
        student_name: {
          name: "student_name" as const,
          label: "Student Name",
          type: "text" as const,
          required: true,
        },
        gender: {
          name: "gender" as const,
          label: "Gender",
          type: "select" as const,
          required: true,
          props: {
            options: [
              { id: "Male", value: "Male", label: "Male" },
              { id: "Female", value: "Female", label: "Female" },
              { id: "Other", value: "Other", label: "Other" },
            ],
          },
        },
        date_of_birth: {
          name: "date_of_birth" as const,
          label: "Date of Birth",
          type: "date" as const,
          required: true,
        },
        mobile_number: {
          name: "mobile_number" as const,
          label: "Mobile Number",
          type: "text" as const,
          required: true,
        },
        email: {
          name: "email" as const,
          label: "Email",
          type: "email" as const,
        },
        address: {
          name: "address" as const,
          label: "Address",
          type: "text" as const,
        },
        area: {
          name: "area" as const,
          label: "Area",
          type: "text" as const,
        },
        city: {
          name: "city" as const,
          label: "City",
          type: "text" as const,
        },
        state: {
          name: "state" as const,
          label: "State",
          type: "text" as const,
        },
        pincode: {
          name: "pincode" as const,
          label: "Pincode",
          type: "text" as const,
        },
        class_id: {
          name: "class_id" as const,
          label: "Class",
          type: "select" as const,
          required: true,
          props: {
            options: classes.map((c) => ({ id: String(c.id), value: String(c.id), label: c.name })),
          },
        },
        class_division_id: {
          name: "class_division_id" as const,
          label: "Division",
          type: "select" as const,
          required: true,
          props: {
            options: divisions.map((d) => ({ id: String(d.id), value: String(d.id), label: d.division_name })),
          },
        },
        mother_name: {
          name: "mother_name" as const,
          label: "Mother Name",
          type: "text" as const,
          required: true,
        },
        mother_contact_number: {
          name: "mother_contact_number" as const,
          label: "Mother Contact Number",
          type: "text" as const,
          required: true,
        },
        is_active: {
          name: "is_active" as const,
          label: "Active",
          type: "switch" as const,
        },
      };

      // Section header component for visual separation (uses CSS class)
      const SectionHeader = ({ title }: { title: string }) => (
        <div className="section-header">{title}</div>
      );

      // Only show status section/field in edit mode
      const sections = [
        {
          title: "Student Information",
          fields: [
            "student_name",
            "gender",
            "date_of_birth",
            "mobile_number",
            "email",
            "address",
            "area",
            "city",
            "state",
            "pincode",
            "class_id",
            "class_division_id",
          ],
        },
        {
          title: "Parent Information",
          fields: ["mother_name", "mother_contact_number"],
        },
      ];
      if (isEditMode) {
        sections.push({ title: "Status", fields: ["is_active"] });
      }

      // Layout rows with conditional status section
      const layoutRows: import("../../components/reusable/formFramework.types").FormLayoutRow<AddStudentFormData>[] = [
        {
          kind: "custom",
          grid: { xs: 12 },
          render: () => <SectionHeader title="Student Information" />,
        },
        { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["student_name", "gender"] },
        { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["date_of_birth", "mobile_number"] },
        { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["email", "address"] },
        { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["area", "city"] },
        { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["state", "pincode"] },
        { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["class_id", "class_division_id"] },
        {
          kind: "custom",
          grid: { xs: 12 },
          render: () => <SectionHeader title="Parent Information" />,
        },
        { kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["mother_name", "mother_contact_number"] },
      ];
      if (isEditMode) {
        layoutRows.push({
          kind: "custom",
          grid: { xs: 12 },
          render: () => <SectionHeader title="Status" />,
        });
        layoutRows.push({ kind: "fields", grid: { xs: 12, sm: 6 }, fieldNames: ["is_active"] });
      }
  // Add CSS for section-header (move to external CSS file in production)
  // You can move this to App.css or a module if preferred
  if (typeof document !== "undefined" && !document.getElementById("section-header-style")) {
    const style = document.createElement("style");
    style.id = "section-header-style";
    style.innerHTML = `.section-header { font-weight: 600; font-size: 18px; margin: 24px 0 8px 0; }`;
    document.head.appendChild(style);
  }

      return {
        fields,
        sections,
        layoutRows,
      };
    },
    [classes, divisions, isEditMode]
  );

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!formData.mother_contact_number) {
        setError("Mother contact number is required.");
        setLoading(false);
        return;
      }
      if (!formData.tenant_id) {
        setError("Tenant ID is required.");
        setLoading(false);
        return;
      }
      const payload = {
        student_name: formData.student_name,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        mobile_number: formData.mobile_number,
        email: formData.email,
        address: formData.address,
        area: formData.area,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        class_id: formData.class_id,
        class_division_id: formData.class_division_id,
        is_active: formData.is_active,
        tenant_id: formData.tenant_id,
        parent: {
          parent_name: formData.mother_name,
          mobile_number: formData.mother_contact_number,
        },
      };
      let r;
      if (isEditMode) {
        r = await studentService.update(id as string, payload);
        setSnackbar(r?.message || "Student updated successfully");
      } else {
        r = await studentService.create(payload);
        setSnackbar(r.message || "Student added successfully");
      }
      setTimeout(() => navigate("/students"), 1000);
    } catch (err: any) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
      setError(message || (isEditMode ? "Failed to update student." : "Failed to add student."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<AddStudentFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleSubmit}
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
          { title: "Students", path: "/students" },
          { title: isEditMode ? "Edit Student" : "Add Student", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save Student",
        saveTooltipEdit: "Save Student",
      }}
      onCancelNavigate={() => navigate("/students")}
      confirmMessage={() => isEditMode ? "Are you sure you want to update this student?" : "Are you sure you want to add this student?"}
    />
  );
}
