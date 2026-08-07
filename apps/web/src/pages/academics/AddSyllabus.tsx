import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import BaseForm from "../../components/reusable/BaseForm";
import { ListPageLayout } from "../../components/reusable";
import { PageHeader } from "../../components/layout";
import { useAuth } from "../../context/AuthContext";
import { useRBAC } from "../../context/RBACContext";
import { useFormManager } from "../../hooks/useFormManager";
import { useTeacherStudentListScope } from "../../hooks/useTeacherStudentListScope";
import type { FormConfig } from "../../components/reusable/formFramework.types";
import type { FormValidationConfig } from "../../utils/formValidation";
import { mapApiErrorsToFields } from "../../utils/formValidation";
import { isStudentHomeworkUser } from "../../utils/homeworkAudience";
import { isTeacherNoticeUser } from "../../utils/noticeAudience";
import syllabusService, {
  formatSyllabusMonthLabel,
  isAllowedSyllabusFile,
  SYLLABUS_ACCEPT,
  SYLLABUS_MONTHS,
  type SyllabusMonth,
} from "../../api/services/syllabusService";

type FormData = {
  academic_year_id: string;
  class_id: string;
  month: SyllabusMonth | "";
};

const UPLOAD_HINT =
  "Accepted: pdf, doc, docx, xls, xlsx, ppt, pptx, jpg, jpeg, png. Limit 10 MB";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export default function AddSyllabus() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id && id !== "new");
  const editId = isEditMode ? Number(id) : NaN;

  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { hasPermission, hasAnyRole, roles } = useRBAC();
  const teacherScope = useTeacherStudentListScope();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = hasAnyRole(["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN", "TENANT_ADMIN"]);
  const isTeacher = !isAdmin && isTeacherNoticeUser(user?.role, roles);
  const isStudent = isStudentHomeworkUser(user?.role, roles);
  const canCreate = hasPermission("ACADEMIC_MGMT:create") && !isStudent;
  const canEdit =
    (isAdmin || isTeacher) &&
    !isStudent &&
    (hasPermission("ACADEMIC_MGMT:edit") || canCreate);
  const canAccess = isEditMode ? canEdit : canCreate;
  const classReadOnly = isTeacher;

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [savedFileName, setSavedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<{ id: string; label: string; value: string }[]>([]);
  const [yearId, setYearId] = useState("");

  const initialValues = useMemo<FormData>(
    () => ({
      academic_year_id: "",
      class_id: "",
      month: isEditMode ? "" : SYLLABUS_MONTHS[new Date().getMonth()],
    }),
    [isEditMode],
  );

  const validationConfig = useMemo<FormValidationConfig<FormData>>(
    () => ({
      month: [{ type: "required", message: "Please select month" }],
      class_id: [{ type: "required", message: "Please select class" }],
    }),
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<FormData>({
    initialValues,
    validationConfig,
    onClearError: clearError,
  });

  // Load filter options once on mount (avoid re-fetch loops from unstable callbacks).
  useEffect(() => {
    let cancelled = false;
    void syllabusService
      .getFilterOptions()
      .then((opts) => {
        if (cancelled) return;
        const current = opts.academic_years.find((y) => y.is_current) ?? opts.academic_years[0];
        if (current && !isEditMode) {
          const year = String(current.id);
          setYearId(year);
          setFormData((prev) =>
            prev.academic_year_id ? prev : { ...prev, academic_year_id: year },
          );
        }
        // Backend already scopes classes by role (admin = all, teacher/student = assigned).
        if (!isEditMode || !isTeacher) {
          setClassOptions(
            opts.classes.map((c) => ({ id: String(c.id), label: c.name, value: String(c.id) })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load syllabus options");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot load
  }, []);

  useEffect(() => {
    if (!isTeacher || !teacherScope.scopeReady || isEditMode) return;
    if (teacherScope.teacherClassOptions.length > 0) {
      setClassOptions(
        teacherScope.teacherClassOptions.map((o) => ({
          id: o.value,
          label: o.label,
          value: o.value,
        })),
      );
      const nextClassId =
        teacherScope.defaultClassId || teacherScope.teacherClassOptions[0].value;
      setFormData((prev) =>
        prev.class_id === nextClassId ? prev : { ...prev, class_id: nextClassId },
      );
    } else if (teacherScope.defaultClassId) {
      const nextClassId = teacherScope.defaultClassId;
      setFormData((prev) =>
        prev.class_id === nextClassId ? prev : { ...prev, class_id: nextClassId },
      );
    }
  }, [
    isEditMode,
    isTeacher,
    setFormData,
    teacherScope.defaultClassId,
    teacherScope.scopeReady,
    teacherScope.teacherClassOptions,
  ]);

  useEffect(() => {
    if (!isEditMode || !Number.isFinite(editId)) return;
    let cancelled = false;
    setFetchLoading(true);
    void syllabusService
      .getById(editId)
      .then((row) => {
        if (cancelled) return;
        setFormData({
          academic_year_id: String(row.academic_year_id),
          class_id: String(row.class_id),
          month: row.month,
        });
        setYearId(String(row.academic_year_id));
        setSavedFileName(row.attachment?.file_name ?? null);
        if (isTeacher) {
          setClassOptions([
            { id: String(row.class_id), label: row.class_name, value: String(row.class_id) },
          ]);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load syllabus");
      })
      .finally(() => {
        if (!cancelled) setFetchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, isEditMode, isTeacher, setFormData]);

  const onFileSelect = (file?: File) => {
    if (!file) {
      setPendingFile(null);
      if (!isEditMode || !savedFileName) setFileError("Attachment is required");
      return;
    }
    if (!isAllowedSyllabusFile(file)) {
      setPendingFile(null);
      setFileError(`Invalid file type. ${UPLOAD_HINT}`);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setPendingFile(null);
      setFileError("File size exceeded. Maximum allowed size is 10 MB");
      return;
    }
    setPendingFile(file);
    setFileError(null);
    setError(null);
  };

  const displayFileName = pendingFile?.name ?? savedFileName;

  const attachmentSlot = useMemo(
    () => (
      <Box data-testid="section-syllabus-attachment">
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
          Attachment{" "}
          <Box component="span" sx={{ color: "error.main" }}>
            *
          </Box>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {UPLOAD_HINT}
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept={SYLLABUS_ACCEPT}
          hidden
          data-testid="input-syllabus-attachment"
          aria-label="Attachment"
          onChange={(e) => {
            onFileSelect(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            data-testid="btn-choose-syllabus-attachment"
          >
            {displayFileName ? "Replace File" : "Upload Attachment"}
          </Button>
          {displayFileName ? (
            <>
              <Typography variant="body2" data-testid="text-syllabus-attachment-name">
                {displayFileName}
              </Typography>
              {pendingFile ? (
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Delete attachment"
                    onClick={() => onFileSelect(undefined)}
                    data-testid="btn-remove-syllabus-attachment"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </>
          ) : null}
        </Box>
        {fileError ? (
          <Typography
            variant="caption"
            color="error"
            data-testid="error-syllabus-attachment"
            sx={{ mt: 0.75, display: "block" }}
          >
            {fileError}
          </Typography>
        ) : null}
      </Box>
    ),
    [displayFileName, fileError, loading, pendingFile],
  );

  const formConfig = useMemo<FormConfig<FormData>>(
    () => ({
      fields: {
        month: {
          name: "month",
          label: "Month",
          type: "select",
          required: true,
          props: {
            options: SYLLABUS_MONTHS.map((m) => ({
              id: m,
              label: formatSyllabusMonthLabel(m),
              value: m,
            })),
            inputProps: { "data-testid": "field-syllabus-month" },
          },
        },
        class_id: {
          name: "class_id",
          label: "Class",
          type: "select",
          required: true,
          props: {
            options: classOptions,
            disabled: classReadOnly,
            inputProps: { "data-testid": "field-syllabus-class" },
          },
        },
        academic_year_id: {
          name: "academic_year_id",
          label: "Academic Year",
          type: "select",
          required: false,
          props: { options: [], disabled: true },
        },
      },
      layoutRows: [
        { kind: "section", title: "Syllabus Details", grid: { xs: 12 } },
        { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["month"] },
        { kind: "fields", grid: { xs: 12, md: 6 }, fieldNames: ["class_id"] },
        { kind: "custom", grid: { xs: 12 }, render: () => attachmentSlot },
      ],
    }),
    [attachmentSlot, classOptions, classReadOnly],
  );

  const hasAttachment = Boolean(pendingFile || (isEditMode && savedFileName));
  const canSubmit =
    Boolean(formData.month) && Boolean(formData.class_id) && hasAttachment && !fileError;

  const onConfirmSubmit = useCallback(async () => {
    if (!formData.month || !formData.class_id) return;
    if (!pendingFile && !(isEditMode && savedFileName)) {
      setFileError("Attachment is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        academic_year_id: Number(formData.academic_year_id || yearId),
        class_id: Number(formData.class_id),
        month: formData.month as SyllabusMonth,
      };

      if (isEditMode) {
        await syllabusService.update(editId, payload);
        if (pendingFile) await syllabusService.uploadAttachment(editId, pendingFile);
        enqueueSnackbar("Syllabus updated successfully.", { variant: "success" });
      } else {
        const created = await syllabusService.create(payload);
        await syllabusService.uploadAttachment(created.id, pendingFile!);
        enqueueSnackbar("Syllabus uploaded successfully.", { variant: "success" });
      }
      navigate("/academics/syllabus");
    } catch (err: unknown) {
      const { fieldErrors: apiErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((prev) => ({ ...prev, ...apiErrors }));
      setError(message || (err instanceof Error ? err.message : "Unable to save syllabus"));
    } finally {
      setLoading(false);
    }
  }, [
    editId,
    enqueueSnackbar,
    formData.academic_year_id,
    formData.class_id,
    formData.month,
    isEditMode,
    navigate,
    pendingFile,
    savedFileName,
    setFieldErrors,
    yearId,
  ]);

  if (!canAccess) {
    return (
      <ListPageLayout
        data-testid="page-add-syllabus-denied"
        header={
          <PageHeader
            links={[
              { title: "Syllabus Management", path: "/academics/syllabus" },
              { title: isEditMode ? "Edit" : "Add", path: "#" },
            ]}
            homePath="/"
          />
        }
      >
        <Alert severity="error" sx={{ m: 2 }}>
          You do not have permission to {isEditMode ? "edit" : "add"} syllabus.
        </Alert>
      </ListPageLayout>
    );
  }

  return (
    <BaseForm<FormData>
      pageTestId={isEditMode ? "page-edit-syllabus" : "page-add-syllabus"}
      formTestId={isEditMode ? "form-edit-syllabus" : "form-add-syllabus"}
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleSubmit}
      setFormError={setError}
      onConfirmSubmit={onConfirmSubmit}
      isEditMode={isEditMode}
      loading={loading}
      fetchLoading={fetchLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      headerConfig={{
        links: [
          { title: "Syllabus Management", path: "/academics/syllabus" },
          { title: isEditMode ? "Edit Syllabus" : "Add Syllabus", path: "#" },
        ],
        homePath: "/",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Save",
      }}
      onCancelNavigate={() => navigate("/academics/syllabus")}
      confirmMessage={isEditMode ? "Save changes to this syllabus?" : "Save this syllabus?"}
      submitLabelCreate="Save"
      submitLabelEdit="Save"
      canSubmit={canSubmit}
      hideFieldValidationDialog
      snackbar={null}
      onSnackbarClose={() => {}}
      formTopSlot={
        classReadOnly ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1 }}
            data-testid="text-teacher-class-readonly"
          >
            Class is auto-selected from your assigned class and cannot be changed.
          </Typography>
        ) : null
      }
    />
  );
}
