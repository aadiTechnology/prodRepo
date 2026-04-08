import { Alert, Box, Button, Snackbar, Typography } from "@mui/material";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import { SearchableSelect } from "../../components/semantic";
import SprintAssignmentsSection from "./SprintAssignmentsSection";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { useMemo, useState } from "react";
import { useSprintAssignmentsController } from "../../hooks/useSprintAssignmentsController";

export default function SprintAssignmentsPage() {
  const {
    projectId,
    setProjectId,
    projects,
    projectsLoading,
    sprintOptions,
    selectedSprintId,
    setSelectedSprintId,
    assignmentOptions,
    optionsLoading,
    pagesByFeatureId,
    requestPages,
    saved,
    draft,
    setDraft,
    loading,
    error,
    setError,
    snackbar,
    setSnackbar,
    onSave,
    onDeletePage,
  } = useSprintAssignmentsController();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ featureId: number; pageId: number; label: string } | null>(
    null
  );

  const canEdit = projectId != null && selectedSprintId != null;

  const savedBlocks = useMemo(() => saved?.feature_assignments ?? [], [saved]);

  return (
    <ListPageLayout
      pageBackground={true}
      contentPaddingSize="none"
      header={
        <Box sx={{ mb: 2 }}>
          <PageHeader
            links={[{ title: "Sprints", path: "/sprints" }, { title: "Assignments", path: "#" }]}
            homePath="/"
            actions={
              <Button variant="contained" onClick={onSave} disabled={!canEdit || loading}>
                {loading ? "Saving…" : "Save Assignments"}
              </Button>
            }
          />
          {error && (
            <Alert severity="error" variant="filled" sx={{ mt: 2, borderRadius: "12px" }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>
      }
    >
      <Box sx={{ px: { xs: 0, sm: 1 }, display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <Box sx={{ minWidth: 260 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Project
          </Typography>
          <SearchableSelect
            label=""
            valueId={projectId}
            options={projects}
            onChangeId={(id) => setProjectId(id)}
            placeholder={projectsLoading ? "Loading…" : "Select project"}
            disabled={projectsLoading}
          />
        </Box>

        <Box sx={{ minWidth: 320 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Sprint
          </Typography>
          <SearchableSelect
            label=""
            valueId={selectedSprintId}
            options={sprintOptions}
            onChangeId={(id) => setSelectedSprintId(id)}
            placeholder={!projectId ? "Select project first" : "Select sprint"}
            disabled={!projectId}
          />
        </Box>
      </Box>

      <Box sx={{ px: { xs: 0, sm: 1 } }}>
        <SprintAssignmentsSection
          disabled={!canEdit || loading || optionsLoading}
          features={assignmentOptions.features}
          users={assignmentOptions.users}
          pagesByFeatureId={pagesByFeatureId}
          value={draft}
          onChange={setDraft}
          onRequestPages={requestPages}
        />
      </Box>

      <Box sx={{ mt: 3, px: { xs: 0, sm: 1 } }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Saved assignments
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          After saving, mappings appear here. You can delete a saved page mapping.
        </Typography>

        {!savedBlocks.length ? (
          <Typography variant="body2" color="text.secondary">
            No saved assignments for the selected sprint.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {savedBlocks.map((f) => (
              <Box key={f.feature_id} sx={{ p: 2, border: "1px solid #eee", borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>{f.feature_name ?? `Feature ${f.feature_id}`}</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {f.pages.map((p) => (
                    <Box
                      key={p.page_id}
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        p: 1.25,
                        borderRadius: 2,
                        border: "1px solid #f0f0f0",
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          {p.page_name ?? `Page ${p.page_id}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Users: {p.assigned_users.map((u) => u.user_name ?? u.user_id).join(", ")}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => {
                          setPendingDelete({
                            featureId: f.feature_id,
                            pageId: p.page_id,
                            label: `${p.page_name ?? `Page ${p.page_id}`} (${f.feature_name ?? `Feature ${f.feature_id}`})`,
                          });
                          setConfirmOpen(true);
                        }}
                        disabled={loading || !canEdit}
                      >
                        Delete
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title="Please Confirm"
        message={`Delete saved assignments for ${pendingDelete?.label}?`}
        confirmLabel={loading ? "Deleting..." : "Confirm"}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setConfirmOpen(false);
          await onDeletePage(pendingDelete.featureId, pendingDelete.pageId);
          setPendingDelete(null);
        }}
        onClose={() => {
          setConfirmOpen(false);
          setPendingDelete(null);
        }}
        loading={loading}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar(null)}
      >
        <Alert onClose={() => setSnackbar(null)} severity="success" sx={{ width: "100%" }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </ListPageLayout>
  );
}

