import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import {
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  UploadFile as UploadFileIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import BaseForm from "../../components/reusable/BaseForm";
import PrimaryActionButton from "../../components/reusable/PrimaryActionButton";
import ApplicableToClassSelector from "../../components/reusable/ApplicableToClassSelector";
import { FormSectionLabel } from "../../components/reusable";
import { FormHeaderIconAction } from "../../components/primitives";
import TextFieldInput from "../../components/semantic/TextFieldInput";
import { useFormManager } from "../../hooks/useFormManager";
import { useActivityGalleryPermissions } from "../../hooks/useActivityGalleryPermissions";
import { useGalleryMediaSrc } from "../../hooks/useGalleryMediaSrc";
import activityGalleryService from "../../api/services/activityGalleryService";
import schoolClassService from "../../api/services/schoolClassService";
import type {
  ActivityGallery,
  ActivityGalleryClassTarget,
  ActivityGalleryMedia,
  GalleryType,
} from "../../types/activityGallery";
import { mapApiErrorsToFields, validateForm, type FormValidationConfig } from "../../utils/formValidation";
import {
  createActivityGalleryFormConfig,
  type CreateActivityGalleryFormData,
} from "./CreateActivityGallery.formConfig";
import { colorTokens } from "../../tokens/colors";
import { apiBaseUrl } from "../../config";
import { extractYoutubeVideoId, buildYoutubeEmbedUrl, isYoutubeUrl } from "../../utils/youtube";

const GALLERY_PATH = "/activity-management/photo-video-gallery";
const PERSIST_VALIDATION_MESSAGE = "Please complete all required fields before saving.";
const MAX_MEDIA = 20;
const MAX_PHOTO_TOTAL_MB = 10;
const MAX_PHOTO_TOTAL_BYTES = MAX_PHOTO_TOTAL_MB * 1024 * 1024;

const PHOTO_FORMATS_LABEL = "JPG, JPEG, PNG, JFIF";
const PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/jfif"];
const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".jfif"];

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function isAllowedPhoto(file: File): boolean {
  return PHOTO_TYPES.includes(file.type) || PHOTO_EXTENSIONS.includes(fileExtension(file.name));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildMediaUrl(filePath: string): string {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  if (filePath.includes("/media/") && filePath.endsWith("/content")) {
    return "";
  }
  return `${apiBaseUrl}${filePath}`;
}

function GalleryMediaPreviewDialog({
  media,
  galleryType,
  open,
  onClose,
}: {
  media: ActivityGalleryMedia | null;
  galleryType: GalleryType;
  open: boolean;
  onClose: () => void;
}) {
  const photoSrc = useGalleryMediaSrc(
    open && galleryType === "Photo" ? media?.file_path : undefined,
  );

  if (!media) return null;

  const title = media.original_file_name || media.file_name;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>{title}</DialogTitle>
      <DialogContent>
        {galleryType === "Photo" ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 280,
              bgcolor: alpha(colorTokens.text.primary, 0.04),
              borderRadius: 2,
            }}
          >
            {photoSrc ? (
              <Box
                component="img"
                src={photoSrc}
                alt={title}
                sx={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
              />
            ) : (
              <CircularProgress />
            )}
          </Box>
        ) : isYoutubeUrl(media.file_path) ? (
          <Box
            component="iframe"
            src={buildYoutubeEmbedUrl(media.file_path)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sx={{ width: "100%", minHeight: 420, border: 0, display: "block", borderRadius: 2 }}
          />
        ) : (
          <Box
            component="video"
            src={buildMediaUrl(media.file_path)}
            controls
            sx={{ width: "100%", maxHeight: "70vh", display: "block", borderRadius: 2 }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function galleryToForm(gallery: ActivityGallery): CreateActivityGalleryFormData {
  const mappings = gallery.class_mappings ?? [];
  const classIds = new Set<number>();
  const divisionIds: number[] = [];
  for (const mapping of mappings) {
    classIds.add(mapping.class_id);
    divisionIds.push(mapping.division_id);
  }
  if (classIds.size === 0 && gallery.class_id != null) {
    classIds.add(gallery.class_id);
  }
  if (divisionIds.length === 0 && gallery.division_id != null) {
    divisionIds.push(gallery.division_id);
  }
  return {
    gallery_name: gallery.gallery_name,
    activity_date: gallery.activity_date?.slice(0, 10) ?? "",
    class_ids: Array.from(classIds),
    division_ids: divisionIds,
    description: gallery.description ?? "",
  };
}

export default function CreateActivityGallery() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const galleryId = id ? Number(id) : NaN;
  const perms = useActivityGalleryPermissions();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const teacherDefaultsAppliedRef = useRef(false);

  const initialGalleryType = (location.state as { galleryType?: GalleryType } | null)?.galleryType ?? "Photo";
  const [galleryType, setGalleryType] = useState<GalleryType>(initialGalleryType);
  const [galleryRecord, setGalleryRecord] = useState<ActivityGallery | null>(null);

  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [associatedClassesError, setAssociatedClassesError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [classOptions, setClassOptions] = useState<
    { id: string; label: string; value: string }[]
  >([]);
  const [divisionOptions, setDivisionOptions] = useState<
    { id: string; label: string; value: string; classId: number }[]
  >([]);
  const [savedMedia, setSavedMedia] = useState<ActivityGalleryMedia[]>([]);
  const [deletingMediaId, setDeletingMediaId] = useState<number | null>(null);
  const [previewMedia, setPreviewMedia] = useState<ActivityGalleryMedia | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const initialValues = useMemo<CreateActivityGalleryFormData>(
    () => ({
      gallery_name: "",
      activity_date: today,
      class_ids: [],
      division_ids: [],
      description: "",
    }),
    [today],
  );

  const validationConfig = useMemo<FormValidationConfig<CreateActivityGalleryFormData>>(
    () => ({
      gallery_name: [{ type: "required", message: "Please enter gallery name" }],
      activity_date: [{ type: "required", message: "Please select activity date" }],
    }),
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  const {
    formData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit: baseHandleSubmit,
    setFormData,
  } = useFormManager<CreateActivityGalleryFormData>({
    initialValues,
    validationConfig,
    onClearError: clearError,
  });

  const effectiveGalleryId = galleryRecord?.id ?? (Number.isFinite(galleryId) ? galleryId : null);
  const mediaCount = savedMedia.length;
  const uploadedPhotoBytes = useMemo(
    () => savedMedia.reduce((sum, item) => sum + (item.file_size ?? 0), 0),
    [savedMedia],
  );
  const isAuthorized = isEditMode ? perms.canEdit : perms.canCreate;

  useEffect(() => {
    activityGalleryService
      .getTeacherScope()
      .then((scope) => {
        if (scope.is_teacher && scope.classes.length > 0) {
          setClassOptions(
            scope.classes.map((cls) => ({
              id: String(cls.id),
              label: cls.name,
              value: String(cls.id),
            })),
          );
          setDivisionOptions(
            scope.classes.flatMap((cls) =>
              cls.divisions.map((division) => ({
                id: String(division.id),
                label: `${cls.name} - ${division.division_name}`,
                value: String(division.id),
                classId: cls.id,
              })),
            ),
          );
          if (
            !isEditMode &&
            !teacherDefaultsAppliedRef.current &&
            scope.default_targets.length > 0
          ) {
            teacherDefaultsAppliedRef.current = true;
            const classIds = Array.from(
              new Set(scope.default_targets.map((target) => target.class_id)),
            );
            const divisionIds = scope.default_targets.map((target) => target.division_id);
            setFormData((prev) => ({
              ...prev,
              class_ids: classIds,
              division_ids: divisionIds,
            }));
          }
          return;
        }

        return schoolClassService.getAll().then((classes) => {
          setClassOptions(
            classes.map((cls) => ({
              id: String(cls.id),
              label: cls.name,
              value: String(cls.id),
            })),
          );
          setDivisionOptions(
            classes.flatMap((cls) =>
              (cls.divisions || []).map((division) => ({
                id: String(division.id),
                label: `${cls.name} - ${division.division_name}`,
                value: String(division.id),
                classId: cls.id,
              })),
            ),
          );
        });
      })
      .catch(() => setError("Unable to load classes"));
  }, [isEditMode, setFormData]);

  const classDivisionMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string; divisions: { id: number; name: string }[] }>();
    classOptions.forEach((cls) => {
      map.set(Number(cls.id), { id: Number(cls.id), name: cls.label, divisions: [] });
    });
    divisionOptions.forEach((div) => {
      const classId = Number(div.classId);
      if (!map.has(classId)) return;
      map.get(classId)?.divisions.push({
        id: Number(div.id),
        name: div.label.split(" - ")[1] || div.label,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [classOptions, divisionOptions]);

  const applicableTo = useMemo(
    () => ({ student: true, teacher: false, admin: false }),
    [],
  );

  const isClassSelectAll = useMemo(
    () =>
      classDivisionMap.length > 0 &&
      classDivisionMap.every(
        (cls) =>
          formData.class_ids.includes(cls.id) &&
          cls.divisions.every((d) => formData.division_ids.includes(d.id)),
      ),
    [classDivisionMap, formData.class_ids, formData.division_ids],
  );

  const buildTargets = useCallback((): ActivityGalleryClassTarget[] => {
    if (formData.division_ids.length === 0) return [];
    const divisionMap = new Map(divisionOptions.map((d) => [Number(d.id), d.classId]));
    return formData.division_ids.flatMap((divisionId) => {
      const classId = divisionMap.get(divisionId);
      if (!classId) return [];
      return [{ division_id: divisionId, class_id: classId }];
    });
  }, [divisionOptions, formData.division_ids]);

  const validateAssociatedClasses = useCallback((): string => {
    if (formData.class_ids.length === 0 && formData.division_ids.length === 0) {
      return "Please select class and division";
    }
    return "";
  }, [formData.class_ids.length, formData.division_ids.length]);

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
    [classDivisionMap, setFormData],
  );

  const handleClassToggle = useCallback(
    (classId: number, checked: boolean) => {
      setFormData((prev) => {
        const classDivisionIds =
          classDivisionMap.find((cls) => cls.id === classId)?.divisions.map((d) => d.id) ?? [];
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
      setAssociatedClassesError(null);
    },
    [classDivisionMap, setFormData],
  );

  const handleDivisionToggle = useCallback(
    (classId: number, divisionId: number, checked: boolean) => {
      setFormData((prev) => {
        const classDivisionIds =
          classDivisionMap.find((cls) => cls.id === classId)?.divisions.map((d) => d.id) ?? [];
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
      setAssociatedClassesError(null);
    },
    [classDivisionMap, setFormData],
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
      setAssociatedClassesError(null);
    },
    [classDivisionMap, setFormData],
  );

  useEffect(() => {
    if (!isEditMode || !Number.isFinite(galleryId)) return;
    setFetchLoading(true);
    activityGalleryService
      .getById(galleryId)
      .then((data) => {
        setGalleryRecord(data);
        setGalleryType(data.gallery_type);
        setFormData(galleryToForm(data));
        setSavedMedia(data.media_items ?? []);
      })
      .catch(() => setError("Unable to load gallery details"))
      .finally(() => setFetchLoading(false));
  }, [galleryId, isEditMode, setFormData]);

  const buildPayload = useCallback(
    () => ({
      gallery_name: formData.gallery_name.trim(),
      gallery_type: galleryType,
      activity_date: formData.activity_date,
      description: formData.description.trim() || null,
      targets: buildTargets(),
    }),
    [buildTargets, formData, galleryType],
  );

  const buildUpdatePayload = useCallback(
    () => ({
      gallery_name: formData.gallery_name.trim(),
      activity_date: formData.activity_date,
      description: formData.description.trim() || null,
      targets: buildTargets(),
    }),
    [buildTargets, formData],
  );

  const ensureFormValid = useCallback((): boolean => {
    const normalized: CreateActivityGalleryFormData = {
      ...formData,
      gallery_name: formData.gallery_name.trim(),
    };
    const errors = validateForm(validationConfig, normalized);
    const classSelectionError = validateAssociatedClasses();
    if (classSelectionError) {
      setAssociatedClassesError(classSelectionError);
    } else {
      setAssociatedClassesError(null);
    }
    if (!errors.gallery_name && !normalized.gallery_name) {
      errors.gallery_name = "Please enter gallery name";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted errors.");
    } else {
      setError(null);
    }
    return Object.keys(errors).length === 0 && !classSelectionError;
  }, [formData, setFieldErrors, validateAssociatedClasses, validationConfig]);

  const persistGallery = useCallback(async (): Promise<number> => {
    if (!ensureFormValid()) {
      throw new Error(PERSIST_VALIDATION_MESSAGE);
    }
    if (effectiveGalleryId) {
      const updated = await activityGalleryService.update(
        effectiveGalleryId,
        buildUpdatePayload(),
      );
      setGalleryRecord(updated);
      return updated.id;
    }
    const created = await activityGalleryService.create(buildPayload());
    setGalleryRecord(created);
    return created.id;
  }, [
    buildPayload,
    buildUpdatePayload,
    effectiveGalleryId,
    ensureFormValid,
  ]);

  const handleConfirmSave = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await persistGallery();
      enqueueSnackbar("Gallery saved successfully.", { variant: "success" });
      navigate(GALLERY_PATH);
    } catch (err: unknown) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      enqueueSnackbar(message || "Save failed", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, navigate, persistGallery, setFieldErrors]);

  const handlePublish = useCallback(async () => {
    try {
      setPublishLoading(true);
      setError(null);
      setFileError(null);
      const targetId = await persistGallery();
      if (savedMedia.length < 1) {
        setFileError(
          galleryType === "Photo"
            ? "Please upload at least one photo"
            : "Please add at least one YouTube video",
        );
        return;
      }
      await activityGalleryService.publish(targetId);
      enqueueSnackbar("Gallery published successfully.", { variant: "success" });
      navigate(GALLERY_PATH);
    } catch (err: unknown) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      enqueueSnackbar(message || "Unable to publish gallery.", { variant: "error" });
    } finally {
      setPublishLoading(false);
    }
  }, [enqueueSnackbar, galleryType, navigate, persistGallery, savedMedia.length]);

  const validateFiles = useCallback(
    (files: File[]): string | null => {
      if (mediaCount + files.length > MAX_MEDIA) {
        return "Maximum 20 photos allowed per activity";
      }
      const incomingBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (uploadedPhotoBytes + incomingBytes > MAX_PHOTO_TOTAL_BYTES) {
        return `Total photo size cannot exceed ${MAX_PHOTO_TOTAL_MB} MB for all images`;
      }
      for (const file of files) {
        if (!isAllowedPhoto(file)) {
          return `Invalid photo format. Allowed: ${PHOTO_FORMATS_LABEL}`;
        }
      }
      return null;
    },
    [mediaCount, uploadedPhotoBytes],
  );

  const onAddYoutubeVideo = useCallback(async () => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setFileError("Please enter a YouTube video URL");
      return;
    }
    if (!extractYoutubeVideoId(trimmed)) {
      setFileError("Please enter a valid YouTube video URL");
      return;
    }
    if (mediaCount >= MAX_MEDIA) {
      setFileError("Maximum 20 videos allowed per activity");
      return;
    }

    try {
      setUploadLoading(true);
      setFileError(null);
      const targetId = effectiveGalleryId ?? (await persistGallery());
      const added = await activityGalleryService.addYoutubeVideo(targetId, trimmed);
      setSavedMedia((prev) => [...prev, added]);
      setYoutubeUrl("");
      enqueueSnackbar("YouTube video added successfully.", { variant: "success" });
    } catch (err: unknown) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      const uploadError = message || "Unable to add YouTube video. Please try again.";
      if (uploadError === PERSIST_VALIDATION_MESSAGE) return;
      setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
      enqueueSnackbar(uploadError, { variant: "error" });
    } finally {
      setUploadLoading(false);
    }
  }, [
    effectiveGalleryId,
    enqueueSnackbar,
    mediaCount,
    persistGallery,
    setFieldErrors,
    youtubeUrl,
  ]);

  const onFileSelect = useCallback(
    async (files: FileList | null) => {
      if (galleryType !== "Photo" || !files?.length) return;
      const selected = Array.from(files);
      const validationMessage = validateFiles(selected);
      if (validationMessage) {
        setFileError(validationMessage);
        return;
      }

      try {
        setUploadLoading(true);
        setFileError(null);
        const targetId = effectiveGalleryId ?? (await persistGallery());
        const uploaded =
          selected.length > 1
            ? await activityGalleryService.uploadMediaBulk(targetId, selected)
            : [await activityGalleryService.uploadMedia(targetId, selected[0])];
        setSavedMedia((prev) => [...prev, ...uploaded]);
        enqueueSnackbar("Media uploaded successfully.", { variant: "success" });
      } catch (err: unknown) {
        const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
        const uploadError = message || "Unable to upload file. Please try again.";
        if (uploadError === PERSIST_VALIDATION_MESSAGE) return;
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
        enqueueSnackbar(uploadError, { variant: "error" });
      } finally {
        setUploadLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [effectiveGalleryId, enqueueSnackbar, persistGallery, setFieldErrors, validateFiles],
  );

  const onDeleteMedia = useCallback(
    async (mediaId: number) => {
      if (!effectiveGalleryId) return;
      try {
        setDeletingMediaId(mediaId);
        await activityGalleryService.deleteMedia(effectiveGalleryId, mediaId);
        setSavedMedia((prev) => prev.filter((m) => m.id !== mediaId));
      } catch (err: unknown) {
        const apiErr = err as { message?: string };
        enqueueSnackbar(apiErr.message ?? "Failed to delete media", { variant: "error" });
      } finally {
        setDeletingMediaId(null);
      }
    },
    [effectiveGalleryId, enqueueSnackbar],
  );

  const renderUploadedMediaRow = useCallback(
    (item: ActivityGalleryMedia, label: string) => (
      <Box
        key={item.id}
        sx={{ display: "flex", alignItems: "center", mt: 0.5, minHeight: 24, gap: 0.25 }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {label}
        </Typography>
        <IconButton
          size="small"
          color="primary"
          aria-label="View media"
          onClick={() => setPreviewMedia(item)}
          sx={{ p: 0.5 }}
        >
          <VisibilityIcon sx={{ fontSize: 18 }} />
        </IconButton>
        {perms.canEdit ? (
          <IconButton
            size="small"
            color="error"
            aria-label="Delete media"
            onClick={() => void onDeleteMedia(item.id)}
            disabled={deletingMediaId === item.id}
            sx={{ p: 0.5 }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        ) : null}
      </Box>
    ),
    [deletingMediaId, onDeleteMedia, perms.canEdit],
  );

  const photoUploadSlot = (
    <Box sx={{ mt: 2 }}>
      <FormSectionLabel title="Upload Photos" icon={<UploadFileIcon fontSize="small" />} />
      <Box
        sx={{
          border: `2px dashed ${alpha(colorTokens.primary.main, 0.3)}`,
          borderRadius: 2,
          p: 3,
          textAlign: "center",
          bgcolor: alpha(colorTokens.primary.main, 0.02),
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept="image/jpeg,image/jpg,image/png,image/jfif,.jpg,.jpeg,.png,.jfif"
          onChange={(e) => void onFileSelect(e.target.files)}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {`Single or bulk upload supported (max ${MAX_MEDIA} photos, ${MAX_PHOTO_TOTAL_MB} MB total)`}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Allowed formats: {PHOTO_FORMATS_LABEL}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadLoading}
        >
          {uploadLoading ? "Uploading…" : "Select Photos"}
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          {mediaCount}/{MAX_MEDIA} uploaded · {formatBytes(uploadedPhotoBytes)} / {MAX_PHOTO_TOTAL_MB} MB
        </Typography>
      </Box>
      {fileError ? (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {fileError}
        </Typography>
      ) : null}
      {savedMedia.length > 0 ? (
        <Box sx={{ mt: 1 }}>
          {savedMedia.map((item) =>
            renderUploadedMediaRow(
              item,
              item.file_size
                ? `${item.original_file_name || item.file_name} (${formatBytes(item.file_size)})`
                : item.original_file_name || item.file_name,
            ),
          )}
        </Box>
      ) : null}
    </Box>
  );

  const videoUploadSlot = (
    <Box sx={{ mt: 2 }}>
      <FormSectionLabel title="YouTube Videos" icon={<UploadFileIcon fontSize="small" />} />
      <Box
        sx={{
          border: `1px solid ${alpha(colorTokens.primary.main, 0.2)}`,
          borderRadius: 2,
          p: 3,
          bgcolor: alpha(colorTokens.primary.main, 0.02),
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Add YouTube video links only (max {MAX_MEDIA} videos)
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Example: https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }}>
          <TextFieldInput
            label="YouTube Video URL"
            placeholder="Paste YouTube video link"
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              if (fileError) setFileError(null);
            }}
            fullWidth
            disabled={uploadLoading}
          />
          <Box sx={{ mt: { xs: 0, sm: 1 }, flexShrink: 0 }}>
            <PrimaryActionButton
              onClick={() => void onAddYoutubeVideo()}
              icon={
                uploadLoading ? (
                  <CircularProgress size={22} sx={{ color: colorTokens.primary.contrast }} />
                ) : (
                  <AddIcon sx={{ fontSize: 24 }} />
                )
              }
              label="Add Video"
              disabled={uploadLoading || mediaCount >= MAX_MEDIA}
            />
          </Box>
        </Stack>
        <Typography variant="caption" display="block" sx={{ mt: 1.5 }}>
          {mediaCount}/{MAX_MEDIA} videos added
        </Typography>
      </Box>
      {fileError ? (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {fileError}
        </Typography>
      ) : null}
      {savedMedia.length > 0 ? (
        <Box sx={{ mt: 1 }}>
          {savedMedia.map((item, index) =>
            renderUploadedMediaRow(
              item,
              `Video ${index + 1}: ${item.original_file_name || item.file_path}`,
            ),
          )}
        </Box>
      ) : null}
    </Box>
  );

  const uploadSlot = galleryType === "Photo" ? photoUploadSlot : videoUploadSlot;

  const associatedClassesSlot = useMemo(
    () => (
      <ApplicableToClassSelector
        applicableTo={applicableTo}
        isApplicableSelectAll={isClassSelectAll}
        isClassSelectAll={isClassSelectAll}
        classDivisionMap={classDivisionMap}
        selectedClassIds={formData.class_ids}
        selectedDivisionIds={formData.division_ids}
        error={associatedClassesError}
        onApplicableSelectAll={handleApplicableSelectAll}
        onApplicableRoleToggle={handleApplicableRoleToggle}
        onClassSelectAll={handleClassSelectAll}
        onClassToggle={handleClassToggle}
        onDivisionToggle={handleDivisionToggle}
        hideApplicableRoleControls
      />
    ),
    [
      applicableTo,
      associatedClassesError,
      classDivisionMap,
      formData.class_ids,
      formData.division_ids,
      handleApplicableRoleToggle,
      handleApplicableSelectAll,
      handleClassSelectAll,
      handleClassToggle,
      handleDivisionToggle,
      isClassSelectAll,
    ],
  );

  const effectiveGalleryType = galleryRecord?.gallery_type ?? galleryType;
  const pageBreadcrumbTitle = useMemo(() => {
    const kind = effectiveGalleryType === "Photo" ? "Photo" : "Video";
    return isEditMode ? `Edit ${kind} Gallery` : `Add ${kind} Gallery`;
  }, [effectiveGalleryType, isEditMode]);

  const formConfig = useMemo(
    () =>
      createActivityGalleryFormConfig({
        associatedClassesSlot,
        uploadSlot,
      }),
    [associatedClassesSlot, uploadSlot],
  );

  if (perms.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthorized) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          You are not authorized for this activity
        </Typography>
        <Button variant="contained" onClick={() => navigate(GALLERY_PATH)}>
          Back to Gallery
        </Button>
      </Box>
    );
  }

  return (
    <>
      <GalleryMediaPreviewDialog
        media={previewMedia}
        galleryType={effectiveGalleryType}
        open={previewMedia !== null}
        onClose={() => setPreviewMedia(null)}
      />
      <BaseForm
        formConfig={formConfig}
        formData={formData}
        setFormData={setFormData}
        fieldErrors={fieldErrors}
        handleChange={handleChange}
        handleFieldValueChange={handleFieldValueChange}
        handleSubmit={baseHandleSubmit}
        setFormError={setError}
        onConfirmSubmit={handleConfirmSave}
        isEditMode={isEditMode}
        loading={loading}
        fetchLoading={fetchLoading}
        error={error}
        onErrorDismiss={() => setError(null)}
        snackbar={snackbar}
        onSnackbarClose={() => setSnackbar(null)}
        hideFooterActions
        headerConfig={{
          links: [
            { title: "Photo / Video Gallery", path: GALLERY_PATH },
            { title: pageBreadcrumbTitle, path: "#" },
          ],
          homePath: "/",
          cancelTooltip: "Cancel",
          saveTooltipCreate: "Save",
          saveTooltipEdit: "Save",
        }}
        onCancelNavigate={() => navigate(GALLERY_PATH)}
        confirmMessage={(ctx) =>
          ctx.isEditMode
            ? "Are you sure you want to update this gallery?"
            : "Are you sure you want to save this gallery?"
        }
        submitLabelCreate="Save"
        submitLabelEdit="Save"
        extraHeaderActions={
          perms.canEdit ? (
            <FormHeaderIconAction
              variant="publish"
              tooltipTitle="Publish Gallery"
              onClick={() => void handlePublish()}
              disabled={loading || fetchLoading}
              loading={publishLoading}
            />
          ) : undefined
        }
      />
    </>
  );
}
