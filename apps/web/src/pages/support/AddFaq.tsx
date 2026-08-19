import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
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
import { useFaqData } from "./context/FaqDataContext";
import {
  SUPPORT_QUERY_INVALID_FILE_MESSAGE,
  SUPPORT_SUCCESS_SNACKBAR_OPTIONS,
  getSupportApiErrorMessage,
  getSupportQueryAttachmentKind,
  isSupportNotFoundError,
  isSupportQueryAttachmentAllowed,
  isSupportQueryOwner,
  openSupportQueryAttachment,
  type SupportQueryFormData,
} from "./support.types";

const EMPTY_FORM: SupportQueryFormData = {
  category: "",
  subject: "",
  description: "",
  attachmentName: "",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const REQUIRED_ASTERISK_SX = {
  "& .MuiFormLabel-asterisk": { color: "error.main" },
  "& .MuiInputLabel-asterisk": { color: "error.main" },
} as const;

type PendingAttachment = {
  fileName: string;
  url: string;
  sizeBytes: number;
  file?: File;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddFaq() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const perms = useSupportPermissions();
  const {
    createQuery,
    updateQuery,
    getQueryById,
    fetchQueryById,
    uploadQueryAttachment,
    activeCategoryNames,
    queriesLoading,
  } = useFaqData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const requestedIdRef = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState<"loading" | "ready" | "error" | "missing">(
    isEditMode ? "loading" : "ready"
  );
  const [editError, setEditError] = useState<string | null>(null);

  const existing = useMemo(
    () => (id ? getQueryById(id) : undefined),
    [getQueryById, id]
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
    if (queriesLoading) {
      setEditStatus("loading");
      return;
    }
    if (requestedIdRef.current === id) return;
    requestedIdRef.current = id;
    let cancelled = false;
    setEditStatus("loading");
    setEditError(null);
    void fetchQueryById(id)
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
        setEditError(getSupportApiErrorMessage(error, "Failed to load query."));
      });
    return () => {
      cancelled = true;
    };
  }, [existing, fetchQueryById, id, isEditMode, queriesLoading]);

  const [values, setValues] = useState<SupportQueryFormData>(EMPTY_FORM);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ url: string; fileName: string } | null>(
    null
  );
  const [attempted, setAttempted] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode || !existing || hydratedId === existing.id) return;
    setValues({
      category: existing.category,
      subject: existing.subject,
      description: existing.description,
      attachmentName: existing.attachmentName ?? "",
    });
    if (existing.attachmentName) {
      setAttachment({
        fileName: existing.attachmentName,
        url: existing.attachmentUrl ?? "#",
        sizeBytes: 0,
      });
    } else {
      setAttachment(null);
    }
    setHydratedId(existing.id);
  }, [existing, hydratedId, isEditMode]);

  const categoryOptions = useMemo(() => {
    const names = new Set(activeCategoryNames);
    if (values.category.trim()) {
      names.add(values.category.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [activeCategoryNames, values.category]);

  const errors = useMemo(() => {
    const next: Partial<Record<keyof SupportQueryFormData, string>> = {};
    if (!values.category.trim()) next.category = "Required.";
    if (!values.subject.trim()) next.subject = "Required.";
    if (!values.description.trim()) next.description = "Required.";
    return next;
  }, [values]);

  const goBack = () => navigate("/support/contact");

  const saveQuery = async () => {
    setAttempted(true);
    if (Object.keys(errors).length > 0 || !perms.actorRole || saving || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    try {
      const attachmentFile = attachment?.file;

      if (isEditMode && existing) {
        await updateQuery(existing.id, {
          category: values.category.trim(),
          subject: values.subject.trim(),
          description: values.description.trim(),
        });
        if (attachmentFile) {
          await uploadQueryAttachment(existing.id, attachmentFile);
        }
        enqueueSnackbar(`Query ${existing.id} updated successfully.`, SUPPORT_SUCCESS_SNACKBAR_OPTIONS);
        navigate("/support/contact");
        return;
      }

      const created = await createQuery({
        category: values.category.trim(),
        subject: values.subject.trim(),
        description: values.description.trim(),
      });
      if (attachmentFile) {
        await uploadQueryAttachment(created.id, attachmentFile);
      }
      enqueueSnackbar(`Query ${created.id} created successfully.`, SUPPORT_SUCCESS_SNACKBAR_OPTIONS);
      navigate("/support/contact");
    } catch {
      enqueueSnackbar("Failed to save query. Please try again.", { variant: "error" });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void saveQuery();
  };

  if (!perms.canAccessSupport || !perms.canCreateQuery) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-create-query-denied">
        <Alert severity="warning">Access Denied</Alert>
      </Box>
    );
  }

  if (isEditMode && (editStatus === "loading" || (!existing && editStatus !== "error" && editStatus !== "missing"))) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }} data-testid="loading-edit-query">
        <CircularProgress sx={(t) => ({ color: t.palette.primary.main })} />
      </Box>
    );
  }

  if (isEditMode && existing && !isSupportQueryOwner(existing, perms.actorRole)) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-edit-query-forbidden">
        <Alert severity="warning" sx={{ mb: 2 }}>
          Access Denied. You can only edit your own queries.
        </Alert>
        <Button variant="outlined" onClick={goBack}>
          Back to My Queries
        </Button>
      </Box>
    );
  }

  if (isEditMode && editStatus === "error" && !existing) {
    return (
      <Box sx={{ p: 3 }} data-testid="error-edit-query">
        <Alert severity="error" sx={{ mb: 2 }}>
          {editError ?? "Failed to load query."}
        </Alert>
        <Button variant="outlined" onClick={goBack}>
          Back to My Queries
        </Button>
      </Box>
    );
  }

  if (isEditMode && !existing) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-edit-query-missing">
        <Alert severity="info" sx={{ mb: 2 }}>
          Query not found.
        </Alert>
        <Button variant="outlined" onClick={goBack}>
          Back to My Queries
        </Button>
      </Box>
    );
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (!isSupportQueryAttachmentAllowed(file.name)) {
      setAttachmentError(SUPPORT_QUERY_INVALID_FILE_MESSAGE);
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
      data-testid={isEditMode ? "page-edit-query" : "page-create-query"}
      header={
        <PageHeader
          links={[
            { title: "My Queries", path: "/support/contact" },
            {
              title: isEditMode ? "Edit Query" : "Add Query",
              path: isEditMode
                ? `/support/contact/${id}/edit`
                : "/support/contact/add",
            },
          ]}
          homePath="/"
          actions={
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <FormHeaderIconAction
                variant="cancel"
                tooltipTitle="Cancel"
                onClick={goBack}
                data-testid="btn-header-cancel-query"
              />
              <FormHeaderIconAction
                variant="save"
                tooltipTitle="Save"
                onClick={saveQuery}
                loading={saving}
                data-testid="btn-header-save-query"
              />
            </Box>
          }
        />
      }
    >
      <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl
              fullWidth
              required
              error={attempted && Boolean(errors.category)}
              sx={REQUIRED_ASTERISK_SX}
            >
              <InputLabel id="query-category-label">Category</InputLabel>
              <Select
                labelId="query-category-label"
                label="Category"
                value={values.category}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, category: String(e.target.value) }))
                }
                data-testid="support-query-category"
                inputProps={{ "data-testid": "select-query-category" }}
              >
                {categoryOptions.map((category) => (
                  <MenuItem
                    key={category}
                    value={category}
                    data-testid="support-query-category-option"
                  >
                    {category}
                  </MenuItem>
                ))}
              </Select>
              {attempted && errors.category ? (
                <FormHelperText data-testid="error-query-category">{errors.category}</FormHelperText>
              ) : null}
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              required
              fullWidth
              label="Subject"
              value={values.subject}
              onChange={(e) => setValues((prev) => ({ ...prev, subject: e.target.value }))}
              error={attempted && Boolean(errors.subject)}
              helperText={attempted ? errors.subject : undefined}
              inputProps={{ "data-testid": "input-query-subject" }}
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
              onChange={(e) =>
                setValues((prev) => ({ ...prev, description: e.target.value }))
              }
              error={attempted && Boolean(errors.description)}
              helperText={attempted ? errors.description : undefined}
              inputProps={{ "data-testid": "input-query-description" }}
              sx={REQUIRED_ASTERISK_SX}
            />
          </Grid>

          <Grid size={12}>
            <Box data-testid="section-query-attachment">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Attachment (optional). Allowed: PDF, DOC, DOCX, JPG, JPEG, PNG. Max 10 MB.
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  data-testid="input-query-attachment"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="btn-query-upload"
                  sx={{ textTransform: "none" }}
                >
                  Upload Document
                </Button>
              </Stack>

              {attachmentError ? (
                <Alert severity="error" sx={{ mb: 1.5 }} data-testid="alert-query-attachment-error">
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
                  data-testid="card-query-attachment"
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        onClick={() =>
                          openSupportQueryAttachment(
                            attachment.fileName,
                            attachment.url,
                            (url, fileName) => setImagePreview({ url, fileName })
                          )
                        }
                        sx={{
                          cursor: "pointer",
                          color: colorTokens.primary.main,
                          wordBreak: "break-word",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {attachment.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {attachment.sizeBytes > 0
                          ? formatFileSize(attachment.sizeBytes)
                          : "Saved attachment"}
                        {getSupportQueryAttachmentKind(attachment.fileName) === "image"
                          ? " · Click to preview"
                          : " · Click to open"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Open">
                        <IconButton
                          size="small"
                          aria-label="Open attachment"
                          data-testid="btn-open-query-attachment"
                          onClick={() =>
                            openSupportQueryAttachment(
                              attachment.fileName,
                              attachment.url,
                              (url, fileName) => setImagePreview({ url, fileName })
                            )
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
                          data-testid="btn-remove-query-attachment"
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
          <CancelButton type="button" onClick={goBack} data-testid="btn-cancel-create-query">
            Cancel
          </CancelButton>
          <SaveButton type="submit" loading={saving} data-testid="btn-submit-create-query">
            Save
          </SaveButton>
        </Box>
      </Box>

      <Dialog
        open={Boolean(imagePreview)}
        onClose={() => setImagePreview(null)}
        maxWidth="md"
        fullWidth
        data-testid="dialog-query-attachment-preview"
      >
        <DialogTitle sx={{ pr: 6 }}>{imagePreview?.fileName}</DialogTitle>
        <DialogContent>
          {imagePreview ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 280,
              }}
            >
              <Box
                component="img"
                src={imagePreview.url}
                alt={imagePreview.fileName}
                sx={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
              />
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </ListPageLayout>
  );
}
