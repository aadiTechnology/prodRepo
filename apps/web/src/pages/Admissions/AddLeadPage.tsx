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
import AsyncFreeSoloAutocomplete from "../../components/reusable/AsyncFreeSoloAutocomplete";
import FormSectionLabel from "../../components/reusable/FormSectionLabel";
import PersonIcon from "@mui/icons-material/Person";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import AssignmentIcon from "@mui/icons-material/Assignment";

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
  const [society, setSociety] = useState<string>("");

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

  const toUniqueClassOptions = (items: any[]) => {
    const byName = new Map<string, { id: string; label: string; value: string }>();
    items.forEach((c: any) => {
      const id = String(c.id);
      const name = String(c.name || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, { id, label: name, value: id });
      }
    });
    return Array.from(byName.values());
  };

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
      preferred_academic_year_id: [{ type: "required" as const, message: "Academic year is required." }],
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

  useEffect(() => {
    const selectedAcademicYearId = formData.preferred_academic_year_id
      ? Number(formData.preferred_academic_year_id)
      : undefined;

    schoolClassService
      .getAll(selectedAcademicYearId ? { academic_year_id: selectedAcademicYearId } : undefined)
      .then((data: any[]) => {
        setClassOptions(toUniqueClassOptions(data || []));
      })
      .catch(() => setClassOptions([]));
  }, [formData.preferred_academic_year_id]);

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
      setSociety(data.parent?.society ?? "");
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
        society: society || null,
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
    () => {
      const config = createAddLeadFormConfig({
        isEditMode,
        sourceOptions,
        statusOptions,
        classOptions,
        academicYearOptions,
        staffOptions,
        academicYearSelected: Boolean(formData.preferred_academic_year_id),
      });
      // 1. Parent Section Header
      config.layoutRows.splice(0, 0, {
        kind: "custom",
        grid: { xs: 12 },
        render: () => <FormSectionLabel title="Parent / Guardian Information" icon={<PersonIcon />} />,
      });

      // 2. Inject SocietyAutocomplete after the pin_code row
      const pinCodeRowIndex = config.layoutRows.findIndex(
        (row) => row.kind === "fields" && row.fieldNames.includes("pin_code")
      );
      const societyRow = {
        kind: "custom" as const,
        grid: { xs: 12, sm: 3 },
        render: () => (
          <AsyncFreeSoloAutocomplete
            label="Society"
            value={society}
            onChange={setSociety}
            fetchSuggestions={leadService.getSocietySuggestions}
          />
        ),
      };
      config.layoutRows.splice(pinCodeRowIndex + 1, 0, societyRow);

      // 3. Child Section Header
      const childNameIndex = config.layoutRows.findIndex(
        (row) => row.kind === "fields" && row.fieldNames.includes("child_name")
      );
      config.layoutRows.splice(childNameIndex, 0, {
        kind: "custom",
        grid: { xs: 12 },
        render: () => <FormSectionLabel title="Child Information" icon={<ChildCareIcon />} sx={{ mt: 2 }} />,
      });

      // 4. Lead Meta Section Header
      const leadSourceIndex = config.layoutRows.findIndex(
        (row) => row.kind === "fields" && row.fieldNames.includes("lead_source_id")
      );
      config.layoutRows.splice(leadSourceIndex, 0, {
        kind: "custom",
        grid: { xs: 12 },
        render: () => <FormSectionLabel title="Lead Details" icon={<AssignmentIcon />} sx={{ mt: 2 }} />,
      });

      return config;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditMode, sourceOptions, statusOptions, classOptions, academicYearOptions, staffOptions, society, formData.preferred_academic_year_id]
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
