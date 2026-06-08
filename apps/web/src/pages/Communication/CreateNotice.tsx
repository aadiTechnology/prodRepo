import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Autocomplete, Button, TextField, Typography, Box, FormHeaderIconAction } from "../../components/primitives";
import { useNoticePermissions } from "../../hooks/useNoticePermissions";
import ApplicableToClassSelector from "../../components/reusable/ApplicableToClassSelector";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import type { FormValidationConfig } from "../../utils/formValidation";
import { mapApiErrorsToFields, validateForm } from "../../utils/formValidation";
import schoolClassService from "../../api/services/schoolClassService";
import noticeService from "../../api/services/noticeService";
import { createNoticeFormConfig, type CreateNoticeFormData, type SelectOption } from "./CreateNotice.formConfig";
import type { Notice, NoticeAudienceType, NoticeCreateTarget } from "../../types/notice";
import { audienceTypeLabel, noticeTypeLabel } from "../../utils/noticeLabels";

const MAX_ATTACHMENT_SIZE = 3 * 1024 * 1024;
const MAX_TITLE_LENGTH = 255;
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const UPLOAD_FILE_HINT = "Allowed: PDF, JPG, PNG. Maximum size 3 MB.";

type SavedAttachmentState = {
  id?: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size_kb?: number;
};

function toTodayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function toApiDateTime(value?: string): string | undefined {
  if (!value) return undefined;
  return `${value}T00:00:00`;
}

