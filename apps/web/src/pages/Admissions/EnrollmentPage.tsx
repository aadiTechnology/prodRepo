import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent, type ReactNode } from "react";
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

import { PageHeader } from "../../components/layout";
import ListPageLayout from "../../components/reusable/ListPageLayout";
import FormFieldRenderer from "../../components/reusable/FormFieldRenderer";
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
import type { FormRenderContext } from "../../components/reusable/formFramework.types";
import { createEnrollmentFormConfig, type EnrollmentFormData } from "./EnrollmentPage.formConfig";

type LeadOption = { id: number; label: string };
type FeePlanOption = { id: number; name: string; total_amount?: number };
type DiscountOption = {
  id: number;
  discount_name: string;
  discount_type: string;
  discount_value: number;
  applicable_class?: string | null;
};

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

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingBirthCert, setUploadingBirthCert] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [birthCertName, setBirthCertName] = useState<string>("");
  const [photoName, setPhotoName] = useState<string>("");
  const birthCertInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);

  const [academicYears, setAcademicYears] = useState<{ id: number; name: string }[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlanOption[]>([]);
  const [discounts, setDiscounts] = useState<DiscountOption[]>([]);

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
  const { formData, setFormData, fieldErrors, handleChange, handleFieldValueChange, handleSubmit } =
    useFormManager<EnrollmentFormData>({
      initialValues,
      validationConfig,
      onClearError: () => setError(null),
    });

  const discountById = useMemo(() => {
    const map = new Map<number, DiscountOption>();
    discounts.forEach((d) => map.set(d.id, d));
    return map;
  }, [discounts]);

  useEffect(() => {
    academicYearService
      .getAll()
      .then((data: any) => {
        const items = data?.data || data || [];
        setAcademicYears(items.map((y: any) => ({ id: Number(y.id), name: y.name || String(y.id) })));
      })
      .catch(() => {});

    leadService
      .list({ page: 1, page_size: 100 })
      .then((res) => {
        const items = res?.data || [];
        setLeadOptions(items.map((l: any) => ({ id: l.id, label: `${l.child_name} (${l.lead_code})` })));
      })
      .catch(() => {});

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
      .catch((err: any) => {
        console.error("Unable to load discounts for enrollment:", err);
        setDiscounts([]);
      });
  }, []);

  useEffect(() => {
    if (!leadId) return;
    const idNum = Number(leadId);
    if (!Number.isFinite(idNum)) return;
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
      .catch(() => {});
  }, [leadId, setFormData]);

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

  useEffect(() => {
    const selectedClass = classes.find((x) => x.id === Number(formData.class_id));
    const nextDivisions = selectedClass?.divisions || [];
    setDivisions(nextDivisions);
    if (formData.class_division_id && !nextDivisions.some((d) => d.id === Number(formData.class_division_id))) {
      setFormData((prev) => ({ ...prev, class_division_id: "" }));
    }
  }, [formData.class_id, classes, formData.class_division_id, setFormData]);

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

  const submit = async (mode: "enroll" | "print") => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await enrollmentService.enroll(buildPayload());
      setSuccess(res.message || "Enrollment completed successfully");
      if (mode === "print") {
        navigate("/admissions/enrollment/print", { state: res.printable });
      } else {
        setTimeout(() => navigate("/students"), 700);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Enrollment failed. Please try again");
    } finally {
      setLoading(false);
    }
  };

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

  const selectedDiscountLabel = useMemo(() => {
    if (!formData.discount_id) return "None";
    const discount = discountById.get(Number(formData.discount_id));
    if (!discount) return "None";
    return `${discount.discount_name} (${discount.discount_type} ${discount.discount_value})`;
  }, [discountById, formData.discount_id]);

  const filteredDiscounts = useMemo(() => {
    const selectedClass = classes.find((item) => item.id === Number(formData.class_id));
    const className = (selectedClass?.name || "").trim().toLowerCase();
    if (!className) return [];
    return discounts.filter((discount) => {
      const applicableClass = (discount.applicable_class || "").trim().toLowerCase();
      return applicableClass === className;
    });
  }, [classes, discounts, formData.class_id]);

  useEffect(() => {
    if (!formData.discount_id) return;
    const stillValid = filteredDiscounts.some((discount) => discount.id === Number(formData.discount_id));
    if (!stillValid) {
      setFormData((prev) => ({ ...prev, discount_id: "" }));
    }
  }, [filteredDiscounts, formData.discount_id, setFormData]);

  useEffect(() => {
    if (!formData.fee_structure_id) return;
    const stillValid = feePlans.some((plan) => plan.id === Number(formData.fee_structure_id));
    if (!stillValid) {
      setFormData((prev) => ({ ...prev, fee_structure_id: "" }));
    }
  }, [feePlans, formData.fee_structure_id, setFormData]);

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
  const discountOptions = useMemo(
    () =>
      filteredDiscounts.map((discount) => ({
        id: String(discount.id),
        label: discount.discount_name,
        value: String(discount.id),
      })),
    [filteredDiscounts]
  );

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

    const insertSectionBefore = (fieldName: keyof EnrollmentFormData, title: string, icon: ReactNode) => {
      const idx = config.layoutRows.findIndex(
        (row) => row.kind === "fields" && row.fieldNames.includes(fieldName)
      );
      if (idx >= 0) {
        config.layoutRows.splice(idx, 0, {
          kind: "custom",
          grid: { xs: 12 },
          render: () => <FormSectionLabel title={title} icon={icon} sx={{ mt: 1 }} />,
        });
      }
    };

    config.layoutRows.splice(0, 0, {
      kind: "custom",
      grid: { xs: 12 },
      render: () => <FormSectionLabel title="Convert from Lead (Optional)" icon={<PersonSearchIcon />} />,
    });
    config.layoutRows.splice(1, 0, {
      kind: "custom",
      grid: { xs: 12 },
      render: () => (
        <Autocomplete
          options={leadOptions}
          value={selectedLead}
          onChange={(_, value) => {
            setSelectedLead(value);
            if (!value) return;
            void prefillFromLead(value).catch(() => {});
          }}
          renderInput={(params) => <TextField {...params} label="Select Lead" placeholder="Search lead..." sx={{ mt: 0.5 }} />}
        />
      ),
    });

    insertSectionBefore("student_name", "Student Information", <ChildCareIcon />);
    insertSectionBefore("admission_no", "Admission Details", <AssignmentIcon />);
    insertSectionBefore("class_id", "Class Allocation", <ClassIcon />);
    insertSectionBefore("parent_name", "Parent Details", <Groups2Icon />);
    insertSectionBefore("fee_structure_id", "Fee Details", <PaymentsIcon />);

    const discountRowIndex = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("discount_id")
    );
    if (discountRowIndex >= 0) {
      config.layoutRows.splice(discountRowIndex + 1, 0, {
        kind: "custom",
        grid: { xs: 12 },
        render: () => (
          <Box sx={{ bgcolor: "grey.50", border: "1px dashed", borderColor: "grey.300", borderRadius: 2, p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Discount Preview: <strong>{selectedDiscountLabel}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Fee: <strong>{feePreview.total.toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Discount Amount: <strong>{feePreview.discountAmount.toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Final Payable: <strong>{feePreview.finalAmount.toFixed(2)}</strong>
            </Typography>
          </Box>
        ),
      });
      config.layoutRows.splice(discountRowIndex + 2, 0, {
        kind: "custom",
        grid: { xs: 12 },
        render: () => <FormSectionLabel title="Documents Upload" icon={<UploadFileIcon />} sx={{ mt: 1.5 }} />,
      });
      config.layoutRows.splice(discountRowIndex + 3, 0, {
        kind: "custom",
        grid: { xs: 12 },
        render: () => (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => birthCertInputRef.current?.click()}
                disabled={uploadingBirthCert}
              >
                {uploadingBirthCert ? "Uploading Birth Cert..." : "Upload Birth Cert"}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {birthCertName || "No birth certificate selected"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? "Uploading Photo..." : "Upload Photo"}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {photoName || "No photo selected"}
              </Typography>
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
    feePreview.discountAmount,
    feePreview.finalAmount,
    feePreview.total,
    leadOptions,
    photoName,
    selectedDiscountLabel,
    selectedLead,
    divisionOptions,
    uploadingBirthCert,
    uploadingPhoto,
  ]);

  const renderCtx: FormRenderContext<EnrollmentFormData> = {
    formData,
    fieldErrors,
    isEditMode: false,
    handleChange,
    handleFieldValueChange,
    setFormData,
    setError,
  };

  const runSubmit = (e: FormEvent | MouseEvent, mode: "enroll" | "print") => {
    e.preventDefault();
    handleSubmit(e as FormEvent, () => {
      void submit(mode);
    });
  };

  return (
    <ListPageLayout
      pageBackground
      scrollableFormContent
      header={
        <Box sx={{ mb: 2 }}>
          <PageHeader
            links={[{ title: "Admissions", path: "/admissions/leads" }, { title: "Enrollment", path: "#" }]}
            homePath="/"
            actions={
              <Button variant="outlined" onClick={() => navigate(-1)} disabled={loading}>
                Cancel
              </Button>
            }
          />
          {error ? (
            <Alert severity="error" variant="filled" sx={{ mt: 2, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}
          {success ? (
            <Alert severity="success" variant="filled" sx={{ mt: 2, borderRadius: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          ) : null}
        </Box>
      }
    >
      <Box sx={{ px: { xs: 0, sm: 1 }, pb: 3 }}>
        <form onSubmit={(e) => runSubmit(e, "enroll")} autoComplete="off">
          <Grid container spacing={2.5}>
            {formConfig.layoutRows.map((row, idx) => {
              if (row.kind === "custom") {
                return (
                  <Grid key={`custom-${idx}`} size={row.grid}>
                    {row.render(renderCtx)}
                  </Grid>
                );
              }
              return (
                <Grid key={`fields-${idx}`} size={row.grid}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
                    {row.fieldNames.map((fieldName) => {
                      const field = formConfig.fields[fieldName];
                      if (!field) return null;
                      return <FormFieldRenderer<EnrollmentFormData> key={fieldName} field={field} ctx={renderCtx} />;
                    })}
                  </Box>
                </Grid>
              );
            })}
          </Grid>

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

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mt: 4, flexWrap: "wrap" }}>
            <Button type="submit" variant="contained" disabled={loading || !canEnroll}>
              Enroll
            </Button>
            <Button variant="outlined" onClick={(e) => runSubmit(e, "print")} disabled={loading || !canEnroll}>
              Save & Print
            </Button>
            <Button variant="text" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </Button>
          </Box>
        </form>
      </Box>
    </ListPageLayout>
  );
}
