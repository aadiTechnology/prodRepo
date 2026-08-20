import { useMemo, useState } from "react";
import { Alert, Box, CircularProgress, IconButton, Stack, Tooltip, Typography, alpha } from "@mui/material";
import { Add as AddIcon, Download as DownloadIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { PageHeader } from "../../components/layout";
import { AppCard } from "../../components/primitives";
import { ListPageLayout, ListPageToolbar } from "../../components/reusable";
import TableRowActions from "../../components/reusable/TableRowActions";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { colorTokens } from "../../tokens/colors";
import { useSupportPermissions } from "../../hooks/useSupportPermissions";
import type { ProductUpdateItem } from "./support.types";
import { canViewReleaseNoteForRole, SUPPORT_SUCCESS_SNACKBAR_OPTIONS } from "./support.types";
import {
  downloadReleaseAttachment,
  useProductUpdates,
} from "./context/ProductUpdateContext";

const downloadColor = colorTokens.primary.main;

export default function ProductUpdates() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const perms = useSupportPermissions();
  const { productUpdates, deleteReleaseNote, releaseNotesLoading, releaseNotesError } = useProductUpdates();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductUpdateItem | null>(null);

  const visibleNotes = useMemo(
    () =>
      productUpdates.filter((note) =>
        canViewReleaseNoteForRole(note, perms.actorRole, perms.isSuperAdmin)
      ),
    [productUpdates, perms.actorRole, perms.isSuperAdmin]
  );

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleNotes;
    return visibleNotes.filter(
      (note) =>
        note.version.toLowerCase().includes(q) ||
        note.description.toLowerCase().includes(q) ||
        note.title.toLowerCase().includes(q) ||
        note.attachmentName.toLowerCase().includes(q)
    );
  }, [visibleNotes, search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteReleaseNote(deleteTarget.id);
      enqueueSnackbar(`Release note v${deleteTarget.version} deleted.`, SUPPORT_SUCCESS_SNACKBAR_OPTIONS);
      setDeleteTarget(null);
    } catch {
      enqueueSnackbar("Failed to delete release note.", { variant: "error" });
    }
  };

  if (!perms.canAccessReleaseNotesPage) {
    return (
      <Box sx={{ p: 3 }} data-testid="page-release-notes-denied">
        <Alert severity="warning">Access Denied</Alert>
      </Box>
    );
  }

  return (
    <ListPageLayout
      header={
        <PageHeader
          links={[{ title: "Release Notes", path: "/support/updates" }]}
          homePath="/"
          actions={
            <ListPageToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by version or description…"
              searchTestId="input-release-notes-search"
              addButtonTestId="btn-add-release-note"
              onAddClick={
                perms.canManageProductUpdates
                  ? () => navigate("/support/updates/add")
                  : undefined
              }
              addLabel="Add"
              addIcon={<AddIcon sx={{ fontSize: 24 }} />}
            />
          }
        />
      }
    >
      <Box data-testid="page-release-notes">
        <Stack spacing={2}>
          {releaseNotesLoading ? (
            <Box
              sx={{ display: "flex", justifyContent: "center", p: 4 }}
              data-testid="loading-release-notes"
            >
              <CircularProgress sx={(t) => ({ color: t.palette.primary.main })} />
            </Box>
          ) : releaseNotesError ? (
            <Alert severity="error" data-testid="error-release-notes">
              {releaseNotesError}
            </Alert>
          ) : filteredNotes.length === 0 ? (
            <AppCard data-testid="empty-release-notes">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                No release notes found
              </Typography>
            </AppCard>
          ) : (
            filteredNotes.map((note) => (
              <AppCard key={note.id} data-testid={`release-note-${note.id}`}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "flex-start" }}
                  spacing={1}
                  mb={1}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      sx={{ mb: 0.5 }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {note.title || `Release ${note.version}`}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Released {note.releaseDate} · {note.createdBy}
                    </Typography>
                    <Typography variant="body1">{note.description}</Typography>
                  </Box>

                  {perms.canManageProductUpdates ? (
                    <TableRowActions
                      onEdit={() => navigate(`/support/updates/${note.id}/edit`)}
                      onDelete={() => setDeleteTarget(note)}
                      editTestId={`btn-edit-release-note-${note.id}`}
                      deleteTestId={`btn-delete-release-note-${note.id}`}
                    />
                  ) : null}
                </Stack>

                {note.attachmentName ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mt: 1.5 }}
                    data-testid={`release-note-attachment-${note.id}`}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Attachment: {note.attachmentName}
                    </Typography>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        aria-label={`Download ${note.attachmentName}`}
                        data-testid={`btn-download-release-note-${note.id}`}
                        onClick={() =>
                          downloadReleaseAttachment(note.attachmentName, note.attachmentUrl)
                        }
                        sx={{
                          color: downloadColor,
                          "&:hover": {
                            bgcolor: alpha(downloadColor, 0.1),
                            transform: "scale(1.15) rotate(5deg)",
                          },
                          transition: "all 0.2s",
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : null}
              </AppCard>
            ))
          )}
        </Stack>
      </Box>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Release Note"
        message="Are you sure you want to delete this Release Notes?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
        data-testid="dialog-delete-release-note"
      />
    </ListPageLayout>
  );
}
