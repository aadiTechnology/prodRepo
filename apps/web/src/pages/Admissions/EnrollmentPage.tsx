import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Autocomplete, Box, Button, FormHelperText, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import dayjs from "dayjs";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ClassIcon from "@mui/icons-material/Class";
import Groups2Icon from "@mui/icons-material/Groups2";
import PaymentsIcon from "@mui/icons-material/Payments";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { IconButton } from "@mui/material";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";

import BaseForm from "../../components/reusable/BaseForm";
import FormSectionLabel from "../../components/reusable/FormSectionLabel";
import { DataTable, TableRowActions } from "../../components/reusable";
import { useConfigHubNavigation } from "../../hooks/useConfigHubNavigation";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";
import { useFormManager } from "../../hooks/useFormManager";
import { dateOfBirthNotFutureRule } from "../../utils/formValidation";
import { requiredContactNumberRules } from "../../utils/formValidationPresets";
import { EMAIL_PATTERN } from "../../utils/validationPatterns";
import leadService from "../../api/services/leadService";
import enrollmentService, { type EnrollmentCreatePayload } from "../../api/services/enrollmentService";
import studentService, { type StudentDetails } from "../../api/services/studentService";
import academicYearService from "../../api/services/academicYearService";
import schoolClassService, { type SchoolClass, type ClassDivision } from "../../api/services/schoolClassService";
import feeDiscountService from "../../api/services/feeDiscountService";
import apiClient from "../../api/client";
import { createEnrollmentFormConfig, type EnrollmentFormData } from "./EnrollmentPage.formConfig";
import StudentDetailsView from "./StudentDetailsView";
import { resolveCurrentAcademicYearId } from "../../utils/academicYear";

interface LeadOption {
  id: number;
  label: string;
}

function buildLeadDisplayLabel(
  leadId: number,
  studentName?: string | null,
  leadOptions?: LeadOption[]
): string {
  const match = leadOptions?.find((o) => o.id === leadId);
  if (match) return match.label;
  const name = studentName?.trim();
  if (name) return name;
  return `Lead #${leadId}`;
}

interface FeePlanInstallment {
  installment_number: number;
  amount: number;
  due_date?: string | null;
}

interface FeePlanOption {
  id: number;
  name: string;
  total_amount?: number;
  installment_type?: string | null;
  num_installments?: number;
  installments?: FeePlanInstallment[];
}

interface DiscountOption {
  id: number;
  discount_name: string;
  discount_type: string;
  discount_value: number;
  applicable_class?: string | null;
}

type StudentFeeInstallmentDraft = {
  installment_no: number;
  amount: string;
  due_date: string;
};

type SavedCustomFeePlan = {
  annual: number;
  discount: number;
  installments: StudentFeeInstallmentDraft[];
};

const mapPlanInstallments = (raw?: FeePlanInstallment[] | null): StudentFeeInstallmentDraft[] =>
  (raw || [])
    .map((item, index) => ({
      installment_no: Number(item.installment_number || index + 1),
      amount: Number(item.amount || 0).toFixed(2),
      due_date: toDateInputValue(item.due_date),
    }))
    .sort((a, b) => a.installment_no - b.installment_no)
    .map((item, index) => ({ ...item, installment_no: index + 1 }));

const installmentDraftTotal = (rows: StudentFeeInstallmentDraft[]): number =>
  rows.reduce((acc, row) => acc + Number(row.amount || 0), 0);

type StudentViewMeta = {
  academic_year_name?: string;
  class_name?: string;
  class_division_name?: string;
  fee_structure_name?: string;
  discount_name?: string;
};

const VIEW_FALLBACK_VALUES = {
  academicYear: "__view_academic_year__",
  classDivision: "__view_class_division__",
  feePlan: "__view_fee_plan__",
  discount: "__view_discount__",
} as const;

const viewModeFieldSx = {
  "& .MuiInputBase-input.Mui-disabled": {
    color: "text.primary",
    WebkitTextFillColor: "rgba(0, 0, 0, 0.87)",
  },
  "& .MuiSelect-select.Mui-disabled": {
    color: "text.primary",
    WebkitTextFillColor: "rgba(0, 0, 0, 0.87)",
  },
  "& .MuiSvgIcon-root": {
    color: "text.secondary",
  },
} as const;

const sectionTitleSx = { mt: 1.25 } as const;

const MAX_ENROLLMENT_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ENROLLMENT_DOCUMENT_SIZE_HINT = "Document should be 5MB or less.";

const emptyForm = (): EnrollmentFormData => ({
  student_name: "",
  date_of_birth: "",
  gender: "",
  admission_no: "",
  roll_no: "",
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
  is_active: true,
});

const toDateInputValue = (value?: string | null): string => {
  if (!value) return "";
  const v = String(value).trim();
  if (!v) return "";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const ddmmyyyy = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(v);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  const parsed = dayjs(v);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

const normalizeGender = (value?: string | null): string => {
  const v = String(value || "").trim().toLowerCase();
  if (v === "male") return "Male";
  if (v === "female") return "Female";
  if (v === "other") return "Other";
  return "";
};

const fileNameFromUrl = (url?: string | null): string => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  const cleanUrl = trimmed.split("?")[0].split("#")[0];
  const parts = cleanUrl.split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
};

