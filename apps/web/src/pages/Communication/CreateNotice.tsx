import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Typography, Box, FormHeaderIconAction } from "../../components/primitives";
import ApplicableToClassSelector from "../../components/reusable/ApplicableToClassSelector";
import BaseForm from "../../components/reusable/BaseForm";
import { useFormManager } from "../../hooks/useFormManager";
import type { FormValidationConfig } from "../../utils/formValidation";
import { mapApiErrorsToFields, validateForm } from "../../utils/formValidation";
import schoolClassService from "../../api/services/schoolClassService";
import noticeService from "../../api/services/noticeService";
import { createNoticeFormConfig, type CreateNoticeFormData } from "./CreateNotice.formConfig";
import type { NoticeCreateAttachment, NoticeCreateTarget } from "../../types/notice";

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

type AttachmentState = {
  file_name: string;
  file_path: string;
  file_type: string;
};

type ApplicableRole = "student" | "teacher" | "admin";

function toTodayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function toApiDateTime(value?: string): string | undefined {
  if (!value) return undefined;
  return `${value}T00:00:00`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const emptyForm = (): CreateNoticeFormData => ({
  title: "",
  description: "",
  class_ids: [],
  division_ids: [],
  notice_type: "General",
  publish_date: toTodayDateInput(),
  expiry_date: "",
  send_notification: false,
});

export default function CreateNotice() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicableToError, setApplicableToError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<{ id: string; label: string; value: string }[]>([]);
  const [divisionOptions, setDivisionOptions] = useState<
    { id: string; label: string; value: string; classId: number }[]
  >([]);
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const [applicableTo, setApplicableTo] = useState<Record<ApplicableRole, boolean>>({
    student: true,
    teacher: false,
    admin: false,
  });

  const initialValues = useMemo(() => emptyForm(), []);
  const validationConfig = useMemo<FormValidationConfig<CreateNoticeFormData>>(
    () => ({
      title: [{ type: "required", message: "Please enter notice title" }],
      description: [{ type: "required", message: "Please enter description" }],
      publish_date: [{ type: "required", message: "Publish date is required" }],
      notice_type: [{ type: "required", message: "Notice type is required" }],
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

  const isApplicableSelectAll = applicableTo.admin && applicableTo.teacher && applicableTo.student;
  const isClassSelectAll = useMemo(
    () =>
      classDivisionMap.length > 0 &&
      classDivisionMap.every(
        (cls) =>
          formData.class_ids.includes(cls.id) &&
          cls.divisions.every((d) => formData.division_ids.includes(d.id))
      ),
    [classDivisionMap, formData.class_ids, formData.division_ids]
  );

  const validateAudienceSelection = useCallback((): string => {
    if (!applicableTo.admin && !applicableTo.teacher && !applicableTo.student) {
      return "Applicable To is required";
    }
    if (!applicableTo.student) return "";
    if (formData.class_ids.length === 0 && formData.division_ids.length === 0) {
      return "Please select audience";
    }
    return "";
  }, [
    applicableTo.admin,
    applicableTo.teacher,
    applicableTo.student,
    formData.class_ids.length,
    formData.division_ids.length,
  ]);

  const buildTargets = useCallback((): NoticeCreateTarget[] => {
    if (!applicableTo.student) return [];
    if (formData.division_ids.length === 0) return formData.class_ids.map((classId) => ({ class_id: classId }));
    const divisionMap = new Map(divisionOptions.map((d) => [Number(d.id), d.classId]));
    return formData.division_ids.map((divisionId) => ({
      division_id: divisionId,
      class_id: divisionMap.get(divisionId),
    }));
  }, [applicableTo.student, divisionOptions, formData.class_ids, formData.division_ids]);

  const handleApplicableRoleToggle = useCallback(
    (role: ApplicableRole) => {
      setApplicableTo((prev) => {
        const next = { ...prev, [role]: !prev[role] };
        setApplicableToError(null);
        if (!next.student) {
          setFormData((curr) => ({
            ...curr,
            class_ids: [],
            division_ids: [],
          }));
        }
        return next;
      });
    },
    [setFormData]
  );

  const handleApplicableSelectAll = useCallback(
    (checked: boolean) => {
      setApplicableTo({
        admin: checked,
        teacher: checked,
        student: checked,
      });
      setApplicableToError(null);
      if (!checked) {
        setFormData((curr) => ({ ...curr, class_ids: [], division_ids: [] }));
      }
    },
    [setFormData]
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

      setLoading(true);
      setError(null);
      try {
        const targets = buildTargets();
        const audienceType =
          targets.length === 0 ? "ALL" : targets.some((t) => t.division_id != null) ? "DIVISION" : "CLASS";
        const attachments: NoticeCreateAttachment[] = attachment
          ? [
              {
                file_name: attachment.file_name,
                file_path: attachment.file_path,
                file_type: attachment.file_type,
              },
            ]
          : [];

        await noticeService.create({
          title: formData.title.trim(),
          description: formData.description.trim(),
          audience_type: audienceType,
          notice_type: formData.notice_type,
          publish_date: toApiDateTime(formData.publish_date),
          expiry_date: toApiDateTime(formData.expiry_date),
          send_notification: formData.send_notification,
          is_draft: isDraft,
          targets,
          attachments,
        });
        setSnackbar(isDraft ? "Notice saved as draft successfully" : "Notice published successfully");
        setTimeout(() => navigate("/"), 1000);
      } catch (err: unknown) {
        const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
        setError(message || (isDraft ? "Unable to save notice" : "Failed to publish notice"));
      } finally {
        setLoading(false);
      }
    },
    [
      attachment,
      buildTargets,
      formData,
      navigate,
      setFieldErrors,
      validateAudienceSelection,
      validationConfig,
    ]
  );

  const onAttachmentSelect = useCallback(async (file?: File) => {
    if (!file) {
      setAttachment(null);
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type.toLowerCase()) || file.size > MAX_ATTACHMENT_SIZE) {
      setError("Invalid file format or size exceeded");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAttachment({
        file_name: file.name,
        file_path: dataUrl,
        file_type: file.type,
      });
      setError(null);
    } catch {
      setError("File upload failed");
    }
  }, []);

  const applicableSelectionRenderer = useMemo(
    () => (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
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
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Attachment (PDF/Image)
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
          {attachment ? (
            <>
              <Typography variant="body2">{attachment.file_name}</Typography>
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
      attachment,
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
    ]
  );

  const formConfig = useMemo(
    () =>
      createNoticeFormConfig({
        applicableSelectionRenderer,
      }),
    [applicableSelectionRenderer]
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
      isEditMode={false}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Communication", path: "/communication/notices" },
          { title: "Create Notice", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save Draft",
      }}
      onCancelNavigate={() => navigate("/")}
      confirmMessage="Are you sure you want to save this notice as draft?"
      submitLabelCreate="Save Draft"
      extraHeaderActions={
        <FormHeaderIconAction
          variant="save"
          tooltipTitle="Publish Notice"
          onClick={() => void submitNotice(false)}
          disabled={loading}
          loading={loading}
        />
      }
    />
  );
}
