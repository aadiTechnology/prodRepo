import { useState, useEffect, useMemo, useCallback, useRef, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRBAC } from "../../context/RBACContext";
import { useAuth } from "../../context/AuthContext";
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  alpha,
} from "@mui/material";
import { FormHeaderIconAction } from "../../components/primitives";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useFormManager } from "../../hooks/useFormManager";
import BaseForm from "../../components/reusable/BaseForm";
import { FormSectionLabel } from "../../components/reusable";
import { homeworkService, type HomeworkAttachment } from "../../api/services/homeworkService";
import { academicYearService } from "../../api/services/dropdownServices";
import {
  createHomeworkFormConfig,
  formatHomeworkClassLabel,
  type AddHomeworkFormData,
} from "./AddHomework.formConfig";
import { colorTokens } from "../../tokens/colors";
import { useSnackbar } from "notistack";
import { resolveCurrentAcademicYearId } from "../../utils/academicYear";
import { isTeacherNoticeUser } from "../../utils/noticeAudience";

type DropdownOption = { label: string; value: string };

// Pending file to upload (not yet saved to server)
interface PendingFile {
  id: string; // local key
  file: File;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function AddHomework() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id && id !== "new");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { hasPermission, roles, hasAnyRole } = useRBAC();

  const canCreate = hasPermission("HOMEWORK_MGMT:create");
  const canEdit = hasPermission("HOMEWORK_MGMT:edit");
  const canDelete = hasPermission("HOMEWORK_MGMT:delete");
  const isTeacherScoped = useMemo(() => {
    const isAdminLike = hasAnyRole(["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"]);
    return !isAdminLike && isTeacherNoticeUser(user?.role, roles);
  }, [hasAnyRole, roles, user?.role]);

  const isAuthorized = isEditMode ? canEdit : canCreate;

  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState("");
  const [loadedFormSnapshot, setLoadedFormSnapshot] = useState<AddHomeworkFormData | null>(null);
  const [loadedAttachmentSnapshot, setLoadedAttachmentSnapshot] = useState<HomeworkAttachment[]>([]);
  // Prevents the class_id watcher from resetting subject/division when edit data loads.
  const isDataLoadedRef = useRef(!isEditMode);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classOptions, setClassOptions] = useState<DropdownOption[]>([]);
  const [divisionOptions, setDivisionOptions] = useState<DropdownOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<DropdownOption[]>([]);

  // Attachments
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [savedAttachments, setSavedAttachments] = useState<HomeworkAttachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [deletingAttId, setDeletingAttId] = useState<number | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const initialValues = useMemo<AddHomeworkFormData>(
    () => ({
      academic_year_id: "",
      class_id: "",
      class_division_id: "",
      subject_id: "",
      title: "",
      instructions: "",
      assigned_date: today,
      submission_date: "",
      notify_parents: false,
      status: "Published",
    }),
    [today],
  );

  const validationConfig = useMemo<FormValidationConfig<AddHomeworkFormData>>(
    () => ({
      class_id: [{ type: "required", message: "Please select class" }],
      subject_id: [{ type: "required", message: "Please select subject" }],
      title: [{ type: "required", message: "Please enter homework title" }],
      assigned_date: [{ type: "required", message: "Please select assigned date" }],
      submission_date: [{ type: "required", message: "Please select submission date" }],
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
    handleSubmit: baseHandleSubmit,
    resetForm,
  } = useFormManager<AddHomeworkFormData>({
    initialValues,
    validationConfig,
    onClearError: clearError,
  });

  // Load dropdown options on mount — classes are scoped to the teacher's assignments
  useEffect(() => {
    homeworkService
      .getTeacherClasses()
      .then((classes) => {
        const nextClassOptions = classes.map((c) => ({
          label: formatHomeworkClassLabel(c.name),
          value: String(c.id),
        }));
        setClassOptions(nextClassOptions);
        if (!isEditMode && isTeacherScoped && nextClassOptions.length > 0) {
          handleFieldValueChange("class_id", nextClassOptions[0].value);
        }
      })
      .catch(() => {});

    academicYearService
      .list()
      .then((years: { id: number; is_current?: boolean | number; is_active?: boolean | number }[]) => {
        const yearId = resolveCurrentAcademicYearId(years);
        if (!yearId) return;
        setCurrentAcademicYearId(yearId);
        if (!isEditMode) {
          handleFieldValueChange("academic_year_id", yearId);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, isTeacherScoped, handleFieldValueChange]);

  // When class changes — reload divisions and subjects
  useEffect(() => {
    const classId = formData.class_id;
    if (!classId) {
      setDivisionOptions([]);
      setSubjectOptions([]);
      return;
    }

    // Load divisions via homework-specific endpoint (accessible to teachers)
    homeworkService
      .getDivisionsForClass(Number(classId))
      .then((divs) => {
        const nextDivisionOptions = divs.map((d) => ({
          label: formatHomeworkClassLabel(d.division_name),
          value: String(d.id),
        }));
        setDivisionOptions(nextDivisionOptions);
        if (!isEditMode && isTeacherScoped) {
          handleFieldValueChange("class_division_id", nextDivisionOptions[0]?.value ?? "");
        }
      })
      .catch(() => setDivisionOptions([]));

    // Load subjects for this teacher + class
    const yearId = formData.academic_year_id ? Number(formData.academic_year_id) : undefined;
    homeworkService
      .getSubjectsForClass(Number(classId), yearId)
      .then((subjects) =>
        setSubjectOptions(
          subjects.map((s) => ({ label: `${s.name} (${s.code})`, value: String(s.id) })),
        ),
      )
      .catch(() => setSubjectOptions([]));

    // Reset dependent dropdowns only when the user manually picks a different class
    // Skip reset during initial data load in edit mode
    if (isDataLoadedRef.current) {
      handleFieldValueChange("class_division_id", "");
      handleFieldValueChange("subject_id", "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.class_id, isEditMode, isTeacherScoped, handleFieldValueChange]);

  // Load existing homework data in edit mode
  useEffect(() => {
    if (!isEditMode || !id) return;
    setFetchLoading(true);
    homeworkService
      .getById(Number(id))
      .then((hw) => {
        const snapshot: AddHomeworkFormData = {
          academic_year_id: String(hw.academic_year_id),
          class_id: String(hw.class_id),
          class_division_id: hw.class_division_id ? String(hw.class_division_id) : "",
          subject_id: String(hw.subject_id),
          title: hw.title,
          instructions: hw.instructions ?? "",
          assigned_date: hw.assigned_date,
          submission_date: hw.submission_date,
          notify_parents: false,
          status: hw.status,
        };
        setFormData(snapshot);
        setLoadedFormSnapshot(snapshot);
        setSavedAttachments(hw.attachments ?? []);
        setLoadedAttachmentSnapshot(hw.attachments ?? []);
        // Settle renders before enabling manual reset behavior
        setTimeout(() => {
          isDataLoadedRef.current = true;
        }, 100);
      })
      .catch(() => setError("Unable to load homework details"))
      .finally(() => setFetchLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const validated: PendingFile[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError("Invalid file format. Allowed: images, PDF, Word, TXT");
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setFileError("File size exceeded. Maximum 10 MB per file.");
        continue;
      }
      validated.push({ id: `${Date.now()}-${file.name}`, file });
    }
    setPendingFiles((prev) => [...prev, ...validated]);
    // Reset input so same file can be re-added after removal
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (fileId: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleDeleteSavedAttachment = async (attId: number) => {
    if (!id || !canEdit) return;
    try {
      setDeletingAttId(attId);
      await homeworkService.deleteAttachment(Number(id), attId);
      setSavedAttachments((prev) => prev.filter((a) => a.id !== attId));
    } catch {
      setError("Failed to delete attachment");
    } finally {
      setDeletingAttId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Submit helpers
  // ---------------------------------------------------------------------------
  const validateDates = (): boolean => {
    if (formData.submission_date && formData.assigned_date) {
      if (new Date(formData.submission_date) < new Date(formData.assigned_date)) {
        setFieldErrors((prev) => ({
          ...prev,
          submission_date: "Submission date cannot be before assigned date",
        }));
        return false;
      }
    }
    return true;
  };

  const buildPayload = (statusOverride: "Draft" | "Published") => ({
    academic_year_id: Number(formData.academic_year_id),
    class_id: Number(formData.class_id),
    class_division_id: formData.class_division_id ? Number(formData.class_division_id) : null,
    subject_id: Number(formData.subject_id),
    title: formData.title.trim(),
    instructions: formData.instructions.trim() || null,
    assigned_date: formData.assigned_date,
    submission_date: formData.submission_date,
    notify_parents: false,
    status: statusOverride,
  });

  const submitHomework = useCallback(
    async (statusOverride: "Draft" | "Published") => {
      if (!formData.academic_year_id) {
        setError("Unable to resolve the current academic year. Please refresh and try again.");
        return;
      }
      if (!validateDates()) return;
      const isDraft = statusOverride === "Draft";
      try {
        if (isDraft) {
          setLoading(true);
        } else {
          setPublishLoading(true);
        }
        setError(null);

        let homeworkId: number;

        if (isEditMode && id) {
          await homeworkService.update(Number(id), buildPayload(statusOverride));
          homeworkId = Number(id);
          enqueueSnackbar("Homework updated successfully", {
            variant: "success",
            autoHideDuration: 3000,
            anchorOrigin: { vertical: "top", horizontal: "center" },
          });
        } else {
          const hw = await homeworkService.create(buildPayload(statusOverride));
          homeworkId = hw.id;
          enqueueSnackbar(
            statusOverride === "Published"
              ? "Homework assigned successfully"
              : "Homework saved as draft",
            {
              variant: "success",
              autoHideDuration: 3000,
              anchorOrigin: { vertical: "top", horizontal: "center" },
            }
          );
        }

        // Upload any pending attachments
        const uploadErrors: string[] = [];
        const uploaded: HomeworkAttachment[] = [];
        for (const pf of pendingFiles) {
          try {
            const att = await homeworkService.uploadAttachment(homeworkId, pf.file);
            uploaded.push(att);
          } catch {
            uploadErrors.push(pf.file.name);
          }
        }

        if (uploadErrors.length > 0) {
          // Keep only the files that failed so the user can retry.
          if (uploaded.length > 0) {
            setSavedAttachments((prev) => [...prev, ...uploaded]);
          }
          setPendingFiles((prev) =>
            prev.filter((pf) => uploadErrors.includes(pf.file.name)),
          );
          setError(
            `Failed to upload: ${uploadErrors.join(", ")}. Homework was saved — please retry the upload.`,
          );
          return;
        }

        // All uploads succeeded — update the saved list and clear pending.
        if (uploaded.length > 0) {
          setSavedAttachments((prev) => [...prev, ...uploaded]);
          setPendingFiles([]);
        }

        navigate("/homework");
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (detail && typeof detail === "object") {
          const mapped = mapApiErrorsToFields(detail);
          setFieldErrors(mapped as any);
        } else {
          setError(detail || "Unable to save homework");
        }
      } finally {
        setLoading(false);
        setPublishLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, isEditMode, id, pendingFiles, enqueueSnackbar],
  );

  const validateDraftFields = useCallback(() => {
    const draftErrors: Partial<Record<keyof AddHomeworkFormData, string>> = {};
    if (!formData.class_id) draftErrors.class_id = "Please select class";
    if (!formData.subject_id) draftErrors.subject_id = "Please select subject";
    if (!formData.title.trim()) draftErrors.title = "Please enter homework title";
    if (!formData.assigned_date) draftErrors.assigned_date = "Please select assigned date";
    return draftErrors;
  }, [formData]);

  const handleDraftSubmit = useCallback(
    (e: FormEvent, onValid?: () => void) => {
      e.preventDefault();
      setHasAttemptedSubmit(true);
      const draftErrors = validateDraftFields();
      if (Object.keys(draftErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...draftErrors }));
        return;
      }
      onValid?.();
    },
    [setFieldErrors, validateDraftFields],
  );

  const handleConfirmDraft = useCallback(async () => {
    if (!formData.submission_date) {
      setFormData((prev) => ({ ...prev, submission_date: formData.assigned_date }));
    }
    await submitHomework("Draft");
  }, [formData.assigned_date, formData.submission_date, setFormData, submitHomework]);

  const handlePublish = useCallback(() => {
    setHasAttemptedSubmit(true);
    baseHandleSubmit({ preventDefault: () => {} } as FormEvent, () => {
      void submitHomework("Published");
    });
  }, [baseHandleSubmit, submitHomework]);

  const handleResetForm = useCallback(() => {
    if (isEditMode && loadedFormSnapshot) {
      resetForm(loadedFormSnapshot);
      setSavedAttachments(loadedAttachmentSnapshot);
      setPendingFiles([]);
    } else {
      resetForm({
        ...initialValues,
        academic_year_id: currentAcademicYearId,
        assigned_date: today,
      });
      setSavedAttachments([]);
      setLoadedAttachmentSnapshot([]);
      setPendingFiles([]);
    }
    setFieldErrors({});
    setHasAttemptedSubmit(false);
    setError(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [
    currentAcademicYearId,
    initialValues,
    isEditMode,
    loadedAttachmentSnapshot,
    loadedFormSnapshot,
    resetForm,
    setFieldErrors,
    today,
  ]);

  // ---------------------------------------------------------------------------
  // Attachment panel (below form fields, above footer actions)
  // ---------------------------------------------------------------------------
  const attachmentSlot = (
    <Box
      sx={{
        border: `1.5px dashed ${alpha(colorTokens.primary.main, 0.35)}`,
        borderRadius: "10px",
        p: 2,
        mt: 1,
        bgcolor: alpha(colorTokens.primary.main, 0.025),
      }}
    >
      <FormSectionLabel title="Attachments" icon={<AttachFileIcon fontSize="small" />} />

      {/* Upload button */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, mb: fileError ? 0 : 1 }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px" }}
        >
          Upload File
        </Button>
        <Typography variant="caption" color="text.secondary">
          PDF, Word, images (max 10 MB each)
        </Typography>
      </Box>

      {fileError && (
        <Typography variant="caption" color="error" sx={{ display: "block", mb: 1 }}>
          {fileError}
        </Typography>
      )}

      {/* Already-saved attachments (edit mode) */}
      {savedAttachments.length > 0 && (
        <List dense disablePadding sx={{ mb: 1 }}>
          {savedAttachments.map((att) => (
            <ListItem
              key={att.id}
              disablePadding
              sx={{
                bgcolor: alpha(colorTokens.primary.main, 0.06),
                borderRadius: "8px",
                mb: 0.5,
                px: 1,
                py: 0.5,
              }}
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  color="error"
                  disabled={deletingAttId === att.id || !canEdit}
                  onClick={() => handleDeleteSavedAttachment(att.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <InsertDriveFileIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 320 }}>
                    {att.file_name}
                  </Typography>
                }
                secondary={
                  att.file_size_kb
                    ? `${att.file_size_kb} KB · ${att.file_type?.toUpperCase() ?? ""}`
                    : att.file_type?.toUpperCase()
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Pending (not yet uploaded) files */}
      {pendingFiles.length > 0 && (
        <List dense disablePadding>
          {pendingFiles.map((pf) => (
            <ListItem
              key={pf.id}
              disablePadding
              sx={{
                bgcolor: alpha(colorTokens.preschool.mint.main, 0.08),
                borderRadius: "8px",
                mb: 0.5,
                px: 1,
                py: 0.5,
              }}
              secondaryAction={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Chip
                    label="New"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: alpha(colorTokens.preschool.mint.main, 0.2),
                      color: colorTokens.preschool.mint.dark,
                    }}
                  />
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    onClick={() => removePendingFile(pf.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <InsertDriveFileIcon fontSize="small" sx={{ color: colorTokens.preschool.mint.dark }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 300 }}>
                    {pf.file.name}
                  </Typography>
                }
                secondary={formatBytes(pf.file.size)}
              />
            </ListItem>
          ))}
        </List>
      )}

      {savedAttachments.length === 0 && pendingFiles.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          No attachments added yet.
        </Typography>
      )}
    </Box>
  );

  const formConfig = useMemo(
    () =>
      createHomeworkFormConfig({
        classOptions,
        divisionOptions,
        subjectOptions,
        classSelected: Boolean(formData.class_id),
        attachmentSlot,
      }),
    [classOptions, divisionOptions, subjectOptions, formData.class_id, attachmentSlot],
  );

  const displayFieldErrors = useMemo(
    () => (hasAttemptedSubmit ? fieldErrors : {}),
    [hasAttemptedSubmit, fieldErrors],
  );

  if (!isAuthorized) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          You do not have permission to {isEditMode ? "edit" : "create"} homework.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/homework")}>
          Back to Homework List
        </Button>
      </Box>
    );
  }

  return (
    <BaseForm
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={displayFieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleDraftSubmit}
      setFormError={setError}
      onConfirmSubmit={handleConfirmDraft}
      isEditMode={isEditMode}
      loading={loading}
      fetchLoading={fetchLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={null}
      onSnackbarClose={() => {}}
      headerConfig={{
        links: [
          { title: "Homework", path: "/homework" },
          { title: isEditMode ? "Edit Homework" : "Assign Homework", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Clear form",
        saveTooltipCreate: "Save as Draft",
        saveTooltipEdit: "Save as Draft",
      }}
      hideHeaderCancel
      submitLabelCreate="Save as Draft"
      submitLabelEdit="Save as Draft"
      confirmMessage={
        isEditMode
          ? "Are you sure you want to save this homework as draft?"
          : "Are you sure you want to save this homework as draft?"
      }
      onCancelNavigate={handleResetForm}
      extraHeaderActions={
        <FormHeaderIconAction
          variant="publish"
          tooltipTitle={isEditMode ? "Publish homework" : "Publish Homework"}
          onClick={handlePublish}
          disabled={loading || fetchLoading}
          loading={publishLoading}
        />
      }
    />
  );
}