const toAbsoluteAssetUrl = (url?: string | null): string => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = (apiClient.defaults.baseURL || "").replace(/\/$/, "");
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${normalizedPath}`;
};

export default function EnrollmentPage() {
  const navigate = useNavigate();
  const { buildFormBreadcrumbs, navigateWithConfigHub, navigateToList, fromConfigHub } =
    useConfigHubNavigation();
  const studentListPath = "/students";
  const { leadId, studentId: routeStudentId } = useParams<{ leadId?: string; studentId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasPermission } = useRBAC();
  const isEditMode = searchParams.get("mode") === "edit";
  const isViewMode = searchParams.get("mode") === "view";
  const isStudentAddMode = searchParams.get("source") === "students" && !isEditMode && !isViewMode;
  const isStudentFlow = isStudentAddMode || isEditMode || isViewMode;
  const editStudentId = searchParams.get("studentId") || routeStudentId;
  const fromLeadQueryId = searchParams.get("fromLead");
  const prefillLeadId = leadId || fromLeadQueryId;

  const enrollmentPageTitle = isViewMode
    ? "Student Details"
    : isEditMode
      ? "Edit"
      : isStudentAddMode
        ? "Add"
        : "Enrollment";

  const enrollmentHeaderLinks = useMemo(() => {
    if (isStudentFlow && fromConfigHub) {
      return buildFormBreadcrumbs(
        { title: "Student Management", path: studentListPath },
        enrollmentPageTitle
      );
    }
    return [
      {
        title: isStudentFlow ? "Students" : "Lead Management",
        path: isStudentFlow ? studentListPath : "/admissions/leads",
      },
      { title: enrollmentPageTitle, path: "#" },
    ];
  }, [
    buildFormBreadcrumbs,
    enrollmentPageTitle,
    fromConfigHub,
    isStudentFlow,
    studentListPath,
  ]);

  const canEnroll = hasPermission("ADMISSIONS_MGMT:create") || hasPermission("ADMISSIONS_MGMT:edit") || user?.role === "SUPER_ADMIN";

  const tenantId = (user as any)?.tenant?.id ?? (user as any)?.tenant_id ?? null;

  // Core form state
  const [error, setError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(
    Boolean(leadId) ||
      Boolean(fromLeadQueryId) ||
      Boolean((isEditMode || isViewMode) && editStudentId)
  );
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lead selection state
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);

  // Dropdown options
  const [academicYears, setAcademicYears] = useState<
    { id: number; name: string; is_current?: boolean }[]
  >([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  const [feePlans, setFeePlans] = useState<FeePlanOption[]>([]);
  const [feeScheduleMode, setFeeScheduleMode] = useState<"configured" | "customizing" | "customized">("configured");
  const [customAnnualFee, setCustomAnnualFee] = useState("");
  const [customDiscountAmount, setCustomDiscountAmount] = useState("");
  const [customInstallments, setCustomInstallments] = useState<StudentFeeInstallmentDraft[]>([]);
  const [savedCustomFee, setSavedCustomFee] = useState<SavedCustomFeePlan | null>(null);
  const [customFeeError, setCustomFeeError] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<DiscountOption[]>([]);
  const [studentViewMeta, setStudentViewMeta] = useState<StudentViewMeta>({});
  const [studentRecord, setStudentRecord] = useState<StudentDetails | null>(null);

  // Document upload state
  const [uploadingBirthCert, setUploadingBirthCert] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [birthCertName, setBirthCertName] = useState<string>("");
  const [photoName, setPhotoName] = useState<string>("");
  const [documentDeleteTarget, setDocumentDeleteTarget] = useState<
    "birth_certificate" | "photo" | null
  >(null);
  const birthCertInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const initialValues = useMemo(() => emptyForm(), []);
  const validationConfig = useMemo(
    () => ({
      student_name: [{ type: "required" as const, message: "Student name is required." }],
      parent_name: [{ type: "required" as const, message: "Parent name is required." }],
      admission_date: [{ type: "required" as const, message: "Admission date is required." }],
      academic_year_id: [{ type: "required" as const, message: "Academic year is required." }],
      class_id: [{ type: "required" as const, message: "Class is required." }],
      fee_structure_id: [{ type: "required" as const, message: "Fee plan is required." }],
      mobile_number: requiredContactNumberRules<EnrollmentFormData>(),
      date_of_birth: [dateOfBirthNotFutureRule<EnrollmentFormData>()],
      email: [
        { type: "required" as const, message: "Email address is required." },
        { type: "pattern" as const, regex: EMAIL_PATTERN, message: "Invalid email address." },
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
    resetForm,
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
      .listActive()
      .then((data: any) => {
        const items = data?.data || data || [];
        setAcademicYears(
          items.map((y: any) => ({
            id: Number(y.id),
            name: y.name || String(y.id),
            is_current: y.is_current === true || y.is_current === 1,
          }))
        );

        if (!isEditMode && !isViewMode) {
          const currentYearId = resolveCurrentAcademicYearId(items);
          if (currentYearId) {
            setFormData((prev) =>
              prev.academic_year_id ? prev : { ...prev, academic_year_id: currentYearId }
            );
          }
        }
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

    if (!isEditMode && !isViewMode && tenantId) {
      enrollmentService
        .getNextAdmissionNo()
        .then((admissionNo) => {
          if (!admissionNo) return;
          setFormData((prev) =>
            prev.admission_no ? prev : { ...prev, admission_no: admissionNo }
          );
        })
        .catch(() => {});
    }
  }, [isEditMode, isViewMode, setFormData, tenantId]);

  // Prefill from lead if leadId route param or fromLead query exists
  useEffect(() => {
    if (isEditMode || isViewMode) {
      setFetchLoading(false);
      return;
    }
    if (!prefillLeadId) {
      setFetchLoading(false);
      return;
    }
    const idNum = Number(prefillLeadId);
    if (!Number.isFinite(idNum)) {
      setFetchLoading(false);
      return;
    }
    enrollmentService
      .prefillFromLead(idNum)
      .then((prefill) => {
        // Route /from-lead/:leadId is the conversion flow and must keep lead_id bound.
        // Query ?fromLead= is student creation from a converted lead: prefill only, do not re-convert.
        if (leadId) {
        setSelectedLead({
          id: prefill.lead_id,
          label: buildLeadDisplayLabel(prefill.lead_id, prefill.student_name, leadOptions),
        });
        }
        setFormData((prev) => ({
          ...prev,
          student_name: prefill.student_name ?? prev.student_name,
          date_of_birth: toDateInputValue(prefill.date_of_birth) || prev.date_of_birth,
          gender: normalizeGender(prefill.gender) || prev.gender,
          parent_name: prefill.parent_name ?? prev.parent_name,
          mobile_number: prefill.mobile_number ?? prev.mobile_number,
          email: prefill.email ?? prev.email,
          academic_year_id: prefill.academic_year_id
            ? String(prefill.academic_year_id)
            : prev.academic_year_id || resolveCurrentAcademicYearId(academicYears),
          class_id: prefill.class_id ? String(prefill.class_id) : prev.class_id,
          class_division_id: prefill.class_division_id ? String(prefill.class_division_id) : prev.class_division_id,
          admission_date: toDateInputValue(prefill.expected_admission_date) || prev.admission_date,
          fee_structure_id: prefill.fee_structure_id ? String(prefill.fee_structure_id) : prev.fee_structure_id,
          discount_id: prefill.discount_id ? String(prefill.discount_id) : "",
          birth_certificate_url: prefill.birth_certificate_url ?? "",
          photo_url: prefill.photo_url ?? "",
        }));
        setBirthCertName(fileNameFromUrl(prefill.birth_certificate_url));
        setPhotoName(fileNameFromUrl(prefill.photo_url));
      })
      .catch(() => { })
      .finally(() => setFetchLoading(false));
  }, [prefillLeadId, leadId, isEditMode, isViewMode, setFormData, academicYears, leadOptions]);

  // Keep lead dropdown label in sync once options load (e.g. enroll-from-lead route)
  useEffect(() => {
    if (!selectedLead?.id || leadOptions.length === 0) return;
    const match = leadOptions.find((o) => o.id === selectedLead.id);
    if (match && match.label !== selectedLead.label) {
      setSelectedLead(match);
    }
  }, [leadOptions, selectedLead?.id, selectedLead?.label]);

  // Prefill from student if enrollment is used in edit mode
  useEffect(() => {
    if (!isEditMode && !isViewMode) return;
    if (!editStudentId) {
      setError("Student ID is required for edit mode.");
      setFetchLoading(false);
      return;
    }

    setFetchLoading(true);
    studentService
      .getStudentById(editStudentId)
      .then((student) => {
        setStudentRecord(student);
        setStudentViewMeta({
          academic_year_name: student.academic_year_name,
          class_name: student.class_name || student.className,
          class_division_name: student.class_division_name,
          fee_structure_name: student.fee_structure_name,
          discount_name: student.discount_name,
        });
        setFormData((prev) => ({
          ...prev,
          student_name: student.name ?? prev.student_name,
          date_of_birth: toDateInputValue(student.date_of_birth) || prev.date_of_birth,
          gender: normalizeGender(student.gender) || prev.gender,
          admission_no: student.admission_no ?? prev.admission_no,
          roll_no: (student as any).roll_no ?? prev.roll_no,
          admission_date: student.created_at
            ? dayjs(student.created_at).format("YYYY-MM-DD")
            : prev.admission_date,
          academic_year_id: student.academic_year_id
            ? String(student.academic_year_id)
            : student.academic_year_name
              ? VIEW_FALLBACK_VALUES.academicYear
              : prev.academic_year_id,
          class_id: student.class_id ? String(student.class_id) : prev.class_id,
          class_division_id: student.class_division_id
            ? String(student.class_division_id)
            : student.class_division_name
              ? VIEW_FALLBACK_VALUES.classDivision
            : prev.class_division_id,
          fee_structure_id: student.fee_structure_id
            ? String(student.fee_structure_id)
            : student.fee_structure_name
              ? VIEW_FALLBACK_VALUES.feePlan
              : prev.fee_structure_id,
          discount_id: student.discount_id
            ? String(student.discount_id)
            : student.discount_name
              ? VIEW_FALLBACK_VALUES.discount
              : prev.discount_id,
          parent_name: student.parent_name ?? prev.parent_name,
          mobile_number: student.mobile ?? prev.mobile_number,
          email: student.email ?? prev.email,
          photo_url: student.photo_url ?? prev.photo_url,
          birth_certificate_url: student.birth_certificate_url ?? prev.birth_certificate_url,
          is_active: student.is_active !== false,
        }));
        setBirthCertName(fileNameFromUrl(student.birth_certificate_url));
        setPhotoName(fileNameFromUrl(student.photo_url));
      })
      .catch(() => setError("Failed to load student details."))
      .finally(() => setFetchLoading(false));
  }, [editStudentId, isEditMode, isViewMode, setFormData]);

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
    // Preserve prefilled division while class/division options are still loading.
    if (
      selectedClass &&
      formData.class_division_id &&
      !nextDivisions.some((d) => d.id === Number(formData.class_division_id))
    ) {
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
          classDivisionId: formData.class_division_id ? Number(formData.class_division_id) : undefined,
        },
      })
      .then((res) => {
        const rows = (res.data || []) as any[];
        setFeePlans(
          rows.map((row) => {
            const installments = Array.isArray(row.installments)
              ? row.installments
                  .map((item: any, index: number) => ({
                    installment_number: Number(item.installment_number || index + 1),
                    amount: Number(item.amount || 0),
                    due_date: toDateInputValue(item.due_date) || null,
                  }))
                  .sort(
                    (a: FeePlanInstallment, b: FeePlanInstallment) =>
                      a.installment_number - b.installment_number
                  )
              : [];
            return {
            id: Number(row.id),
            name: row.name,
            total_amount: row.total_amount != null ? Number(row.total_amount) : undefined,
              installment_type: row.installment_type || null,
              num_installments: row.num_installments != null ? Number(row.num_installments) : installments.length,
              installments,
            };
          })
        );
      })
      .catch(() => setFeePlans([]));
  }, [formData.academic_year_id, formData.class_id, formData.class_division_id, tenantId]);

  // Document upload handler
  const uploadDocument = async (
    file: File,
    documentType: "birth_certificate" | "photo"
  ) => {
    if (file.size > MAX_ENROLLMENT_DOCUMENT_BYTES) {
      setError(ENROLLMENT_DOCUMENT_SIZE_HINT);
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

  const openDocumentInNewTab = useCallback((url?: string | null) => {
    const absoluteUrl = toAbsoluteAssetUrl(url);
    if (!absoluteUrl) return;
    window.open(absoluteUrl, "_blank", "noopener,noreferrer");
  }, []);

  const requestDocumentDelete = useCallback((target: "birth_certificate" | "photo") => {
    setDocumentDeleteTarget(target);
  }, []);

  const confirmDocumentDelete = useCallback(() => {
    if (documentDeleteTarget === "birth_certificate") {
      setBirthCertName("");
      setFormData((prev) => ({ ...prev, birth_certificate_url: "" }));
      if (birthCertInputRef.current) birthCertInputRef.current.value = "";
      setSnackbar("Birth certificate removed successfully.");
    } else if (documentDeleteTarget === "photo") {
      setPhotoName("");
      setFormData((prev) => ({ ...prev, photo_url: "" }));
      if (photoInputRef.current) photoInputRef.current.value = "";
      setSnackbar("Student photo removed successfully.");
    }
    setDocumentDeleteTarget(null);
  }, [documentDeleteTarget, setFormData]);

  // Build submission payload
  const buildPayload = (): EnrollmentCreatePayload => {
    const customPlan =
      feeScheduleMode === "customized"
        ? savedCustomFee
        : null;
    const payload: EnrollmentCreatePayload = {
    lead_id: selectedLead?.id ?? null,
    student_name: formData.student_name.trim(),
    date_of_birth: formData.date_of_birth || null,
    gender: formData.gender || null,
    admission_no: formData.admission_no.trim() || null,
    admission_date: formData.admission_date,
    academic_year_id: Number(formData.academic_year_id),
    class_id: Number(formData.class_id),
    class_division_id: formData.class_division_id ? Number(formData.class_division_id) : null,
    roll_no: formData.roll_no.trim() || null,
    parent_name: formData.parent_name.trim(),
    mobile_number: formData.mobile_number.trim(),
    email: formData.email.trim(),
    fee_structure_id: Number(formData.fee_structure_id),
    discount_id: formData.discount_id ? Number(formData.discount_id) : null,
    additional_fee: null,
    birth_certificate_url: formData.birth_certificate_url.trim() || null,
    photo_url: formData.photo_url.trim() || null,
    };
    if (customPlan && customPlan.installments.length > 0) {
      payload.custom_annual_amount = Number(customPlan.annual);
      payload.custom_discount_amount = Number(customPlan.discount);
      payload.custom_installments = customPlan.installments.map((row, index) => ({
        installment_no: index + 1,
        amount: Number(row.amount || 0),
        due_date: row.due_date,
      }));
    }
    return payload;
  };

  // Submit handler
  const handleConfirmSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (isEditMode) {
        if (!editStudentId) {
          setError("Student ID is required for edit mode.");
          return;
        }
        const res = await studentService.update(editStudentId, {
          student_name: formData.student_name.trim(),
          gender: formData.gender || null,
          date_of_birth: formData.date_of_birth || null,
          mobile_number: formData.mobile_number.trim(),
          email: formData.email.trim(),
          class_id: Number(formData.class_id),
          class_division_id: formData.class_division_id ? Number(formData.class_division_id) : null,
          roll_no: formData.roll_no.trim() || null,
          parent: {
            parent_name: formData.parent_name.trim(),
            mobile_number: formData.mobile_number.trim(),
            email: formData.email.trim(),
          },
          admission_no: formData.admission_no.trim() || null,
          birth_certificate_url: formData.birth_certificate_url.trim() || null,
          photo_url: formData.photo_url.trim() || null,
          is_active: formData.is_active,
        });
        setSnackbar(res?.message || "Student updated successfully");
      } else {
        if (feeScheduleMode === "customizing") {
          setError("Save the customized fee plan first, or click Use Configured Plan.");
          return;
        }
        const res = await enrollmentService.enroll(buildPayload());
        setSnackbar(res.message || "Enrollment completed successfully");
      }
      setTimeout(() => navigateWithConfigHub(studentListPath), 1000);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          (isEditMode ? "Student update failed. Please try again" : "Enrollment failed. Please try again")
      );
    } finally {
      setLoading(false);
    }
  };

  const academicYearOptions = useMemo(
    () => {
      const base = academicYears.map((year) => ({ id: String(year.id), label: year.name, value: String(year.id) }));
      if (
        formData.academic_year_id === VIEW_FALLBACK_VALUES.academicYear &&
        studentViewMeta.academic_year_name
      ) {
        base.push({
          id: VIEW_FALLBACK_VALUES.academicYear,
          value: VIEW_FALLBACK_VALUES.academicYear,
          label: studentViewMeta.academic_year_name,
        });
      }
      if (
        formData.academic_year_id &&
        !base.some((opt) => opt.value === formData.academic_year_id)
      ) {
        base.push({
          id: formData.academic_year_id,
          value: formData.academic_year_id,
          label: studentViewMeta.academic_year_name || `Academic Year #${formData.academic_year_id}`,
        });
      }
      return base;
    },
    [academicYears, formData.academic_year_id, studentViewMeta.academic_year_name]
  );
  const classOptions = useMemo(
    () => {
      const base = classes.map((item) => ({ id: String(item.id), label: item.name, value: String(item.id) }));
      if (formData.class_id && !base.some((opt) => opt.value === formData.class_id)) {
        base.push({
          id: formData.class_id,
          value: formData.class_id,
          label: studentViewMeta.class_name || `Class #${formData.class_id}`,
        });
      }
      return base;
    },
    [classes, formData.class_id, studentViewMeta.class_name]
  );
  const divisionOptions = useMemo(
    () => {
      const base = divisions.map((division) => ({
        id: String(division.id),
        label: division.division_name,
        value: String(division.id),
      }));
      if (
        formData.class_division_id === VIEW_FALLBACK_VALUES.classDivision &&
        studentViewMeta.class_division_name
      ) {
        base.push({
          id: VIEW_FALLBACK_VALUES.classDivision,
          value: VIEW_FALLBACK_VALUES.classDivision,
          label: studentViewMeta.class_division_name,
        });
      }
      if (formData.class_division_id && !base.some((opt) => opt.value === formData.class_division_id)) {
        base.push({
          id: formData.class_division_id,
          value: formData.class_division_id,
          label: studentViewMeta.class_division_name || `Division #${formData.class_division_id}`,
        });
      }
      return base;
    },
    [divisions, formData.class_division_id, studentViewMeta.class_division_name]
  );
  const feePlanOptions = useMemo(
    () => {
      const base = feePlans.map((plan) => ({ id: String(plan.id), label: plan.name, value: String(plan.id) }));
      if (
        formData.fee_structure_id === VIEW_FALLBACK_VALUES.feePlan &&
        studentViewMeta.fee_structure_name
      ) {
        base.push({
          id: VIEW_FALLBACK_VALUES.feePlan,
          value: VIEW_FALLBACK_VALUES.feePlan,
          label: studentViewMeta.fee_structure_name,
        });
      }
      if (formData.fee_structure_id && !base.some((opt) => opt.value === formData.fee_structure_id)) {
        base.push({
          id: formData.fee_structure_id,
          value: formData.fee_structure_id,
          label: studentViewMeta.fee_structure_name || `Fee Plan #${formData.fee_structure_id}`,
        });
      }
      return base;
    },
    [feePlans, formData.fee_structure_id, studentViewMeta.fee_structure_name]
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
    () => {
      const base = filteredDiscounts.map((discount) => ({
        id: String(discount.id),
        label: discount.discount_name,
        value: String(discount.id),
      }));
      if (
        formData.discount_id === VIEW_FALLBACK_VALUES.discount &&
        studentViewMeta.discount_name
      ) {
        base.push({
          id: VIEW_FALLBACK_VALUES.discount,
          value: VIEW_FALLBACK_VALUES.discount,
          label: studentViewMeta.discount_name,
        });
      }
      if (formData.discount_id && !base.some((opt) => opt.value === formData.discount_id)) {
        base.push({
          id: formData.discount_id,
          value: formData.discount_id,
          label: studentViewMeta.discount_name || `Discount #${formData.discount_id}`,
        });
      }
      return base;
    },
    [filteredDiscounts, formData.discount_id, studentViewMeta.discount_name]
  );

  const selectedDiscountLabel = useMemo(() => {
    if (!formData.discount_id) return "None";
    const discount = discountById.get(Number(formData.discount_id));
    if (!discount) return "None";
    return `${discount.discount_name} (${discount.discount_type} ${discount.discount_value})`;
  }, [discountById, formData.discount_id]);

  const selectedFeePlan = useMemo(
    () => feePlans.find((item) => item.id === Number(formData.fee_structure_id)) || null,
    [feePlans, formData.fee_structure_id]
  );
  const selectedPlanInstallments = useMemo(
    () => selectedFeePlan?.installments || [],
    [selectedFeePlan]
  );
  const selectedInstallmentCount =
    selectedFeePlan?.num_installments || selectedPlanInstallments.length;

  const feePreview = useMemo(() => {
    const feePlan = selectedFeePlan;
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
  }, [discountById, selectedFeePlan, formData.discount_id]);

  const configuredInstallments = useMemo(
    () => mapPlanInstallments(selectedPlanInstallments),
    [selectedPlanInstallments]
  );
  const displayedAnnual =
    savedCustomFee && feeScheduleMode !== "configured" ? savedCustomFee.annual : feePreview.total;
  const displayedDiscount =
    savedCustomFee && feeScheduleMode !== "configured" ? savedCustomFee.discount : feePreview.discountAmount;
  const displayedFinal =
    savedCustomFee && feeScheduleMode !== "configured"
      ? Math.max(0, savedCustomFee.annual - savedCustomFee.discount)
      : feePreview.finalAmount;
  const displayedInstallments =
    feeScheduleMode === "customizing"
      ? customInstallments
      : savedCustomFee && feeScheduleMode === "customized"
        ? savedCustomFee.installments
        : configuredInstallments;
  const customDraftFinal = Math.max(0, Number(customAnnualFee || 0) - Number(customDiscountAmount || 0));
  const customDraftInstallmentTotal = installmentDraftTotal(customInstallments);
  const canCustomizeFee = !isEditMode && !isViewMode && Boolean(formData.fee_structure_id);
  const scheduleTitleCount =
    feeScheduleMode === "customizing"
      ? customInstallments.length
      : displayedInstallments.length || selectedInstallmentCount;

  const useConfiguredFeePlan = () => {
    setFeeScheduleMode("configured");
    setSavedCustomFee(null);
    setCustomFeeError(null);
    setSnackbar("Using the configured fee plan for this student.");
  };

  const startCustomizeFeePlan = () => {
    const source =
      savedCustomFee?.installments?.length ? savedCustomFee.installments : configuredInstallments;
    setCustomAnnualFee((savedCustomFee?.annual ?? feePreview.total).toFixed(2));
    setCustomDiscountAmount((savedCustomFee?.discount ?? feePreview.discountAmount).toFixed(2));
    setCustomInstallments(
      source.length
        ? source.map((row, index) => ({ ...row, installment_no: index + 1 }))
        : [{ installment_no: 1, amount: feePreview.finalAmount.toFixed(2), due_date: dayjs().format("YYYY-MM-DD") }]
    );
    setCustomFeeError(null);
    setFeeScheduleMode("customizing");
  };

  const saveCustomizedFeePlan = () => {
    if (!customInstallments.length) {
      setCustomFeeError("At least one installment is required.");
      return;
    }
    if (customInstallments.some((row) => !row.due_date || Number(row.amount) < 0 || Number.isNaN(Number(row.amount)))) {
      setCustomFeeError("Amount and due date are required for each installment.");
      return;
    }
    if (Math.abs(customDraftInstallmentTotal - customDraftFinal) > 0.05) {
      setCustomFeeError(
        `Installment total must match the final payable amount.`
      );
      return;
    }
    setSavedCustomFee({
      annual: Number(customAnnualFee || 0),
      discount: Number(customDiscountAmount || 0),
      installments: customInstallments.map((row, index) => ({ ...row, installment_no: index + 1 })),
    });
    setFeeScheduleMode("customized");
    setCustomFeeError(null);
    setSnackbar("Customized fee plan saved for this student.");
  };

  const updateCustomInstallment = (index: number, field: "amount" | "due_date", value: string) => {
    setCustomInstallments((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  };

  const addCustomInstallment = () => {
    setCustomInstallments((prev) => [
      ...prev,
      {
        installment_no: prev.length + 1,
        amount: "0.00",
        due_date: dayjs().format("YYYY-MM-DD"),
      },
    ]);
  };

  const removeCustomInstallment = (installmentNo: number) => {
    setCustomInstallments((prev) =>
      prev
        .filter((row) => row.installment_no !== installmentNo)
        .map((row, rowIndex) => ({ ...row, installment_no: rowIndex + 1 }))
    );
  };

  useEffect(() => {
    setFeeScheduleMode("configured");
    setSavedCustomFee(null);
    setCustomInstallments([]);
    setCustomAnnualFee("");
    setCustomDiscountAmount("");
    setCustomFeeError(null);
  }, [formData.fee_structure_id]);

  // Sync discount validity when filtered options change
  useEffect(() => {
    if (isViewMode) return;
    if (!formData.discount_id) return;
    // Avoid clearing prefilled discount before class/discount options load.
    if (!classes.length || !discounts.length) return;
    const stillValid = filteredDiscounts.some((discount) => discount.id === Number(formData.discount_id));
    if (!stillValid) {
      setFormData((prev) => ({ ...prev, discount_id: "" }));
    }
  }, [filteredDiscounts, formData.discount_id, setFormData, isViewMode, classes.length, discounts.length]);

  // Sync fee plan validity when options change
  useEffect(() => {
    if (isViewMode) return;
    if (!formData.fee_structure_id) return;
    // Avoid clearing prefilled fee plan before fee plan options load.
    if (!feePlans.length) return;
    const stillValid = feePlans.some((plan) => plan.id === Number(formData.fee_structure_id));
    if (!stillValid) {
      setFormData((prev) => ({ ...prev, fee_structure_id: "" }));
    }
  }, [feePlans, formData.fee_structure_id, setFormData, isViewMode]);

  const prefillFromLead = async (selected: LeadOption) => {
    const prefill = await enrollmentService.prefillFromLead(selected.id);
    setFormData((prev) => ({
      ...prev,
      student_name: prefill.student_name ?? prev.student_name,
      date_of_birth: toDateInputValue(prefill.date_of_birth) || prev.date_of_birth,
      gender: normalizeGender(prefill.gender) || prev.gender,
      parent_name: prefill.parent_name ?? prev.parent_name,
      mobile_number: prefill.mobile_number ?? prev.mobile_number,
      email: prefill.email ?? prev.email,
      academic_year_id: prefill.academic_year_id
        ? String(prefill.academic_year_id)
        : prev.academic_year_id || resolveCurrentAcademicYearId(academicYears),
      class_id: prefill.class_id ? String(prefill.class_id) : prev.class_id,
      class_division_id: prefill.class_division_id ? String(prefill.class_division_id) : prev.class_division_id,
      admission_date: toDateInputValue(prefill.expected_admission_date) || prev.admission_date,
      fee_structure_id: prefill.fee_structure_id ? String(prefill.fee_structure_id) : prev.fee_structure_id,
      discount_id: prefill.discount_id ? String(prefill.discount_id) : "",
      birth_certificate_url: prefill.birth_certificate_url ?? "",
      photo_url: prefill.photo_url ?? "",
    }));
    setBirthCertName(fileNameFromUrl(prefill.birth_certificate_url));
    setPhotoName(fileNameFromUrl(prefill.photo_url));
  };

  const handleCancel = useCallback(() => {
    if (isEditMode && studentRecord) {
      setFormData({
        student_name: studentRecord.name ?? "",
        date_of_birth: toDateInputValue(studentRecord.date_of_birth),
        gender: normalizeGender(studentRecord.gender),
        admission_no: studentRecord.admission_no ?? "",
        roll_no: (studentRecord as { roll_no?: string }).roll_no ?? "",
        admission_date: studentRecord.created_at
          ? dayjs(studentRecord.created_at).format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),
        academic_year_id: studentRecord.academic_year_id
          ? String(studentRecord.academic_year_id)
          : "",
        class_id: studentRecord.class_id ? String(studentRecord.class_id) : "",
        class_division_id: studentRecord.class_division_id
          ? String(studentRecord.class_division_id)
          : "",
        fee_structure_id: studentRecord.fee_structure_id
          ? String(studentRecord.fee_structure_id)
          : "",
        discount_id: studentRecord.discount_id ? String(studentRecord.discount_id) : "",
        parent_name: studentRecord.parent_name ?? "",
        mobile_number: studentRecord.mobile ?? "",
        email: studentRecord.email ?? "",
        birth_certificate_url: studentRecord.birth_certificate_url ?? "",
        photo_url: studentRecord.photo_url ?? "",
        is_active: studentRecord.is_active !== false,
      });
      setBirthCertName(fileNameFromUrl(studentRecord.birth_certificate_url));
      setPhotoName(fileNameFromUrl(studentRecord.photo_url));
      setFieldErrors({});
      setDocumentDeleteTarget(null);
      setError(null);
      setSnackbar(null);
      if (birthCertInputRef.current) birthCertInputRef.current.value = "";
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

    const cleared = emptyForm();
    const currentYearId = resolveCurrentAcademicYearId(academicYears);
    if (currentYearId) cleared.academic_year_id = currentYearId;

    resetForm(cleared);
    setSelectedLead(null);
    setBirthCertName("");
    setPhotoName("");
    setDocumentDeleteTarget(null);
    setError(null);
    setSnackbar(null);
    if (birthCertInputRef.current) birthCertInputRef.current.value = "";
    if (photoInputRef.current) photoInputRef.current.value = "";

    enrollmentService
      .getNextAdmissionNo()
      .then((admissionNo) => {
        if (admissionNo) {
          setFormData((prev) => ({ ...prev, admission_no: admissionNo }));
        }
      })
      .catch(() => {});
  }, [
    academicYears,
    isEditMode,
    resetForm,
    setFieldErrors,
    setFormData,
    studentRecord,
  ]);

  const formConfig = useMemo(() => {
    const config = createEnrollmentFormConfig({
      academicYearOptions,
      classOptions,
      divisionOptions,
      feePlanOptions,
      discountOptions,
      autoAssignAdmissionNo: !isEditMode && !isViewMode,
      isEditMode,
    });

    if (!isStudentFlow) {
      config.layoutRows = config.layoutRows.filter(
        (row) => !(row.kind === "fields" && row.fieldNames.includes("roll_no"))
      );
    }

    // Adjust Class Allocation field widths by flow:
    // - Student flows (add/edit/view): class + division + roll_no => 3 equal columns
    // - Admissions enrollment flow: class + division => 2 equal columns
    const classRow = config.layoutRows.find(
      (row) => row.kind === "fields" && row.fieldNames.includes("class_id")
    );
    const divisionRow = config.layoutRows.find(
      (row) => row.kind === "fields" && row.fieldNames.includes("class_division_id")
    );
    const rollRow = config.layoutRows.find(
      (row) => row.kind === "fields" && row.fieldNames.includes("roll_no")
    );
    if (classRow) {
      classRow.grid = { xs: 12, sm: isStudentFlow ? 4 : 6 };
    }
    if (divisionRow) {
      divisionRow.grid = { xs: 12, sm: isStudentFlow ? 4 : 6 };
    }
    if (rollRow) {
      rollRow.grid = { xs: 12, sm: 4 };
    }

    if (isViewMode) {
      Object.values(config.fields).forEach((field) => {
        if (field.type !== "custom") {
          const props = field.props || {};
          const currentSx = (props as any).sx;
          field.props = {
            ...props,
            disabled: true,
            sx: Array.isArray(currentSx)
              ? [...currentSx, viewModeFieldSx]
              : currentSx
                ? [currentSx, viewModeFieldSx]
                : [viewModeFieldSx],
          };
        }
      });
    }

    if (!isViewMode && !isEditMode) {
      // 1. Lead Selection Header
      config.layoutRows.splice(0, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => <FormSectionLabel title="Convert from Lead" icon={<PersonSearchIcon />} />,
      });

      // 2. Lead Selection Autocomplete
      config.layoutRows.splice(1, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => (
          <Autocomplete
            options={leadOptions}
            value={selectedLead}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.label}
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
    }

    // 3. Student Section Header
    const studentNameIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("student_name")
    );
    if (studentNameIdx >= 0) {
      config.layoutRows.splice(studentNameIdx, 0, {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => <FormSectionLabel title="Student Information" icon={<ChildCareIcon />} sx={sectionTitleSx} />,
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
        render: (ctx) => <FormSectionLabel title="Admission Details" icon={<AssignmentIcon />} sx={sectionTitleSx} />,
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
        render: (ctx) => <FormSectionLabel title="Class Allocation" icon={<ClassIcon />} sx={sectionTitleSx} />,
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
        render: (ctx) => <FormSectionLabel title="Parent Details" icon={<Groups2Icon />} sx={sectionTitleSx} />,
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
        render: (ctx) => <FormSectionLabel title="Fee Details" icon={<PaymentsIcon />} sx={sectionTitleSx} />,
      });
    }

    // 8. Installment schedule from selected fee plan, then discount preview
    const discountIdx = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("discount_id")
    );
    if (discountIdx >= 0) {
      const feeScheduleRows: typeof config.layoutRows = [];
      if (formData.fee_structure_id) {
        feeScheduleRows.push({
          kind: "custom" as const,
          grid: { xs: 12 },
          render: () => (
            <Box sx={{ mt: 1 }}>
              {feeScheduleMode !== "configured" ? (
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                  Customized Fee Plan ({scheduleTitleCount} installment
                  {scheduleTitleCount === 1 ? "" : "s"})
                </Typography>
              ) : null}
              {feeScheduleMode === "customizing" ? (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Total Fee"
                      size="small"
                      type="number"
                      value={customAnnualFee}
                      onChange={(e) => setCustomAnnualFee(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Discount / Concession"
                      size="small"
                      type="number"
                      value={customDiscountAmount}
                      onChange={(e) => setCustomDiscountAmount(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Final Payable"
                      size="small"
                      value={customDraftFinal.toFixed(2)}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              ) : null}
              {(feeScheduleMode === "customizing" ? customInstallments : displayedInstallments).length > 0 ? (
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.25, overflow: "hidden" }}>
                  <DataTable
                    columns={[
                      {
                        id: "num",
                        label: "Installment",
                        align: "left",
                        width: feeScheduleMode === "customizing" ? "28%" : "35%",
                        render: (row: StudentFeeInstallmentDraft) => (
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                            Installment {row.installment_no}
                          </Typography>
                        ),
                      },
                      {
                        id: "amt",
                        label: "Amount",
                        align: "right",
                        width: "30%",
                        render: (row: StudentFeeInstallmentDraft, idx: number) =>
                          feeScheduleMode === "customizing" ? (
                            <TextField
                              size="small"
                              type="number"
                              value={row.amount}
                              onChange={(e) => updateCustomInstallment(idx, "amount", e.target.value)}
                              variant="standard"
                              InputProps={{
                                disableUnderline: false,
                                sx: { fontSize: "0.875rem", "& input": { textAlign: "right" } },
                              }}
                              sx={{ width: "120px" }}
                            />
                          ) : (
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                              ₹{Number(row.amount).toLocaleString()}
                            </Typography>
                          ),
                      },
                      {
                        id: "date",
                        label: "Due Date",
                        align: "center",
                        width: "35%",
                        render: (row: StudentFeeInstallmentDraft, idx: number) => (
                          <TextField
                            type="date"
                            size="small"
                            value={toDateInputValue(row.due_date)}
                            onChange={(e) =>
                              feeScheduleMode === "customizing"
                                ? updateCustomInstallment(idx, "due_date", e.target.value)
                                : undefined
                            }
                            variant="standard"
                            InputProps={{
                              readOnly: feeScheduleMode !== "customizing",
                              disableUnderline: false,
                              sx: {
                                fontSize: "0.875rem",
                                "& input": { textAlign: "center" },
                              },
                            }}
                            sx={{ width: "160px", pointerEvents: feeScheduleMode === "customizing" ? "auto" : "none" }}
                          />
                        ),
                      },
                    ]}
                    data={feeScheduleMode === "customizing" ? customInstallments : displayedInstallments}
                    renderRowActions={
                      feeScheduleMode === "customizing"
                        ? (row: StudentFeeInstallmentDraft) => (
                            <Box onClick={(event) => event.stopPropagation()}>
                              <TableRowActions
                                onDelete={() => removeCustomInstallment(row.installment_no)}
                                disabled={customInstallments.length <= 1}
                              />
                            </Box>
                          )
                        : undefined
                    }
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "grey.50",
                    borderRadius: 1,
                    border: "1px dashed",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    {feeScheduleMode === "customizing"
                      ? "Add at least one installment for this student."
                      : "No installments are configured on this fee plan."}
                  </Typography>
                </Box>
              )}
              {customFeeError ? (
                <FormHelperText error sx={{ mx: 0, mt: 1.5 }}>
                  {customFeeError}
                </FormHelperText>
              ) : null}
              {canCustomizeFee ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2 }}>
                  <Button
                    variant={feeScheduleMode === "configured" ? "contained" : "outlined"}
                    onClick={useConfiguredFeePlan}
                  >
                    Use Configured Plan
                  </Button>
                  {feeScheduleMode === "customizing" ? (
                    <>
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={addCustomInstallment}>
                        Add Installment
                      </Button>
                      <Button variant="contained" onClick={saveCustomizedFeePlan}>
                        Save Customized Plan
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant={feeScheduleMode === "customized" ? "contained" : "outlined"}
                      onClick={startCustomizeFeePlan}
                    >
                      Customize Fee Plan
                    </Button>
                  )}
                </Box>
              ) : null}
            </Box>
          ),
        });
      }
      feeScheduleRows.push({
        kind: "custom" as const,
        grid: { xs: 12 },
        render: (ctx) => (
          <Box
            sx={{
              bgcolor: "grey.50",
              border: "1px solid",
              borderColor: "grey.200",
              borderRadius: 2,
              p: { xs: 1.5, sm: 2 },
            }}
          >
            <Grid container spacing={1}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Selected Discount
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedDiscountLabel}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="body2">
                  Rs. {(feeScheduleMode === "customizing" ? Number(customAnnualFee || 0) : displayedAnnual).toFixed(2)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 2.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Discount
                </Typography>
                <Typography variant="body2">
                  Rs. {(feeScheduleMode === "customizing" ? Number(customDiscountAmount || 0) : displayedDiscount).toFixed(2)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 2.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Final Amount
                </Typography>
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>
                  Rs. {(feeScheduleMode === "customizing" ? customDraftFinal : displayedFinal).toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        ),
      });
      config.layoutRows.splice(discountIdx + 1, 0, ...feeScheduleRows);
    }

    // 9-10. Documents Upload: header immediately followed by upload controls
    // (empty birth/photo placeholder field rows were removed from formConfig).
    let docsInsertAt = config.layoutRows.length;
    const discountIdxForDocs = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("discount_id")
    );
    if (discountIdxForDocs >= 0) {
      docsInsertAt = discountIdxForDocs + 1;
      while (config.layoutRows[docsInsertAt]?.kind === "custom") {
        docsInsertAt += 1;
      }
    }
    const statusIdxForDocs = config.layoutRows.findIndex(
      (row) => row.kind === "fields" && row.fieldNames.includes("is_active")
    );
    if (statusIdxForDocs >= 0) {
      docsInsertAt = Math.min(docsInsertAt, statusIdxForDocs);
    }

    const documentUploadRow = {
      kind: "custom" as const,
      grid: { xs: 12 },
      render: () => (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: 2, p: 1.25 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<UploadFileIcon />}
                onClick={() => birthCertInputRef.current?.click()}
                disabled={uploadingBirthCert}
                sx={{ justifyContent: "flex-start", textTransform: "none" }}
              >
                {uploadingBirthCert ? "Uploading birth certificate..." : "Upload Birth Certificate"}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                {ENROLLMENT_DOCUMENT_SIZE_HINT}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, minHeight: 24, gap: 0.25 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {birthCertName ||
                    fileNameFromUrl(formData.birth_certificate_url) ||
                    "No file selected"}
                </Typography>
                {formData.birth_certificate_url ? (
                  <>
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label="View birth certificate"
                      onClick={() => openDocumentInNewTab(formData.birth_certificate_url)}
                      sx={{ p: 0.5 }}
                    >
                      <VisibilityIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Delete birth certificate"
                      onClick={() => requestDocumentDelete("birth_certificate")}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </>
                ) : null}
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: 2, p: 1.25 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<UploadFileIcon />}
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                sx={{ justifyContent: "flex-start", textTransform: "none" }}
              >
                {uploadingPhoto ? "Uploading photo..." : "Upload Student Photo"}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                {ENROLLMENT_DOCUMENT_SIZE_HINT}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, minHeight: 24, gap: 0.25 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {photoName || fileNameFromUrl(formData.photo_url) || "No file selected"}
                </Typography>
                {formData.photo_url ? (
                  <>
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label="View student photo"
                      onClick={() => openDocumentInNewTab(formData.photo_url)}
                      sx={{ p: 0.5 }}
                    >
                      <VisibilityIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Delete student photo"
                      onClick={() => requestDocumentDelete("photo")}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </>
                ) : null}
              </Box>
              {formData.photo_url ? (
                <Box
                  component="img"
                  src={toAbsoluteAssetUrl(formData.photo_url)}
                  alt="Student preview"
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 1,
                    objectFit: "cover",
                    border: "1px solid",
                    borderColor: "grey.300",
                    mt: 1,
                  }}
                />
              ) : null}
            </Box>
          </Grid>
        </Grid>
      ),
    };

    config.layoutRows.splice(
      docsInsertAt,
      0,
      {
        kind: "custom" as const,
        grid: { xs: 12 },
        render: () => (
          <FormSectionLabel
            title="Documents Upload"
            icon={<UploadFileIcon />}
            spacing={1}
            sx={sectionTitleSx}
          />
        ),
      },
      ...(!isViewMode ? [documentUploadRow] : [])
    );

    return config;
  }, [
    academicYearOptions,
    addCustomInstallment,
    birthCertName,
    canCustomizeFee,
    classOptions,
    customAnnualFee,
    customDiscountAmount,
    customDraftFinal,
    customFeeError,
    customInstallments,
    discountOptions,
    displayedAnnual,
    displayedDiscount,
    displayedFinal,
    displayedInstallments,
    feePlanOptions,
    feePreview,
    feeScheduleMode,
    formData.birth_certificate_url,
    formData.fee_structure_id,
    formData.photo_url,
    leadOptions,
    openDocumentInNewTab,
    photoName,
    removeCustomInstallment,
    requestDocumentDelete,
    saveCustomizedFeePlan,
    scheduleTitleCount,
    selectedDiscountLabel,
    selectedFeePlan,
    selectedInstallmentCount,
    selectedLead,
    selectedPlanInstallments,
    startCustomizeFeePlan,
    divisionOptions,
    updateCustomInstallment,
    uploadingBirthCert,
    uploadingPhoto,
    useConfiguredFeePlan,
    prefillFromLead,
    discountById,
    isViewMode,
    isEditMode,
    isStudentFlow,
  ]);

  if (isViewMode) {
    return (
      <StudentDetailsView
        formData={formData}
        studentViewMeta={studentViewMeta}
        selectedDiscountLabel={selectedDiscountLabel}
        feePreview={feePreview}
        loading={fetchLoading}
        error={error}
        studentId={editStudentId || undefined}
        studentRecord={studentRecord}
        onBack={() => navigate(-1)}
        onEdit={() =>
          navigate(
            editStudentId
              ? `/admissions/enrollment?studentId=${encodeURIComponent(editStudentId)}&mode=edit&source=students`
              : "/admissions/enrollment?mode=edit&source=students"
          )
        }
      />
    );
  }

  const documentDeleteMessage =
    documentDeleteTarget === "photo"
      ? "Are you sure you want to remove this student photo?"
      : documentDeleteTarget === "birth_certificate"
        ? "Are you sure you want to remove this birth certificate?"
        : "Are you sure you want to remove this document?";

  return (
    <>
      <ConfirmDialog
        open={documentDeleteTarget != null}
        title="Please Confirm"
        message={documentDeleteMessage}
        confirmLabel="Confirm"
        onConfirm={confirmDocumentDelete}
        onClose={() => setDocumentDeleteTarget(null)}
      />
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
        isEditMode={isEditMode || isViewMode}
        loading={loading}
        fetchLoading={fetchLoading}
        error={error}
        onErrorDismiss={() => setError(null)}
        snackbar={snackbar}
        onSnackbarClose={() => setSnackbar(null)}
        headerConfig={{
          links: enrollmentHeaderLinks,
          homePath: "/",
          cancelTooltip: isViewMode ? "Back" : "Cancel",
          saveTooltipCreate: isEditMode ? "Save Student" : "Enroll Student",
          saveTooltipEdit: "Save Student",
        }}
        onCancelNavigate={handleCancel}
        confirmMessage={() =>
          isViewMode
            ? "This page is in view-only mode."
            : isEditMode
            ? "Are you sure you want to update this student?"
            : "Are you sure you want to enroll this student?"
        }
        canSubmit={isViewMode ? false : canEnroll}
        hideFooterActions={isViewMode}
        hideFieldValidationDialog
      />
    </>
  );
}
