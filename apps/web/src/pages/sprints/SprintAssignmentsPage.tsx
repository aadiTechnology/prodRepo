import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "../../components/primitives";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import SearchableSelect from "../../components/semantic/SearchableSelect";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { useMemo, useState } from "react";
import {
  draftFromGridPage,
  pageKey,
  useSprintAssignmentsController,
} from "../../hooks/useSprintAssignmentsController";
import type { OptionItem, SprintAssignmentGridFeature, SprintAssignmentGridPage } from "../../types/sprint";

function formatDt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

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
    featureGrid,
    draftByPage,
    loading,
    error,
    setError,
    snackbar,
    setSnackbar,
    dirty,
    selectedFeatureId,
    setSelectedFeatureId,
    pageSearch,
    setPageSearch,
    filterDeveloperIds,
    setFilterDeveloperIds,
    filterTesterIds,
    setFilterTesterIds,
    showAssignedOnly,
    setShowAssignedOnly,
    showUnassignedOnly,
    setShowUnassignedOnly,
    filteredFeatures,
    setPrimaryDeveloper,
    setPrimaryTester,
    resetDraftFromGrid,
    onSave,
    onDeletePage,
    refreshGrid,
  } = useSprintAssignmentsController();

  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [viewPage, setViewPage] = useState<{
    feature: SprintAssignmentGridFeature;
    page: SprintAssignmentGridPage;
  } | null>(null);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTarget, setMenuTarget] = useState<{
    featureId: number;
    pageId: number;
    label: string;
  } | null>(null);

  const canEdit = projectId != null && selectedSprintId != null;

  const userOptions = assignmentOptions.users;
  const featureOptions = useMemo<OptionItem[]>(
    () =>
      (assignmentOptions.features ?? []).map((f) => ({
        id: f.id,
        label: f.label,
      })),
    [assignmentOptions.features]
  );
  const devFilterValue = useMemo(
    () => userOptions.filter((u) => filterDeveloperIds.includes(u.id)),
    [userOptions, filterDeveloperIds]
  );
  const testerFilterValue = useMemo(
    () => userOptions.filter((u) => filterTesterIds.includes(u.id)),
    [userOptions, filterTesterIds]
  );

  const openMenu = (e: React.MouseEvent<HTMLElement>, featureId: number, pageId: number, label: string) => {
    setMenuAnchor(e.currentTarget);
    setMenuTarget({ featureId, pageId, label });
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuTarget(null);
  };

  return (
    <ListPageLayout
      pageBackground={true}
      contentPaddingSize="none"
      header={
        <Box sx={{ mb: 2 }}>
          <PageHeader
            links={[
              { title: "Sprints", path: "/sprints" },
              { title: "Sprint Assignment Management", path: "#" },
            ]}
            homePath="/"
            actions={
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                <Button variant="contained" onClick={() => setSaveConfirmOpen(true)} disabled={!canEdit || loading || !dirty}>
                  {loading ? "Saving…" : "Save assignments"}
                </Button>
              </Box>
            }
          />
          {featureGrid && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Sprint: {featureGrid.sprint_name ?? `Sprint #${featureGrid.sprint_id}`} · Project #{featureGrid.project_id}
            </Typography>
          )}
          {error && (
            <Alert severity="error" variant="filled" sx={{ mt: 2, borderRadius: "12px" }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, px: { xs: 0, sm: 1 } }}>
        <Paper
          elevation={0}
          sx={{
            width: { xs: "100%", md: 300 },
            flexShrink: 0,
            p: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
            Filters
          </Typography>
          <TextField
            label="Search page"
            size="small"
            fullWidth
            value={pageSearch}
            onChange={(e) => setPageSearch(e.target.value)}
            sx={{ mb: 1.5 }}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Filter by developer
          </Typography>
          <Autocomplete<OptionItem, true, false, false>
            multiple
            disableCloseOnSelect
            options={userOptions}
            value={devFilterValue}
            disabled={optionsLoading}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_e, v) => setFilterDeveloperIds(v.map((x) => x.id))}
            renderInput={(params) => <TextField {...params} placeholder="Any" size="small" />}
            sx={{ mb: 1.5 }}
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Filter by tester
          </Typography>
          <Autocomplete<OptionItem, true, false, false>
            multiple
            disableCloseOnSelect
            options={userOptions}
            value={testerFilterValue}
            disabled={optionsLoading}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_e, v) => setFilterTesterIds(v.map((x) => x.id))}
            renderInput={(params) => <TextField {...params} placeholder="Any" size="small" />}
            sx={{ mb: 1.5 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showAssignedOnly}
                onChange={(_e, v) => {
                  setShowAssignedOnly(v);
                  if (v) setShowUnassignedOnly(false);
                }}
                size="small"
              />
            }
            label="Assigned only"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showUnassignedOnly}
                onChange={(_e, v) => {
                  setShowUnassignedOnly(v);
                  if (v) setShowAssignedOnly(false);
                }}
                size="small"
              />
            }
            label="Unassigned only"
          />
          <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={() => refreshGrid()} disabled={!canEdit || loading}>
            Refresh
          </Button>
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
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
            <Box sx={{ minWidth: 360 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Feature
              </Typography>
              <SearchableSelect
                label=""
                valueId={selectedFeatureId}
                options={featureOptions}
                onChangeId={(id) => setSelectedFeatureId(id)}
                placeholder={!canEdit ? "Select sprint first" : "Select feature"}
                disabled={!canEdit || loading}
              />
            </Box>
          </Box>

          {!canEdit ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
              <Typography color="text.secondary">Select a sprint to load features and pages.</Typography>
            </Paper>
          ) : selectedFeatureId == null ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
              <Typography color="text.secondary">Select a feature to load its pages.</Typography>
            </Paper>
          ) : loading && !featureGrid ? (
            <Typography color="text.secondary">Loading assignments…</Typography>
          ) : selectedFeatureId != null && !featureGrid ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
              <Typography color="text.secondary">No data found for the selected feature.</Typography>
            </Paper>
          ) : !assignmentOptions.features.length ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
              <Typography color="text.secondary">No feature/page catalog for this project.</Typography>
            </Paper>
          ) : (
            <>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1 }}>
                {dirty && <Chip label="Unsaved changes" color="warning" size="small" variant="outlined" />}
                <Button size="small" onClick={resetDraftFromGrid} disabled={!dirty || loading}>
                  Reset changes
                </Button>
              </Box>
              {filteredFeatures.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  No rows match the current filters.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {filteredFeatures.map((f) => (
                    <Accordion key={f.feature_id} defaultExpanded disableGutters sx={{ borderRadius: "8px !important", "&:before": { display: "none" } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 700 }}>{f.feature_name ?? `Feature ${f.feature_id}`}</Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, px: 0 }}>
                        <Table size="small" sx={{ "& td": { verticalAlign: "middle" } }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Page</TableCell>
                              <TableCell width={200}>Developer</TableCell>
                              <TableCell width={200}>Tester</TableCell>
                              <TableCell width={100}>Status</TableCell>
                              <TableCell width={160}>Last updated</TableCell>
                              <TableCell width={140}>Updated by</TableCell>
                              <TableCell width={56} align="right" />
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {f.pages.map((p) => {
                              const k = pageKey(f.feature_id, p.page_id);
                              const d = draftByPage.get(k) ?? draftFromGridPage(p);
                              const devPrimary = d.developer_ids[0] ?? null;
                              const tesPrimary = d.tester_ids[0] ?? null;
                              const devOpt = devPrimary != null ? userOptions.find((u) => u.id === devPrimary) ?? null : null;
                              const tesOpt = tesPrimary != null ? userOptions.find((u) => u.id === tesPrimary) ?? null : null;
                              const pageLabel = p.page_name ?? `Page ${p.page_id}`;
                              return (
                                <TableRow key={p.page_id} hover>
                                  <TableCell>{pageLabel}</TableCell>
                                  <TableCell>
                                    <Autocomplete<OptionItem, false, false, false>
                                      size="small"
                                      options={userOptions}
                                      value={devOpt}
                                      disabled={!canEdit || loading || optionsLoading}
                                      onChange={(_e, v) => setPrimaryDeveloper(f.feature_id, p.page_id, v?.id ?? null)}
                                      getOptionLabel={(o) => o.label}
                                      isOptionEqualToValue={(a, b) => a.id === b.id}
                                      renderInput={(params) => <TextField {...params} placeholder="Developer" />}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Autocomplete<OptionItem, false, false, false>
                                      size="small"
                                      options={userOptions}
                                      value={tesOpt}
                                      disabled={!canEdit || loading || optionsLoading}
                                      onChange={(_e, v) => setPrimaryTester(f.feature_id, p.page_id, v?.id ?? null)}
                                      getOptionLabel={(o) => o.label}
                                      isOptionEqualToValue={(a, b) => a.id === b.id}
                                      renderInput={(params) => <TextField {...params} placeholder="Tester" />}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      label={p.status === "saved" ? "Saved" : "Unassigned"}
                                      color={p.status === "saved" ? "success" : "default"}
                                      variant={p.status === "saved" ? "filled" : "outlined"}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>{formatDt(p.last_updated_on)}</TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>{p.last_updated_by_name ?? "—"}</TableCell>
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      aria-label="Row actions"
                                      onClick={(e) => openMenu(e, f.feature_id, p.page_id, pageLabel)}
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </>
          )}

          {featureGrid && (
            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Typography variant="body2" color="text.secondary">
                  Total pages: <strong>{featureGrid.stats.total_pages}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Assigned: <strong>{featureGrid.stats.assigned_pages}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unassigned: <strong>{featureGrid.stats.unassigned_pages}</strong>
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            if (menuTarget) {
              const feat =
                featureGrid?.feature.feature_id === menuTarget.featureId ? featureGrid.feature : undefined;
              const pg = feat?.pages.find((x) => x.page_id === menuTarget.pageId);
              if (feat && pg) setViewPage({ feature: feat, page: pg });
            }
            closeMenu();
          }}
        >
          View details
        </MenuItem>
        <MenuItem
          onClick={async () => {
            if (menuTarget) await onDeletePage(menuTarget.featureId, menuTarget.pageId);
            closeMenu();
          }}
        >
          Remove assignment
        </MenuItem>
      </Menu>

      <Dialog open={viewPage != null} onClose={() => setViewPage(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {viewPage?.feature.feature_name ?? "Feature"} · {viewPage?.page.page_name ?? "Page"}
        </DialogTitle>
        <DialogContent>
          {viewPage && (() => {
            const k = pageKey(viewPage.feature.feature_id, viewPage.page.page_id);
            const d = draftByPage.get(k) ?? draftFromGridPage(viewPage.page);
            return (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Developers ({d.developer_ids.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {d.developer_ids.length
                      ? d.developer_ids
                          .map((id: number) => userOptions.find((u) => u.id === id)?.label ?? id)
                          .join(", ")
                      : "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Testers ({d.tester_ids.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {d.tester_ids.length
                      ? d.tester_ids
                          .map((id: number) => userOptions.find((u) => u.id === id)?.label ?? id)
                          .join(", ")
                      : "—"}
                  </Typography>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={saveConfirmOpen}
        title="Save assignments"
        message="Save assignment changes for the selected feature?"
        confirmLabel={loading ? "Saving…" : "Save"}
        onConfirm={async () => {
          setSaveConfirmOpen(false);
          await onSave();
        }}
        onClose={() => setSaveConfirmOpen(false)}
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
