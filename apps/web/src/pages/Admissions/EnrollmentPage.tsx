import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Autocomplete, Box, Button, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import dayjs from "dayjs";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ClassIcon from "@mui/icons-material/Class";
import Groups2Icon from "@mui/icons-material/Groups2";
import PaymentsIcon from "@mui/icons-material/Payments";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import PersonIcon from "@mui/icons-material/Person";
import ClearIcon from "@mui/icons-material/Clear";
import { IconButton } from "@mui/material";

import BaseForm from "../../components/reusable/BaseForm";
import FormSectionLabel from "../../components/reusable/FormSectionLabel";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";
import { useFormManager } from "../../hooks/useFormManager";
import leadService from "../../api/services/leadService";
import enrollmentService, { type EnrollmentCreatePayload } from "../../api/services/enrollmentService";
import academicYearService from "../../api/services/academicYearService";
import schoolClassService, { type SchoolClass, type ClassDivision } from "../../api/services/schoolClassService";
import feeDiscountService from "../../api/services/feeDiscountService";
import apiClient from "../../api/client";
import { createEnrollmentFormConfig, type EnrollmentFormData } from "./EnrollmentPage.formConfig";

interface LeadOption {
  id: number;
  label: string;
}

interface FeePlanOption {
  id: number;
  name: string;
  total_amount?: number;
}

interface DiscountOption {
  id: number;
  discount_name: string;
  discount_type: string;
  discount_value: number;
  applicable_class?: string | null;
}

const emptyForm = (): EnrollmentFormData => ({
  student_name: "",
  date_of_birth: "",
  gender: "",
  admission_no: "",
  admission_date: dayjs().format("YYYY-MM-DD"),
  academic_year_id: "",
  class_id: "",
  class_division_id: "",
  parent_name: "",
  mobile_number: "",
  email: "",
  fee_structure_id: "",
  discount_id: "",
  birth_certificate_url: "",
  photo_url: "",
});

