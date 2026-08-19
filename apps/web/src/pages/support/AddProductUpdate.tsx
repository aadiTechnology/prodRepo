import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { PageHeader } from "../../components/layout";
import { FormHeaderIconAction } from "../../components/primitives";
import { ListPageLayout } from "../../components/reusable";
import { CancelButton, SaveButton } from "../../components/semantic";
import { colorTokens } from "../../tokens/colors";
import { useSupportPermissions } from "../../hooks/useSupportPermissions";
import {
  downloadReleaseAttachment,
  useProductUpdates,
} from "./context/ProductUpdateContext";
import type {
  ProductUpdateFormData,
  ReleaseNoteFileType,
  ReleaseNoteShowTo,
} from "./support.types";
import {
  EMPTY_RELEASE_NOTE_SHOW_TO,
  SUPPORT_SUCCESS_SNACKBAR_OPTIONS,
  getSupportApiErrorMessage,
  isSupportNotFoundError,
} from "./support.types";

const EMPTY_FORM: ProductUpdateFormData = {
  version: "",
  releaseDate: "",
  description: "",
  attachmentName: "",
  showTo: { ...EMPTY_RELEASE_NOTE_SHOW_TO },
};

const SHOW_TO_OPTIONS: { key: keyof ReleaseNoteShowTo; label: string; testId: string }[] = [
  { key: "admin", label: "Admin", testId: "checkbox-show-to-admin" },
  { key: "teacher", label: "Teacher", testId: "checkbox-show-to-teacher" },
  { key: "student", label: "Student", testId: "checkbox-show-to-student" },
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const REQUIRED_ASTERISK_SX = {
  "& .MuiFormLabel-asterisk": { color: "error.main" },
  "& .MuiInputLabel-asterisk": { color: "error.main" },
} as const;

type PendingAttachment = {
  fileName: string;
  fileType: ReleaseNoteFileType;
  url: string;
  sizeBytes: number;
  file?: File;
};

function resolveAttachmentType(fileName: string): ReleaseNoteFileType | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".doc")) return "doc";
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddProductUpdate() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const perms = useSupportPermissions();
  const {
    createReleaseNote,
    updateReleaseNote,
    getProductUpdateById,
    fetchReleaseNoteById,
    uploadReleaseNoteAttachment,
    releaseNotesLoading,
  } = useProductUpdates();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const requestedIdRef = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState<"loading" | "ready" | "error" | "missing">(
    isEditMode ? "loading" : "ready"
  );
  const [editError, setEditError] = useState<string | null>(null);
  const existing = useMemo(
    () => (id ? getProductUpdateById(id) : undefined),
    [getProductUpdateById, id]
  );

  useEffect(() => {
    requestedIdRef.current = null;
  }, [id]);

  useEffect(() => {
    if (!isEditMode || !id) {
      setEditStatus("ready");
      return;
    }
    if (existing) {
      setEditStatus("ready");
      setEditError(null);
      return;
    }
    if (releaseNotesLoading) {
      setEditStatus("loading");
      return;
    }
    if (requestedIdRef.current === id) return;
    requestedIdRef.current = id;
    let cancelled = false;
    setEditStatus("loading");
    setEditError(null);
    void fetchReleaseNoteById(id)
      .then(() => {
        if (!cancelled) setEditStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isSupportNotFoundError(error)) {
          setEditStatus("missing");
          setEditError(null);
          return;
        }
        setEditStatus("error");
        setEditError(getSupportApiErrorMessage(error, "Failed to load release note."));
      });
    return () => {
      cancelled = true;
    };
  }, [existing, fetchReleaseNoteById, id, isEditMode, releaseNotesLoading]);

  const [values, setValues] = useState<ProductUpdateFormData>(EMPTY_FORM);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [showToError, setShowToError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode || !existing || hydratedId === existing.id) return;
    setValues({
      version: existing.version,
      releaseDate: existing.releaseDate,
      description: existing.description,
      attachmentName: existing.attachmentName,
      showTo: { ...existing.showTo },
    });
    if (existing.attachmentName) {
      setAttachment({
        fileName: existing.attachmentName,
        fileType: existing.attachmentType,
        url: existing.attachmentUrl,
        sizeBytes: 0,
      });
    } else {
      setAttachment(null);
    }
    setHydratedId(existing.id);
  }, [existing, hydratedId, isEditMode]);

  const errors = useMemo(() => {
    const next: Partial<Record<keyof ProductUpdateFormData, string>> = {};
    if (!values.version.trim()) next.version = "Required.";
    if (!values.releaseDate.trim()) next.releaseDate = "Required.";
    if (!values.description.trim()) next.description = "Required.";
    return next;
  }, [values]);

  const goBack = () => navigate("/support/updates");

  const saveReleaseNote = async () => {
    setAttempted(true);
    const hasShowTo =
      values.showTo.admin || values.showTo.teacher || values.showTo.student;
    if (!hasShowTo) {
      setShowToError("Please select at least one user role.");
    } else {
      setShowToError(null);
    }
    if (Object.keys(errors).length > 0 || !hasShowTo || saving || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    try {
      const version = values.version.trim();
      const attachmentFile = attachment?.file;

      if (isEditMode && existing) {
        await updateReleaseNote(existing.id, {
          version,
          releaseDate: values.releaseDate,
          description: values.description.trim(),
          showTo: { ...values.showTo },
        });
        if (attachmentFile) {
          await uploadReleaseNoteAttachment(existing.id, attachmentFile);
        }
        enqueueSnackbar(`Release note ${version} updated.`, SUPPORT_SUCCESS_SNACKBAR_OPTIONS);
      } else {
        const created = await createReleaseNote({
          version,
          releaseDate: values.releaseDate,
          description: values.description.trim(),
          showTo: { ...values.showTo },
        });
        if (attachmentFile) {
          await uploadReleaseNoteAttachment(created.id, attachmentFile);
        }
        enqueueSnackbar(`Release note ${version} created.`, SUPPORT_SUCCESS_SNACKBAR_OPTIONS);
      }
      goBack();
    } catch {
      enqueueSnackbar("Failed to save release note.", { variant: "error" });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void saveReleaseNote();
  };

  if (!perms.canManageProductUpdates) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-add-release-note-denied">
        <Alert severity="warning">Access Denied</Alert>
      </Box>
    );
  }

  if (isEditMode && (editStatus === "loading" || (!existing && editStatus !== "error" && editStatus !== "missing"))) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }} data-testid="loading-edit-release-note">
        <CircularProgress sx={(t) => ({ color: t.palette.primary.main })} />
      </Box>
    );
  }

  if (isEditMode && editStatus === "error" && !existing) {
    return (
      <Box sx={{ p: 3 }} data-testid="error-edit-release-note">
        <Alert severity="error" sx={{ mb: 2 }}>
          {editError ?? "Failed to load release note."}
        </Alert>
        <Button variant="outlined" onClick={goBack}>
          Back to Release Notes
        </Button>
      </Box>
    );
  }

  if (isEditMode && !existing) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-edit-release-note-missing">
        <Alert severity="info" sx={{ mb: 2 }}>
          Release note not found.
        </Alert>
        <Button variant="outlined" onClick={goBack}>
          Back to Release Notes
        </Button>
      </Box>
    );
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    const type = resolveAttachmentType(file.name);
    if (!type || !ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setAttachmentError("Allowed file types: PDF, DOC, DOCX.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setAttachmentError("File size must be 10 MB or less.");
      return;
    }
    setAttachmentError(null);
    if (attachment?.url && attachment.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachment.url);
    }
    const url = URL.createObjectURL(file);
    setAttachment({
      fileName: file.name,
      fileType: type,
      url,
      sizeBytes: file.size,
      file,
    });
    setValues((prev) => ({ ...prev, attachmentName: file.name }));
  };

  const clearAttachment = () => {
    if (attachment?.url && attachment.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachment(null);
    setAttachmentError(null);
    setValues((prev) => ({ ...prev, attachmentName: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      scrollableFormContent
      data-testid={isEditMode ? "page-edit-release-note" : "page-add-release-note"}
      header={
        <PageHeader
          links={[
            { title: "Release Notes", path: "/support/updates" },
            {
              title: isEditMode ? "Edit Release Note" : "Add Release Note",
              path: isEditMode
                ? `/support/updates/${id}/edit`
                : "/support/updates/add",
            },
          ]}
          homePath="/"
          actions={
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <FormHeaderIconAction
                variant="cancel"
                tooltipTitle="Cancel"
                onClick={goBack}
                data-testid="btn-header-cancel-release-note"
              />
              <FormHeaderIconAction
                variant="save"
                tooltipTitle="Save"
                onClick={saveReleaseNote}
                loading={saving}
                data-testid="btn-header-save-release-note"
              />
            </Box>
          }
        />
      }
    >
      <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              required
              fullWidth
              label="Version"
              value={values.version}
              onChange={(e) => setValues((prev) => ({ ...prev, version: e.target.value }))}
              error={attempted && Boolean(errors.version)}
              helperText={attempted ? errors.version : undefined}
              inputProps={{ "data-testid": "input-release-version" }}
              sx={REQUIRED_ASTERISK_SX}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              required
              fullWidth
              type="date"
              label="Release Date"
              value={values.releaseDate}
              onChange={(e) => setValues((prev) => ({ ...prev, releaseDate: e.target.value }))}
              error={attempted && Boolean(errors.releaseDate)}
              helperText={attempted ? errors.releaseDate : undefined}
              InputLabelProps={{ shrink: true }}
              inputProps={{ "data-testid": "input-release-date" }}
              sx={REQUIRED_ASTERISK_SX}
            />
          </Grid>

          <Grid size={12}>
            <TextField
              required
              fullWidth
              multiline
              minRows={4}
              label="Description"
              value={values.description}
              onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
              error={attempted && Boolean(errors.description)}
              helperText={attempted ? errors.description : undefined}
              inputProps={{ "data-testid": "input-release-description" }}
              sx={REQUIRED_ASTERISK_SX}
            />
          </Grid>

          <Grid size={12}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              flexWrap="wrap"
              data-testid="section-show-to"
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Show To:
              </Typography>
              {SHOW_TO_OPTIONS.map(({ key, label, testId }) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      size="small"
                      checked={values.showTo[key]}
                      onChange={(e) => {
                        setValues((prev) => ({
                          ...prev,
                          showTo: { ...prev.showTo, [key]: e.target.checked },
                        }));
                        if (showToError) setShowToError(null);
                      }}
                      inputProps={{ "data-testid": testId } as object}
                    />
                  }
                  label={label}
                  sx={{ mr: 0.5 }}
                />
              ))}
            </Stack>
            {attempted && showToError ? (
              <Typography
                variant="caption"
                color="error.main"
                sx={{ mt: 0.5, display: "block" }}
                data-testid="error-release-show-to"
              >
                {showToError}
              </Typography>
            ) : null}
          </Grid>

          <Grid size={12}>
            <Box data-testid="section-release-attachment">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Attachment (optional). Allowed: PDF, DOC, DOCX. Max 10 MB.
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: "none" }}
                  data-testid="input-release-attachment"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="btn-release-upload"
                  sx={{ textTransform: "none" }}
                >
                  Upload Attachment
                </Button>
              </Stack>

              {attachmentError ? (
                <Alert severity="error" sx={{ mb: 1.5 }} data-testid="alert-release-attachment-error">
                  {attachmentError}
                </Alert>
              ) : null}

              {attachment ? (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                  data-testid="card-release-attachment"
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {attachment.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {attachment.sizeBytes > 0
                          ? formatFileSize(attachment.sizeBytes)
                          : "Saved attachment"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          aria-label="Download attachment"
                          onClick={() =>
                            downloadReleaseAttachment(attachment.fileName, attachment.url)
                          }
                          sx={{
                            color: colorTokens.primary.main,
                            "&:hover": {
                              bgcolor: alpha(colorTokens.primary.main, 0.1),
                              transform: "scale(1.15) rotate(5deg)",
                            },
                            transition: "all 0.2s",
                          }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label="Delete attachment"
                          onClick={clearAttachment}
                          data-testid="btn-remove-release-attachment"
                          sx={{
                            color: colorTokens.preschool.coral.main,
                            "&:hover": {
                              bgcolor: alpha(colorTokens.preschool.coral.main, 0.1),
                              transform: "scale(1.15) rotate(5deg)",
                            },
                            transition: "all 0.2s",
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              ) : null}
            </Box>
          </Grid>
        </Grid>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            justifyContent: "center",
            mt: 4,
          }}
        >
          <CancelButton
            type="button"
            onClick={goBack}
            data-testid="btn-cancel-add-release-note"
          >
            Cancel
          </CancelButton>
          <SaveButton type="submit" loading={saving} data-testid="btn-submit-add-release-note">
            Save
          </SaveButton>
        </Box>
      </Box>
    </ListPageLayout>
  );
}
