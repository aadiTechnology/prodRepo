/**
 * Add / Edit Lead Page
 * Uses BaseForm + formConfig pattern — identical to AddFeeDiscount workflow
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import leadService from "../../api/services/leadService";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import {
  createAddLeadFormConfig,
  type AddLeadFormData,
} from "./AddLeadPage.formConfig";
import academicYearService from "../../api/services/academicYearService";
import schoolClassService from "../../api/services/schoolClassService";
import userService from "../../api/services/userService";

const emptyForm = (): AddLeadFormData => ({
  parent_name: "",
  mobile_number: "",
  alternate_mobile: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pin_code: "",
  relationship: "",
  child_name: "",
  child_dob: "",
  child_gender: "",
  lead_source_id: "",
  lead_status_id: "",
  preferred_class_id: "",
  preferred_academic_year_id: "",
  expected_admission_date: "",
  notes: "",
  remarks: "",
  assigned_to: "",
});

export default function AddLeadPage() {
  const navigate = useNavigate();
  const { id: routeLeadId } = useParams<{ id?: string }>();
  const leadId = routeLeadId ?? null;
  const isEditMode = Boolean(leadId);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Dropdown options
  const [sourceOptions, setSourceOptions] = useState<
    { id: string; label: string; value: string }[]
  >([]);
  const [statusOptions, setStatusOptions] = useState<
    { id: string; label: string; value: string }[]
  >([]);
  const [classOptions, setClassOptions] = useState<
    { id: string; label: string; value: string }[]
  >([]);
  const [academicYearOptions, setAcademicYearOptions] = useState<
    { id: string; label: string; value: string }[]
  >([]);
  const [staffOptions, setStaffOptions] = useState<
    { id: string; label: string; value: string }[]
  >([]);

  // Load dropdown data
  useEffect(() => {
    leadService.getSources().then((data) =>
      setSourceOptions(
        data.map((s) => ({ id: String(s.id), label: s.name, value: String(s.id) }))
      )
    ).catch(() => {});

    leadService.getStatuses().then((data) =>
      setStatusOptions(
        data.map((s) => ({ id: String(s.id), label: s.name, value: String(s.id) }))
      )
    ).catch(() => {});

    schoolClassService.getAll().then((data: any[]) =>
      setClassOptions(
        data.map((c: any) => ({ id: String(c.id), label: c.name, value: String(c.id) }))
      )
    ).catch(() => {});

    academicYearService.getAll().then((data: any) => {
      const items = data?.data || data || [];
      setAcademicYearOptions(
        items.map((y: any) => ({
          id: String(y.id),
          label: y.name || String(y.id),
          value: String(y.id),
        }))
      );
    }).catch(() => {});

    userService.getAllUsers().then((data: any) => {
      const items = data?.data || data || [];
      setStaffOptions(
        items.map((u: any) => ({
          id: String(u.id),
          label: u.full_name || u.username || String(u.id),
          value: String(u.id),
        }))
      );
    }).catch(() => {});
  }, []);

  const initialValues = useMemo(() => emptyForm(), []);

  const validationConfig = useMemo(
    () => ({
      parent_name: [{ type: "required" as const, message: "Parent name is required." }],
      mobile_number: [{ type: "required" as const, message: "Contact number is required." }],
      child_name: [{ type: "required" as const, message: "Child name is required." }],
      lead_source_id: [{ type: "required" as const, message: "Lead source is required." }],
      lead_status_id: [{ type: "required" as const, message: "Lead status is required." }],
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
  } = useFormManager<AddLeadFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  // Fetch lead data for edit mode
  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    try {
      setFetchLoading(true);
      const data = await leadService.getById(Number(leadId));
      setFormData({
        parent_name: data.parent?.parent_name || "",
        mobile_number: data.parent?.mobile_number || "",
        alternate_mobile: data.parent?.alternate_mobile || "",
        email: data.parent?.email || "",
        address: data.parent?.address || "",
        city: data.parent?.city || "",
        state: data.parent?.state || "",
        pin_code: data.parent?.pin_code || "",
        relationship: data.parent?.relationship || "",
        child_name: data.child_name || "",
        child_dob: data.child_dob || "",
        child_gender: data.child_gender || "",
        lead_source_id: String(data.lead_source_id || ""),
        lead_status_id: String(data.lead_status_id || ""),
        preferred_class_id: String(data.preferred_class_id || ""),
        preferred_academic_year_id: String(data.preferred_academic_year_id || ""),
        expected_admission_date: data.expected_admission_date || "",
        notes: data.notes || "",
        remarks: data.remarks || "",
        assigned_to: String(data.assigned_to || ""),
      });
    } catch {
      setError("Failed to load lead.");
    } finally {
      setFetchLoading(false);
    }
  }, [leadId, setFormData]);

  useEffect(() => {
    if (isEditMode) fetchLead();
  }, [fetchLead, isEditMode]);

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        parent_name: formData.parent_name,
        mobile_number: formData.mobile_number,
        alternate_mobile: formData.alternate_mobile || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        pin_code: formData.pin_code || undefined,
        relationship: formData.relationship || undefined,
        child_name: formData.child_name,
        child_dob: formData.child_dob || undefined,
        child_gender: formData.child_gender || undefined,
        lead_source_id: Number(formData.lead_source_id),
        lead_status_id: Number(formData.lead_status_id),
        preferred_class_id: formData.preferred_class_id
          ? Number(formData.preferred_class_id)
          : undefined,
        preferred_academic_year_id: formData.preferred_academic_year_id
          ? Number(formData.preferred_academic_year_id)
          : undefined,
        expected_admission_date: formData.expected_admission_date || undefined,
        notes: formData.notes || undefined,
        remarks: formData.remarks || undefined,
        assigned_to: formData.assigned_to ? Number(formData.assigned_to) : undefined,
      };

      if (isEditMode && leadId) {
        await leadService.update(Number(leadId), payload);
        setSnackbar("Lead updated successfully.");
      } else {
        await leadService.create(payload);
        setSnackbar("Lead created successfully.");
      }
      setTimeout(() => navigate("/admissions/leads"), 1000);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          (isEditMode ? "Failed to update lead." : "Failed to create lead.")
      );
    } finally {
      setLoading(false);
    }
  };

  const formConfig = useMemo(
    () =>
      createAddLeadFormConfig({
        isEditMode,
        sourceOptions,
        statusOptions,
        classOptions,
        academicYearOptions,
        staffOptions,
      }),
    [isEditMode, sourceOptions, statusOptions, classOptions, academicYearOptions, staffOptions]
  );

  return (
    <BaseForm<AddLeadFormData>
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
          { title: "Lead Management", path: "/admissions/leads" },
          {
            title: isEditMode ? "Edit Lead" : "Add Lead",
            path: "#",
          },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save Lead",
        saveTooltipEdit: "Update Lead",
      }}
      onCancelNavigate={() => navigate("/admissions/leads")}
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this lead?"
          : "Are you sure you want to save this lead?"
      }
    />
  );
}
