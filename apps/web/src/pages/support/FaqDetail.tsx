import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Grid from "@mui/material/Grid2";
import {
  AttachFile as AttachFileIcon,
  ChatBubbleOutline as ChatIcon,
  EditNote as EditNoteIcon,
  Send as SendIcon,
  Shortcut as ForwardIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import supportService from "../../api/services/supportService";
import { PageHeader } from "../../components/layout";
import { FormHeaderIconAction } from "../../components/primitives";
import { ListPageLayout } from "../../components/reusable";
import { colorTokens } from "../../tokens/colors";
import { useFaqData } from "./context/FaqDataContext";
import { useSupportPermissions } from "../../hooks/useSupportPermissions";
import {
  SUPPORT_QUERY_STATUSES,
  SUPPORT_SUCCESS_SNACKBAR_OPTIONS,
  canForwardQueryToSuperAdmin,
  canViewSupportQuery,
  getSupportApiErrorMessage,
  getSupportQueryAttachmentKind,
  isSupportNotFoundError,
  notifySupportUnreadChanged,
  openSupportQueryAttachment,
  type SupportQueryStatus,
} from "./support.types";

function statusChipColor(
  status: SupportQueryStatus
): "default" | "success" | "error" | "warning" | "info" {
  switch (status) {
    case "Open":
      return "info";
    case "In Progress":
      return "warning";
    case "Resolved":
      return "success";
    case "Closed":
      return "default";
    default:
      return "default";
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const sectionLabelSx = {
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "text.secondary",
  textTransform: "uppercase",
  mb: 0.75,
} as const;

export default function FaqDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const perms = useSupportPermissions();
  const { getQueryById, fetchQueryById, appendQueryMessage, forwardQueryToSuperAdmin, queriesLoading } =
    useFaqData();
  const [reply, setReply] = useState("");
  const [statusDraft, setStatusDraft] = useState<SupportQueryStatus | "">("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const requestedIdRef = useRef<string | null>(null);
  const [detailStatus, setDetailStatus] = useState<"loading" | "ready" | "error" | "missing">(
    id ? "loading" : "missing"
  );
  const [detailError, setDetailError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ url: string; fileName: string } | null>(
    null
  );

  const query = useMemo(() => (id ? getQueryById(id) : undefined), [getQueryById, id]);

  useEffect(() => {
    requestedIdRef.current = null;
  }, [id]);

  useEffect(() => {
    if (!id) {
      setDetailStatus("missing");
      return;
    }
    if (query) {
      setDetailStatus("ready");
      setDetailError(null);
      return;
    }
    if (queriesLoading) {
      setDetailStatus("loading");
      return;
    }
    if (requestedIdRef.current === id) return;
    requestedIdRef.current = id;
    let cancelled = false;
    setDetailStatus("loading");
    setDetailError(null);
    void fetchQueryById(id)
      .then(() => {
        if (!cancelled) setDetailStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isSupportNotFoundError(error)) {
          setDetailStatus("missing");
          setDetailError(null);
          return;
        }
        setDetailStatus("error");
        setDetailError(getSupportApiErrorMessage(error, "Failed to load query."));
      });
    return () => {
      cancelled = true;
    };
  }, [fetchQueryById, id, query, queriesLoading]);

  useEffect(() => {
    if (!id || !query || !canViewSupportQuery(query, perms.actorRole)) return;
    void supportService
      .markQueryViewed(id)
      .then(() => {
        notifySupportUnreadChanged();
        return fetchQueryById(id);
      })
      .catch(() => undefined);
  }, [fetchQueryById, id, query, perms.actorRole]);

  if (!perms.canAccessSupport) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-query-detail-denied">
        <Alert severity="warning">Access Denied</Alert>
      </Box>
    );
  }

  if (detailStatus === "loading" || (id && !query && detailStatus !== "error" && detailStatus !== "missing")) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }} data-testid="loading-query-detail">
        <CircularProgress sx={(t) => ({ color: t.palette.primary.main })} />
      </Box>
    );
  }

  if (detailStatus === "error" && !query) {
    return (
      <Box sx={{ p: 3 }} data-testid="error-query-detail">
        <Alert severity="error" sx={{ mb: 2 }}>
          {detailError ?? "Failed to load query."}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/support/contact")}>
          Back to My Queries
        </Button>
      </Box>
    );
  }

  if (!query) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-query-detail-missing">
        <Alert severity="info" sx={{ mb: 2 }}>
          Query not found.
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/support/contact")}>
          Back to My Queries
        </Button>
      </Box>
    );
  }

  if (!canViewSupportQuery(query, perms.actorRole)) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-query-detail-forbidden">
        <Alert severity="warning" sx={{ mb: 2 }}>
          Access Denied. You do not have permission to view this query.
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/support/contact")}>
          Back to My Queries
        </Button>
      </Box>
    );
  }

  const canForward = canForwardQueryToSuperAdmin(query, perms.actorRole);
  const activeStatus = statusDraft || query.status;

  const handleForward = async () => {
    if (submittingRef.current || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await forwardQueryToSuperAdmin(query.id);
      enqueueSnackbar("Query forwarded to Super Admin.", SUPPORT_SUCCESS_SNACKBAR_OPTIONS);
    } catch {
      enqueueSnackbar("Failed to forward query.", { variant: "error" });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRespond = async (event: FormEvent) => {
    event.preventDefault();
    const body = reply.trim();
    if (!body) {
      enqueueSnackbar("Enter a response before submitting.", { variant: "warning" });
      return;
    }
    if (submittingRef.current || submitting) return;

    const nextStatus =
      statusDraft && statusDraft !== query.status ? statusDraft : undefined;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await appendQueryMessage(query.id, body, nextStatus);
      setReply("");
      setStatusDraft("");
      enqueueSnackbar("Response added.", SUPPORT_SUCCESS_SNACKBAR_OPTIONS);
    } catch {
      enqueueSnackbar("Failed to add response.", { variant: "error" });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <ListPageLayout
      pageBackground
      contentPaddingSize="none"
      scrollableFormContent
      data-testid="page-query-detail"
      header={
        <PageHeader
          links={[
            { title: "Support", path: "/support/contact" },
            { title: "My Queries", path: "/support/contact" },
            { title: query.id, path: `/support/contact/${query.id}` },
          ]}
          homePath="/"
          actions={
            canForward ? (
              <Button
                variant="contained"
                color="warning"
                startIcon={<ForwardIcon />}
                onClick={handleForward}
                disabled={submitting}
                data-testid="btn-forward-query-super-admin"
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Forward to Super Admin
              </Button>
            ) : undefined
          }
        />
      }
    >
      <Grid container spacing={2.5}>
        {/* Left — query summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: "#F3F4F6",
              height: "100%",
            }}
            data-testid="section-query-summary"
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
              mb={1.5}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  label={query.status}
                  color={statusChipColor(query.status)}
                  data-testid="chip-query-detail-status"
                  sx={{ fontWeight: 700 }}
                />
                {query.forwardedToSuperAdmin ? (
                  <Chip
                    size="small"
                    label="Forwarded to Super Admin"
                    color="warning"
                    variant="outlined"
                    data-testid="chip-query-forwarded"
                  />
                ) : null}
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                data-testid="query-detail-created-at"
                data-datetime={query.createdAt}
              >
                {formatDateTime(query.createdAt)}
              </Typography>
            </Stack>

            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {query.id}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, mb: 2 }}>
              {query.subject}
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Typography sx={sectionLabelSx}>Description</Typography>
            <Typography variant="body2" sx={{ mb: 2.5, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {query.description}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid size={6}>
                <Typography sx={sectionLabelSx}>Category</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {query.category}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography sx={sectionLabelSx}>Created By</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      bgcolor: colorTokens.primary.main,
                    }}
                  >
                    {initials(query.createdBy)}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600}>
                    {query.createdBy}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>

            <Typography sx={sectionLabelSx}>Attachments</Typography>
            {query.attachmentName ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: "#fff",
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                  "&:hover": { bgcolor: alpha(colorTokens.primary.main, 0.04) },
                }}
                data-testid="query-detail-attachment"
                onClick={() =>
                  openSupportQueryAttachment(
                    query.attachmentName!,
                    query.attachmentUrl,
                    (url, fileName) => setImagePreview({ url, fileName })
                  )
                }
              >
                <AttachFileIcon sx={{ color: colorTokens.primary.main, fontSize: 20 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Link
                    component="span"
                    underline="hover"
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: colorTokens.primary.main,
                      wordBreak: "break-word",
                    }}
                  >
                    {query.attachmentName}
                  </Link>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {getSupportQueryAttachmentKind(query.attachmentName) === "image"
                      ? "Click to preview image"
                      : getSupportQueryAttachmentKind(query.attachmentName) === "pdf"
                        ? "Click to open PDF"
                        : "Click to download"}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No attachments
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Right — conversation + respond */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 3,
              bgcolor: "#fff",
              border: "1px solid",
              borderColor: "divider",
              minHeight: "100%",
            }}
            data-testid="section-query-conversation"
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <ChatIcon sx={{ color: colorTokens.primary.main }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, color: colorTokens.primary.main }}
              >
                Conversation
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2.5} mb={3.5}>
              {query.messages.map((message) => (
                <Box key={message.id} data-testid={`query-message-${message.id}`}>
                  <Stack direction="row" spacing={1.25} alignItems="center" mb={1}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        bgcolor: colorTokens.primary.main,
                      }}
                    >
                      {initials(message.author)}
                    </Avatar>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {message.author}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      data-testid={`query-message-created-at-${message.id}`}
                      data-datetime={message.createdAt}
                    >
                      {formatDateTime(message.createdAt)}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      ml: { xs: 0, sm: 5 },
                      p: 1.75,
                      borderRadius: 2,
                      bgcolor: "#F3F4F6",
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {message.body}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <EditNoteIcon sx={{ color: colorTokens.primary.main }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, color: colorTokens.primary.main }}
              >
                Respond to Query
              </Typography>
            </Stack>

            <Box component="form" onSubmit={handleRespond}>
              <TextField
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                fullWidth
                multiline
                minRows={3}
                maxRows={10}
                placeholder="Type your response here..."
                inputProps={{ "data-testid": "input-query-response" }}
                sx={{
                  mb: 2,
                  "& .MuiInputBase-root": {
                    alignItems: "flex-start",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    px: 2,
                    py: 1.5,
                    bgcolor: "#fff",
                  },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "& .MuiInputBase-root.Mui-focused": {
                    borderColor: colorTokens.primary.main,
                  },
                }}
              />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="query-status-label">Update status</InputLabel>
                  <Select
                    labelId="query-status-label"
                    label="Update status"
                    value={activeStatus}
                    onChange={(e) =>
                      setStatusDraft(e.target.value as SupportQueryStatus)
                    }
                    data-testid="select-query-status"
                  >
                    {SUPPORT_QUERY_STATUSES.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                  <FormHeaderIconAction
                    variant="back"
                    tooltipTitle="Back"
                    onClick={() => navigate("/support/contact")}
                    data-testid="btn-back-queries"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      "& .MuiSvgIcon-root": { fontSize: 18 },
                    }}
                  />
                  <Tooltip title="Send">
                    <span>
                      <IconButton
                        type="submit"
                        size="small"
                        aria-label="Send"
                        disabled={submitting}
                        data-testid="btn-submit-query-response"
                        sx={{
                          color: "#fff",
                          bgcolor: colorTokens.primary.main,
                          width: 36,
                          height: 36,
                          border: `1.5px solid ${colorTokens.primary.main}`,
                          "&:hover": {
                            bgcolor: colorTokens.primary.dark,
                            transform: "translateY(-1px)",
                          },
                        }}
                      >
                        <SendIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Grid>
      </Grid>

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