export default function EnrollmentPage() {
  const navigate = useNavigate();
  const { leadId } = useParams<{ leadId?: string }>();
  const { user } = useAuth();
  const { hasPermission } = useRBAC();

  const canEnroll = hasPermission("ADMISSIONS_MGMT:create") || hasPermission("ADMISSIONS_MGMT:edit") || user?.role === "SUPER_ADMIN";

  const tenantId = (user as any)?.tenant?.id ?? (user as any)?.tenant_id ?? null;

  // Core form state
  const [error, setError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(Boolean(leadId));
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lead selection state
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);

  // Dropdown options
  const [academicYears, setAcademicYears] = useState<{ id: number; name: string }[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlanOption[]>([]);
  const [discounts, setDiscounts] = useState<DiscountOption[]>([]);

  // Document upload state
  const [uploadingBirthCert, setUploadingBirthCert] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [birthCertName, setBirthCertName] = useState<string>("");
  const [photoName, setPhotoName] = useState<string>("");
  const birthCertInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const initialValues = useMemo(() => emptyForm(), []);
  const validationConfig = useMemo(
    () => ({
      student_name: [{ type: "required" as const, message: "Student name is required." }],
      date_of_birth: [{ type: "required" as const, message: "Date of birth is required." }],
      parent_name: [{ type: "required" as const, message: "Parent name is required." }],
      admission_date: [{ type: "required" as const, message: "Admission date is required." }],
      academic_year_id: [{ type: "required" as const, message: "Academic year is required." }],
      class_id: [{ type: "required" as const, message: "Class is required." }],
      fee_structure_id: [{ type: "required" as const, message: "Fee plan is required." }],
      mobile_number: [
        { type: "required" as const, message: "Contact number is required." },
        { type: "pattern" as const, regex: /^\d{10,15}$/, message: "Contact number must be 10 to 15 digits." },
      ],
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
  } = useFormManager<EnrollmentFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  const discountById = useMemo(() => {
    const map = new Map<number, DiscountOption>();
    discounts.forEach((d) => map.set(d.id, d));
    return map;
  }, [discounts]);

  // Load initial dropdown data
  useEffect(() => {
    academicYearService
      .getAll()
      .then((data: any) => {
        const items = data?.data || data || [];
        setAcademicYears(items.map((y: any) => ({ id: Number(y.id), name: y.name || String(y.id) })));
      })
      .catch(() => { });

    leadService
      .list({ page: 1, page_size: 100 })
      .then((res) => {
        const items = res?.data || [];
        setLeadOptions(items.map((l: any) => ({ id: l.id, label: `${l.child_name} (${l.lead_code})` })));
      })
      .catch(() => { });

    feeDiscountService
      .list({ page: 1, page_size: 100 })
      .then((res: any) => {
        const items = res?.data || res || [];
        setDiscounts(
          items
            .filter((d: any) => d?.status === true || d?.status === 1)
            .map((d: any) => ({
              id: Number(d.id),
              discount_name: d.discount_name,
              discount_type: d.discount_type,
              discount_value: Number(d.discount_value),
              applicable_class: d.applicable_class ?? null,
            }))
        );
      })
      .catch(() => {
        setDiscounts([]);
      });
  }, []);

  // Prefill from lead if leadId param exists
  useEffect(() => {
    if (!leadId) {
      setFetchLoading(false);
      return;
    }
    const idNum = Number(leadId);
    if (!Number.isFinite(idNum)) {
      setFetchLoading(false);
      return;
    }
    enrollmentService
      .prefillFromLead(idNum)
      .then((prefill) => {
        setSelectedLead({ id: prefill.lead_id, label: `Lead #${prefill.lead_id}` });
        setFormData((prev) => ({
          ...prev,
          student_name: prefill.student_name ?? prev.student_name,
          date_of_birth: prefill.date_of_birth ?? prev.date_of_birth,
          gender: prefill.gender ?? prev.gender,
          parent_name: prefill.parent_name ?? prev.parent_name,
          mobile_number: prefill.mobile_number ?? prev.mobile_number,
          email: prefill.email ?? prev.email,
          academic_year_id: prefill.academic_year_id ? String(prefill.academic_year_id) : prev.academic_year_id,
          class_id: prefill.class_id ? String(prefill.class_id) : prev.class_id,
          admission_date: prefill.expected_admission_date ?? prev.admission_date,
        }));
      })
      .catch(() => { })
      .finally(() => setFetchLoading(false));
  }, [leadId, setFormData]);

  // Load classes when academic year changes
  useEffect(() => {
    if (!formData.academic_year_id) {
      setClasses([]);
      return;
    }
    schoolClassService
      .getAll({ academic_year_id: Number(formData.academic_year_id) } as any)
      .then((data: any[]) => setClasses(data || []))
      .catch(() => setClasses([]));
  }, [formData.academic_year_id]);

  // Load divisions when class changes
  useEffect(() => {
    const selectedClass = classes.find((x) => x.id === Number(formData.class_id));
    const nextDivisions = selectedClass?.divisions || [];
    setDivisions(nextDivisions);
    if (formData.class_division_id && !nextDivisions.some((d) => d.id === Number(formData.class_division_id))) {
      setFormData((prev) => ({ ...prev, class_division_id: "" }));
    }
  }, [formData.class_id, classes, formData.class_division_id, setFormData]);

  // Load fee plans when academic year or class changes
  useEffect(() => {
    if (!formData.academic_year_id || !formData.class_id || !tenantId) {
      setFeePlans([]);
      return;
    }
    apiClient
      .get("/api/fee-structures", {
        params: {
          academicYear: Number(formData.academic_year_id),
          classId: Number(formData.class_id),
          tenantId: Number(tenantId),
        },
      })
      .then((res) => {
        const rows = (res.data || []) as any[];
        setFeePlans(
          rows.map((row) => ({
            id: Number(row.id),
            name: row.name,
            total_amount: row.total_amount != null ? Number(row.total_amount) : undefined,
          }))
        );
      })
      .catch(() => setFeePlans([]));
  }, [formData.academic_year_id, formData.class_id, tenantId]);

  // Document upload handler
  const uploadDocument = async (
    file: File,
    documentType: "birth_certificate" | "photo"
  ) => {
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError("File size must be 5MB or less");
      return;
    }

    const isPhoto = documentType === "photo";
    const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
    const allowedBirthTypes = [...allowedPhotoTypes, "application/pdf"];
    const allowed = isPhoto ? allowedPhotoTypes : allowedBirthTypes;
    if (!allowed.includes(file.type)) {
      setError(isPhoto ? "Photo must be JPG/PNG/WEBP" : "Birth certificate must be PDF/JPG/PNG/WEBP");
      return;
    }

    setError(null);
    if (isPhoto) setUploadingPhoto(true);
    else setUploadingBirthCert(true);

    try {
      const response = await enrollmentService.uploadDocument(file, documentType);
      if (isPhoto) {
        setPhotoName(response.file_name);
        setFormData((prev) => ({ ...prev, photo_url: response.file_url }));
      } else {
        setBirthCertName(response.file_name);
        setFormData((prev) => ({ ...prev, birth_certificate_url: response.file_url }));
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Unable to upload document");
    } finally {
      if (isPhoto) setUploadingPhoto(false);
      else setUploadingBirthCert(false);
    }
  };

  const onBirthCertSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadDocument(file, "birth_certificate");
    if (birthCertInputRef.current) birthCertInputRef.current.value = "";
  };

  const onPhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadDocument(file, "photo");
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  // Build submission payload
  const buildPayload = (): EnrollmentCreatePayload => ({
    lead_id: selectedLead?.id ?? null,
    student_name: formData.student_name.trim(),
    date_of_birth: formData.date_of_birth,
    gender: formData.gender || null,
    admission_no: formData.admission_no.trim() || null,
    admission_date: formData.admission_date,
    academic_year_id: Number(formData.academic_year_id),
    class_id: Number(formData.class_id),
    class_division_id: formData.class_division_id ? Number(formData.class_division_id) : null,
    parent_name: formData.parent_name.trim(),
    mobile_number: formData.mobile_number.trim(),
    email: formData.email.trim() || null,
    fee_structure_id: Number(formData.fee_structure_id),
    discount_id: formData.discount_id ? Number(formData.discount_id) : null,
    additional_fee: null,
    birth_certificate_url: formData.birth_certificate_url.trim() || null,
    photo_url: formData.photo_url.trim() || null,
  });

  // Submit handler
  const handleConfirmSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await enrollmentService.enroll(buildPayload());
      setSnackbar(res.message || "Enrollment completed successfully");
      setTimeout(() => navigate("/students"), 1000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Enrollment failed. Please try again");
    } finally {
      setLoading(false);
    }
  };

  const academicYearOptions = useMemo(
    () => academicYears.map((year) => ({ id: String(year.id), label: year.name, value: String(year.id) })),
    [academicYears]
  );
  const classOptions = useMemo(
    () => classes.map((item) => ({ id: String(item.id), label: item.name, value: String(item.id) })),
    [classes]
  );
  const divisionOptions = useMemo(
    () =>
      divisions.map((division) => ({
        id: String(division.id),
        label: division.division_name,
        value: String(division.id),
      })),
    [divisions]
  );
  const feePlanOptions = useMemo(
    () => feePlans.map((plan) => ({ id: String(plan.id), label: plan.name, value: String(plan.id) })),
    [feePlans]
  );

  // Filter discounts by class BEFORE using in discountOptions
  const filteredDiscounts = useMemo(() => {
    const selectedClass = classes.find((item) => item.id === Number(formData.class_id));
    const className = (selectedClass?.name || "").trim().toLowerCase();
    if (!className) return [];
    return discounts.filter((discount) => {
      const applicableClass = (discount.applicable_class || "").trim().toLowerCase();
      return applicableClass === className;
    });
  }, [classes, discounts, formData.class_id]);

  const discountOptions = useMemo(
    () =>
      filteredDiscounts.map((discount) => ({
        id: String(discount.id),
        label: discount.discount_name,
        value: String(discount.id),
      })),
    [filteredDiscounts]
  );

  const selectedDiscountLabel = useMemo(() => {
    if (!formData.discount_id) return "None";
    const discount = discountById.get(Number(formData.discount_id));
    if (!discount) return "None";
    return `${discount.discount_name} (${discount.discount_type} ${discount.discount_value})`;
  }, [discountById, formData.discount_id]);

  const feePreview = useMemo(() => {
    const feePlan = feePlans.find((item) => item.id === Number(formData.fee_structure_id));
    const total = Number(feePlan?.total_amount || 0);
    const discount = discountById.get(Number(formData.discount_id));
    if (!discount) {
      return { total, discountAmount: 0, finalAmount: total };
    }

    const type = String(discount.discount_type || "").toLowerCase();
    let discountAmount = 0;
    if (type.includes("percent")) {
      discountAmount = (total * Number(discount.discount_value || 0)) / 100;
    } else {
      discountAmount = Number(discount.discount_value || 0);
    }
    discountAmount = Math.max(0, Math.min(discountAmount, total));
    return {
      total,
      discountAmount,
      finalAmount: Math.max(0, total - discountAmount),
    };
  }, [discountById, feePlans, formData.fee_structure_id, formData.discount_id]);

  // Sync discount validity when filtered options change
  useEffect(() => {
    if (!formData.discount_id) return;
    const stillValid = filteredDiscounts.some((discount) => discount.id === Number(formData.discount_id));
    if (!stillValid) {
      setFormData((prev) => ({ ...prev, discount_id: "" }));
    }
  }, [filteredDiscounts, formData.discount_id, setFormData]);

  // Sync fee plan validity when options change
  useEffect(() => {
    if (!formData.fee_structure_id) return;
    const stillValid = feePlans.some((plan) => plan.id === Number(formData.fee_structure_id));
    if (!stillValid) {
      setFormData((prev) => ({ ...prev, fee_structure_id: "" }));
    }
  }, [feePlans, formData.fee_structure_id, setFormData]);

  const prefillFromLead = async (selected: LeadOption) => {
    const prefill = await enrollmentService.prefillFromLead(selected.id);
    setFormData((prev) => ({
      ...prev,
      student_name: prefill.student_name ?? prev.student_name,
      date_of_birth: prefill.date_of_birth ?? prev.date_of_birth,
      gender: prefill.gender ?? prev.gender,
      parent_name: prefill.parent_name ?? prev.parent_name,
      mobile_number: prefill.mobile_number ?? prev.mobile_number,
      email: prefill.email ?? prev.email,
      academic_year_id: prefill.academic_year_id ? String(prefill.academic_year_id) : prev.academic_year_id,
      class_id: prefill.class_id ? String(prefill.class_id) : prev.class_id,
      admission_date: prefill.expected_admission_date ?? prev.admission_date,
    }));
  };

  const formConfig = useMemo(() => {
    const config = createEnrollmentFormConfig({
      academicYearOptions,
      classOptions,
      divisionOptions,
      feePlanOptions,
      discountOptions,
    });

    // 1. Lead Selection Header
    config.layoutRows.splice(0, 0, {
      kind: "custom" as const,
      grid: { xs: 12 },
      render: (ctx) => <FormSectionLabel title="Convert from Lead (Optional)" icon={<PersonSearchIcon />} />,
    });

    // 2. Lead Selection Autocomplete
    config.layoutRows.splice(1, 0, {
      kind: "custom" as const,
      grid: { xs: 12 },
      render: (ctx) => (
        <Autocomplete
          options={leadOptions}
          value={selectedLead}
          onChange={(_, value) => {
            setSelectedLead(value);
            if (!value) return;
            void prefillFromLead(value).catch(() => { });
          }}
          renderInput={(params) => (
            <TextField {...params} label="Select Lead" placeholder="Search lead..." />
          )}
        />
      ),
    });

    // 3. Student Section Header
    const studentNameIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("student_name")
    );
    if (studentNameIdx >= 0) {
      config.layoutRows.splice(studentNameIdx, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => <FormSectionLabel title="Student Information" icon={<ChildCareIcon />} sx={{ mt: 2 }} />,
      });
    }

    // 4. Admission Section Header
    const admissionNoIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("admission_no")
    );
    if (admissionNoIdx >= 0) {
      config.layoutRows.splice(admissionNoIdx, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => <FormSectionLabel title="Admission Details" icon={<AssignmentIcon />} sx={{ mt: 2 }} />,
      });
    }

    // 5. Class Section Header
    const classIdIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("class_id")
    );
    if (classIdIdx >= 0) {
      config.layoutRows.splice(classIdIdx, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => <FormSectionLabel title="Class Allocation" icon={<ClassIcon />} sx={{ mt: 2 }} />,
      });
    }

    // 6. Parent Section Header
    const parentNameIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("parent_name")
    );
    if (parentNameIdx >= 0) {
      config.layoutRows.splice(parentNameIdx, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => <FormSectionLabel title="Parent Details" icon={<Groups2Icon />} sx={{ mt: 2 }} />,
      });
    }

    // 7. Fee Section Header and Preview
    const feeStructureIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("fee_structure_id")
    );
    if (feeStructureIdx >= 0) {
      config.layoutRows.splice(feeStructureIdx, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => <FormSectionLabel title="Fee Details" icon={<PaymentsIcon />} sx={{ mt: 2 }} />,
      });
    }

    // 8. Discount Preview Box
    const discountIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("discount_id")
    );
    if (discountIdx >= 0) {
      config.layoutRows.splice(discountIdx + 1, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => (
          <Box sx={{ bgcolor: "grey.50", border: "1px dashed", borderColor: "grey.300", borderRadius: 2, p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Discount: <strong>{selectedDiscountLabel}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total: Rs. {feePreview.total.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Discount: Rs. {feePreview.discountAmount.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
              Final: Rs. {feePreview.finalAmount.toFixed(2)}
            </Typography>
          </Box>
        ),
      });
    }

    // 9. Documents Section Header
    const birthCertIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("birth_certificate_url")
    );
    if (birthCertIdx >= 0) {
      config.layoutRows.splice(birthCertIdx, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => <FormSectionLabel title="Documents Upload" icon={<UploadFileIcon />} sx={{ mt: 2 }} />,
      });
    }

    // 10. Document Upload Buttons
    const photoIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("photo_url")
    );
    if (photoIdx >= 0) {
      config.layoutRows.splice(photoIdx + 1, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => birthCertInputRef.current?.click()}
                disabled={uploadingBirthCert}
              >
                {uploadingBirthCert ? "Uploading..." : "Upload Birth Cert"}
              </Button>
              {birthCertName && (
                <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, px: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {birthCertName}
                  </Typography>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => {
                      setBirthCertName("");
                      setFormData(prev => ({ ...prev, birth_certificate_url: "" }));
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? "Uploading..." : "Upload Photo"}
              </Button>
              {photoName && (
                <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, px: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {photoName}
                  </Typography>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => {
                      setPhotoName("");
                      setFormData(prev => ({ ...prev, photo_url: "" }));
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              )}
            </Grid>
          </Grid>
        ),
      });
    }

    return config;
  }, [
    academicYearOptions,
    birthCertName,
    classOptions,
    discountOptions,
    feePlanOptions,
    feePreview,
    leadOptions,
    photoName,
    selectedDiscountLabel,
    selectedLead,
    divisionOptions,
    uploadingBirthCert,
    uploadingPhoto,
    prefillFromLead,
    discountById,
  ]);

  return (
    <>
      <input
        ref={birthCertInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        style={{ display: "none" }}
        onChange={(e) => void onBirthCertSelected(e)}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        style={{ display: "none" }}
        onChange={(e) => void onPhotoSelected(e)}
      />
      <BaseForm<EnrollmentFormData>
        formConfig={formConfig}
        formData={formData}
        setFormData={setFormData}
        fieldErrors={fieldErrors}
        handleChange={handleChange}
        handleFieldValueChange={handleFieldValueChange}
        handleSubmit={handleSubmit}
        setFormError={setError}
        onConfirmSubmit={handleConfirmSubmit}
        isEditMode={false}
        loading={loading}
        fetchLoading={fetchLoading}
        error={error}
        onErrorDismiss={() => setError(null)}
        snackbar={snackbar}
        onSnackbarClose={() => setSnackbar(null)}
        headerConfig={{
          links: [
            { title: "Admissions", path: "/admissions/leads" },
            { title: "Enrollment", path: "#" },
          ],
          homePath: "/",
          cancelTooltip: "Cancel",
          saveTooltipCreate: "Enroll Student",
        }}
        onCancelNavigate={() => navigate(-1)}
        confirmMessage={() => "Are you sure you want to enroll this student?"}
        canSubmit={canEnroll}
      />
    </>
  );
}