function fromApiDate(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

const emptyForm = (): CreateNoticeFormData => ({
  title: "",
  description: "",
  audience_type: "STUDENT",
  class_ids: [],
  division_ids: [],
  notice_type: "GENERAL",
  publish_date: toTodayDateInput(),
  expiry_date: "",
  send_notification: false,
});

function noticeToForm(notice: Notice): CreateNoticeFormData {
  const classIds = new Set<number>();
  const divisionIds: number[] = [];
  for (const t of notice.targets) {
    if (t.division_id != null) divisionIds.push(t.division_id);
    else if (t.class_id != null) classIds.add(t.class_id);
  }
  return {
    title: notice.title,
    description: notice.description,
    audience_type: notice.audience_type,
    class_ids: Array.from(classIds),
    division_ids: divisionIds,
    notice_type: notice.notice_type,
    publish_date: fromApiDate(notice.publish_date) || toTodayDateInput(),
    expiry_date: fromApiDate(notice.expiry_date),
    send_notification: notice.send_notification,
  };
}

export default function CreateNotice() {
  const navigate = useNavigate();
  const { id: editIdParam } = useParams<{ id?: string }>();
  const editId = editIdParam ? Number(editIdParam) : NaN;
  const isEditMode = Number.isFinite(editId);
  const perms = useNoticePermissions();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [applicableToError, setApplicableToError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [divisionOptions, setDivisionOptions] = useState<
    { id: string; label: string; value: string; classId: number }[]
  >([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [savedAttachment, setSavedAttachment] = useState<SavedAttachmentState | null>(null);
  const [attachmentCleared, setAttachmentCleared] = useState(false);
  const [dropdownNoticeTypes, setDropdownNoticeTypes] = useState<SelectOption[]>([]);
  const [dropdownAudienceTypes, setDropdownAudienceTypes] = useState<SelectOption[]>([]);

  const initialValues = useMemo(() => emptyForm(), []);
  const validationConfig = useMemo<FormValidationConfig<CreateNoticeFormData>>(
    () => ({
      title: [
        { type: "required", message: "Please enter notice title" },
        {
          type: "custom",
          validate: (data) => {
            const len = String(data.title ?? "").trim().length;
            if (len > MAX_TITLE_LENGTH) return `Title must be at most ${MAX_TITLE_LENGTH} characters`;
            return "";
          },
        },
      ],
      description: [{ type: "required", message: "Please enter description" }],
      publish_date: [{ type: "required", message: "Publish date is required" }],
      notice_type: [{ type: "required", message: "Notice type is required" }],
      audience_type: [{ type: "required", message: "Please select audience" }],
      expiry_date: [
        {
          type: "custom",
          validate: (data) => {
            if (!data.expiry_date || !data.publish_date) return "";
            if (data.expiry_date < data.publish_date) {
              return "Expiry date cannot be before publish date";
            }
            return "";
          },
        },
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
  } = useFormManager<CreateNoticeFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  useEffect(() => {
    schoolClassService
      .getAll()
      .then((classes) => {
        setClassOptions(
          classes.map((cls) => ({
            id: String(cls.id),
            value: String(cls.id),
            label: cls.name,
          }))
        );
        const flatDivisions = classes.flatMap((cls) =>
          (cls.divisions || []).map((division) => ({
            id: String(division.id),
            value: String(division.id),
            label: `${cls.name} - ${division.division_name}`,
            classId: cls.id,
          }))
        );
        setDivisionOptions(flatDivisions);
      })
      .catch(() => {
        setClassOptions([]);
        setDivisionOptions([]);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void noticeService
      .getDropdownOptions()
      .then((d) => {
        if (cancelled) return;
        setDropdownNoticeTypes(
          (d.notice_types ?? []).map((v) => ({
            id: v,
            value: v,
            label: noticeTypeLabel(v),
          }))
        );
        setDropdownAudienceTypes(
          (d.audience_types ?? []).map((v) => ({
            id: v,
            value: v,
            label: audienceTypeLabel(v),
          }))
        );
      })
      .catch(() => {
        if (cancelled) return;
        setDropdownNoticeTypes([
          { id: "GENERAL", value: "GENERAL", label: noticeTypeLabel("GENERAL") },
          { id: "FEE", value: "FEE", label: noticeTypeLabel("FEE") },
          { id: "EVENT", value: "EVENT", label: noticeTypeLabel("EVENT") },
          { id: "HOLIDAY", value: "HOLIDAY", label: noticeTypeLabel("HOLIDAY") },
          { id: "EXAM", value: "EXAM", label: noticeTypeLabel("EXAM") },
        ]);
        setDropdownAudienceTypes([
          { id: "ALL", value: "ALL", label: audienceTypeLabel("ALL") },
          { id: "STUDENT", value: "STUDENT", label: audienceTypeLabel("STUDENT") },
          { id: "TEACHER", value: "TEACHER", label: audienceTypeLabel("TEACHER") },
          { id: "ADMIN", value: "ADMIN", label: audienceTypeLabel("ADMIN") },
        ]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setFetchLoading(false);
      return;
    }
    let cancelled = false;
    void noticeService
      .getById(editId)
      .then((notice) => {
        if (cancelled) return;
        if (notice.status === "EXPIRED") {
          navigate(`/communication/notices/${notice.id}`, { replace: true });
          return;
        }
        resetForm(noticeToForm(notice));
        setLoadedStatus(notice.status);
        if (notice.attachments?.[0]) {
          const a = notice.attachments[0];
          setSavedAttachment({
            id: a.id,
            file_name: a.file_name ?? "attachment",
            file_path: a.file_path ?? "",
            file_type: a.file_type ?? "application/octet-stream",
            file_size_kb: a.file_size_kb ?? undefined,
          });
        } else {
          setSavedAttachment(null);
        }
        setPendingFile(null);
        setAttachmentCleared(false);
        setFetchLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load notice details");
        setFetchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, isEditMode, navigate, resetForm]);

  const classDivisionMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string; divisions: { id: number; name: string }[] }>();
    classOptions.forEach((cls) => {
      map.set(Number(cls.id), { id: Number(cls.id), name: cls.label, divisions: [] });
    });
    divisionOptions.forEach((div) => {
      const classId = Number(div.classId);
      if (!map.has(classId)) return;
      map.get(classId)?.divisions.push({ id: Number(div.id), name: div.label.split(" - ")[1] || div.label });
    });
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [classOptions, divisionOptions]);

  const isApplicableSelectAll = useMemo(
    () =>
      (formData.audience_type === "STUDENT" || formData.audience_type === "ALL") &&
      classDivisionMap.length > 0 &&
      classDivisionMap.every(
        (cls) =>
          formData.class_ids.includes(cls.id) &&
          cls.divisions.every((d) => formData.division_ids.includes(d.id))
      ),
    [classDivisionMap, formData.audience_type, formData.class_ids, formData.division_ids]
  );

  const isClassSelectAll = useMemo(
    () =>
      (formData.audience_type === "STUDENT" || formData.audience_type === "ALL") &&
      classDivisionMap.length > 0 &&
      classDivisionMap.every(
        (cls) =>
          formData.class_ids.includes(cls.id) &&
          cls.divisions.every((d) => formData.division_ids.includes(d.id))
      ),
    [classDivisionMap, formData.audience_type, formData.class_ids, formData.division_ids]
  );

  const validateAudienceSelection = useCallback((): string => {
    if (formData.audience_type !== "STUDENT" && formData.audience_type !== "ALL") return "";
    if (formData.class_ids.length === 0 && formData.division_ids.length === 0) {
      return "Please select audience";
    }
    return "";
  }, [formData.audience_type, formData.class_ids.length, formData.division_ids.length]);

  const buildTargets = useCallback((): NoticeCreateTarget[] => {
    if (formData.audience_type !== "STUDENT" && formData.audience_type !== "ALL") return [];
    if (formData.division_ids.length === 0) return formData.class_ids.map((classId) => ({ class_id: classId }));
    const divisionMap = new Map(divisionOptions.map((d) => [Number(d.id), d.classId]));
    return formData.division_ids.map((divisionId) => ({
      division_id: divisionId,
      class_id: divisionMap.get(divisionId),
    }));
  }, [divisionOptions, formData.audience_type, formData.class_ids, formData.division_ids]);

  const handleApplicableRoleToggle = useCallback(() => undefined, []);

  const handleApplicableSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setFormData((curr) => ({ ...curr, class_ids: [], division_ids: [] }));
        return;
      }
      const allClassIds = classDivisionMap.map((cls) => cls.id);
      const allDivisionIds = classDivisionMap.flatMap((cls) => cls.divisions.map((d) => d.id));
      setFormData((prev) => ({
        ...prev,
        class_ids: allClassIds,
        division_ids: allDivisionIds,
      }));
    },
    [classDivisionMap, setFormData]
  );

  const handleClassToggle = useCallback(
    (classId: number, checked: boolean) => {
      setFormData((prev) => {
        const classDivisionIds = classDivisionMap
          .find((cls) => cls.id === classId)
          ?.divisions.map((d) => d.id) ?? [];
        const nextClasses = checked
          ? Array.from(new Set([...prev.class_ids, classId]))
          : prev.class_ids.filter((id) => id !== classId);
        const nextDivisions = checked
          ? Array.from(new Set([...prev.division_ids, ...classDivisionIds]))
          : prev.division_ids.filter((divId) => !classDivisionIds.includes(divId));
        return {
          ...prev,
          class_ids: nextClasses,
          division_ids: nextDivisions,
        };
      });
    },
    [classDivisionMap, setFormData]
  );

  const handleDivisionToggle = useCallback(
    (classId: number, divisionId: number, checked: boolean) => {
      setFormData((prev) => {
        const classDivisionIds = classDivisionMap
          .find((cls) => cls.id === classId)
          ?.divisions.map((d) => d.id) ?? [];
        const nextDivisions = checked
          ? Array.from(new Set([...prev.division_ids, divisionId]))
          : prev.division_ids.filter((id) => id !== divisionId);
        const hasAnyDivisionForClass = classDivisionIds.some((id) => nextDivisions.includes(id));
        const nextClasses = hasAnyDivisionForClass
          ? Array.from(new Set([...prev.class_ids, classId]))
          : prev.class_ids.filter((id) => id !== classId);
        return {
          ...prev,
          class_ids: nextClasses,
          division_ids: nextDivisions,
        };
      });
    },
    [classDivisionMap, setFormData]
  );

  const handleClassSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setFormData((prev) => ({ ...prev, class_ids: [], division_ids: [] }));
        return;
      }
      const allClassIds = classDivisionMap.map((cls) => cls.id);
      const allDivisionIds = classDivisionMap.flatMap((cls) => cls.divisions.map((d) => d.id));
      setFormData((prev) => ({
        ...prev,
        class_ids: allClassIds,
        division_ids: allDivisionIds,
      }));
    },
    [classDivisionMap, setFormData]
  );

  const applicableTo = useMemo(
    () => ({
      student: formData.audience_type === "STUDENT" || formData.audience_type === "ALL",
      teacher: formData.audience_type === "TEACHER",
      admin: formData.audience_type === "ADMIN",
    }),
    [formData.audience_type]
  );

  useEffect(() => {
    if (formData.audience_type !== "STUDENT" && formData.audience_type !== "ALL") {
      setFormData((prev) =>
        prev.class_ids.length === 0 && prev.division_ids.length === 0
          ? prev
          : { ...prev, class_ids: [], division_ids: [] }
      );
    }
  }, [formData.audience_type, setFormData]);

  const handleUnpublish = useCallback(async () => {
    if (!isEditMode || !Number.isFinite(editId)) return;
    try {
      setPublishLoading(true);
      const res = await noticeService.unpublish(editId);
      setLoadedStatus(res.notice.status);
      setSnackbar(res.message);
    } catch {
      setError("Action not allowed in current state");
    } finally {
      setPublishLoading(false);
    }
  }, [editId, isEditMode]);

  const submitNotice = useCallback(
    async (isDraft: boolean) => {
      const schemaErrors = validateForm(validationConfig, formData);
      const audienceError = validateAudienceSelection();
      setFieldErrors(schemaErrors);
      if (audienceError) {
        setApplicableToError(audienceError);
        return;
      }
      setApplicableToError(null);
      if (Object.keys(schemaErrors).length > 0) return;

      if (isDraft) {
        setLoading(true);
      } else {
        setPublishLoading(true);
      }
      setError(null);
      try {
        const targets = buildTargets();
        const basePayload: Parameters<typeof noticeService.create>[0] = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          audience_type: formData.audience_type as NoticeAudienceType,
          notice_type: formData.notice_type,
          publish_date: toApiDateTime(formData.publish_date),
          expiry_date: toApiDateTime(formData.expiry_date),
          send_notification: formData.send_notification,
          is_draft: isDraft,
          targets,
          attachments: [],
        };

        if (isEditMode) {
          const updatePayload: Parameters<typeof noticeService.update>[1] = { ...basePayload };
          if (attachmentCleared) {
            updatePayload.attachments = [];
          } else if (!pendingFile) {
            delete updatePayload.attachments;
          }
          const updated = await noticeService.update(editId, updatePayload);
          let noticeId = editId;
          setLoadedStatus(updated.status);

          if (pendingFile) {
            try {
              await noticeService.uploadAttachment(noticeId, pendingFile);
            } catch {
              setError(
                `Notice saved, but attachment upload failed. Check file type (PDF, JPG, PNG) and size (max 3 MB).`
              );
              return;
            }
          }

          setSnackbar(isDraft ? "Notice updated successfully." : "Notice published successfully.");
          setTimeout(() => navigate(`/communication/notices/${noticeId}`), 800);
        } else {
          const created = await noticeService.create(basePayload);
          const noticeId = created.id;

          if (pendingFile) {
            try {
              await noticeService.uploadAttachment(noticeId, pendingFile);
            } catch {
              setError(
                `Notice saved, but attachment upload failed. Check file type (PDF, JPG, PNG) and size (max 3 MB).`
              );
              return;
            }
          }

          setSnackbar(isDraft ? "Notice saved as draft successfully." : "Notice published successfully.");
          setTimeout(() => navigate("/communication/notices"), 800);
        }
      } catch (err: unknown) {
        const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
        const fallback = isDraft ? "Unable to save notice" : "Failed to publish notice";
        setError(message || fallback);
      } finally {
        setLoading(false);
        setPublishLoading(false);
      }
    },
    [
      attachmentCleared,
      buildTargets,
      editId,
      formData,
      isEditMode,
      navigate,
      pendingFile,
      setFieldErrors,
      validateAudienceSelection,
      validationConfig,
    ]
  );

  const onAttachmentSelect = useCallback((file?: File) => {
    if (!file) {
      setPendingFile(null);
      setSavedAttachment(null);
      setAttachmentCleared(true);
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type.toLowerCase()) || file.size > MAX_ATTACHMENT_SIZE) {
      setError(`Invalid file format or size exceeded. ${UPLOAD_FILE_HINT}`);
      return;
    }
    setPendingFile(file);
    setSavedAttachment(null);
    setAttachmentCleared(false);
    setError(null);
  }, []);

  const attachmentDisplayName = pendingFile?.name ?? savedAttachment?.file_name ?? null;

  const usesClassAudience = formData.audience_type === "STUDENT" || formData.audience_type === "ALL";

  const applicableSelectionRenderer = useMemo(
    () => (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
        {usesClassAudience ? (
          <ApplicableToClassSelector
            applicableTo={applicableTo}
            isApplicableSelectAll={isApplicableSelectAll}
            isClassSelectAll={isClassSelectAll}
            classDivisionMap={classDivisionMap}
            selectedClassIds={formData.class_ids}
            selectedDivisionIds={formData.division_ids}
            error={applicableToError}
            onApplicableSelectAll={handleApplicableSelectAll}
            onApplicableRoleToggle={handleApplicableRoleToggle}
            onClassSelectAll={handleClassSelectAll}
            onClassToggle={handleClassToggle}
            onDivisionToggle={handleDivisionToggle}
            hideApplicableRoleControls
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Class and division selection is available when audience is All or Students.
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Attachment (PDF/Image)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {UPLOAD_FILE_HINT}
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          hidden
          onChange={(e) => void onAttachmentSelect(e.target.files?.[0])}
        />
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            Upload File
          </Button>
          {attachmentDisplayName ? (
            <>
              <Typography variant="body2">{attachmentDisplayName}</Typography>
              <Button variant="text" color="error" onClick={() => onAttachmentSelect(undefined)}>
                Remove
              </Button>
            </>
          ) : null}
        </Box>
      </Box>
    ),
    [
      applicableTo,
      applicableToError,
      attachmentDisplayName,
      classDivisionMap,
      formData.class_ids,
      formData.division_ids,
      handleApplicableRoleToggle,
      handleApplicableSelectAll,
      handleClassSelectAll,
      handleClassToggle,
      handleDivisionToggle,
      isApplicableSelectAll,
      isClassSelectAll,
      loading,
      onAttachmentSelect,
      usesClassAudience,
    ]
  );

  const audienceTypeRenderer = useMemo(
    () => (
      <Autocomplete<SelectOption, false, false, false>
        options={dropdownAudienceTypes}
        value={dropdownAudienceTypes.find((o) => o.value === formData.audience_type) ?? null}
        onChange={(_, option) => {
          handleFieldValueChange("audience_type", (option?.value ?? "STUDENT") as NoticeAudienceType);
        }}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Audience"
            required
            error={Boolean(fieldErrors.audience_type)}
            helperText={fieldErrors.audience_type}
          />
        )}
      />
    ),
    [dropdownAudienceTypes, fieldErrors.audience_type, formData.audience_type, handleFieldValueChange]
  );

  const noticeTypeRenderer = useMemo(
    () => (
      <Autocomplete<SelectOption, false, false, false>
        options={dropdownNoticeTypes}
        value={dropdownNoticeTypes.find((o) => o.value === formData.notice_type) ?? null}
        onChange={(_, option) => {
          handleFieldValueChange("notice_type", option?.value ?? "GENERAL");
        }}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Notice Type"
            required
            error={Boolean(fieldErrors.notice_type)}
            helperText={fieldErrors.notice_type}
          />
        )}
      />
    ),
    [dropdownNoticeTypes, fieldErrors.notice_type, formData.notice_type, handleFieldValueChange]
  );

  const formConfig = useMemo(
    () =>
      createNoticeFormConfig({
        audienceOptions: dropdownAudienceTypes,
        noticeTypeOptions: dropdownNoticeTypes,
        applicableSelectionRenderer,
        audienceTypeRenderer,
        noticeTypeRenderer,
      }),
    [
      applicableSelectionRenderer,
      audienceTypeRenderer,
      dropdownAudienceTypes,
      dropdownNoticeTypes,
      noticeTypeRenderer,
    ]
  );

  const handleConfirmSubmit = async () => {
    await submitNotice(true);
  };

  return (
    <BaseForm<CreateNoticeFormData>
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
          { title: "Notice Board", path: "/communication/notices" },
          { title: isEditMode ? "Edit Notice" : "Create Notice", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save Draft",
        saveTooltipEdit: "Save changes",
      }}
      onCancelNavigate={() => navigate("/communication/notices")}
      confirmMessage={
        isEditMode ? "Are you sure you want to save changes to this notice?" : "Are you sure you want to save this notice as draft?"
      }
      submitLabelCreate="Save Draft"
      submitLabelEdit="Save"
      canSubmit={perms.canCreate || perms.canEdit}
      extraHeaderActions={
        <>
          {isEditMode && loadedStatus === "PUBLISHED" && perms.canEdit ? (
            <Button
              variant="outlined"
              color="warning"
              size="small"
              onClick={() => void handleUnpublish()}
              disabled={publishLoading || loading || fetchLoading}
              sx={{ mr: 0.5 }}
            >
              Unpublish
            </Button>
          ) : null}
          {(perms.canCreate || perms.canEdit) ? (
            <FormHeaderIconAction
              variant="publish"
              tooltipTitle={isEditMode ? "Publish notice" : "Publish Notice"}
              onClick={() => void submitNotice(false)}
              disabled={loading || fetchLoading}
              loading={publishLoading}
            />
          ) : null}
        </>
      }
    />
  );
}
