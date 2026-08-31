import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "../../components/primitives";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";
import SearchableSelect from "../../components/semantic/SearchableSelect";
import ConfirmDialog from "../../components/semantic/ConfirmDialog";
import { useMyTasksEffortController } from "../../hooks/useMyTasksEffortController";
import { formatHours, formatShortDate } from "../../utils/formatters";
import type { TaskEffortRow } from "../../types/taskEffort";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function MyTasksEffortEntryPage() {
  const {
    projectId,
    setProjectId,
    projects,
    projectsLoading,
    sprintOptions,
    selectedSprintId,
    setSelectedSprintId,
    sprintsLoading,
    featureOptions,
    featureId,
    setFeatureId,
    pageOptions,
    pageId,
    setPageId,
    optionsLoading,
    workingDate,
    setWorkingDate,
    tasks,
    tasksLoading,
    error,
    setError,
    snackbar,
    setSnackbar,
    effortDraft,
    setEffortDraft,
    savingId,
    closingId,
    saveEffort,
    closeTask,
    reloadTasks,
  } = useMyTasksEffortController();

  const [closeTarget, setCloseTarget] = useState<TaskEffortRow | null>(null);

  const filtersReady = projectId != null && selectedSprintId != null && featureId != null;
  const showGrid = filtersReady && pageId != null;

  return (
    <ListPageLayout
      onRefresh={() => reloadTasks()}
      header={
        <>
          <PageHeader
            links={[
              { title: "Reports", path: "/reports/sprint-performance" },
              { title: "My Tasks — Effort Entry", path: "/my-tasks/effort-entry" },
            ]}
            homePath="/"
            actions={null}
          />
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Log incremental effort against tasks assigned to you in sprint planning. Select a page to load tasks.
              Effort and task closure use the working date below.
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "flex-end",
                mb: 2,
              }}
            >
              <Box sx={{ minWidth: 240 }}>
                <Typography variant="caption" color="text.secondary" display="block">
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

              <Box sx={{ minWidth: 220 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Sprint
                </Typography>
                <SearchableSelect
                  label=""
                  valueId={selectedSprintId}
                  options={sprintOptions}
                  onChangeId={(id) => setSelectedSprintId(id)}
                  placeholder={sprintsLoading ? "Loading…" : "Select sprint"}
                  disabled={projectId == null || sprintsLoading}
                />
              </Box>

              <Box sx={{ minWidth: 220 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Feature
                </Typography>
                <SearchableSelect
                  label=""
                  valueId={featureId}
                  options={featureOptions}
                  onChangeId={(id) => {
                    setFeatureId(id);
                    setPageId(null);
                  }}
                  placeholder={optionsLoading ? "Loading…" : "Select feature"}
                  disabled={projectId == null || optionsLoading}
                />
              </Box>

              <Box sx={{ minWidth: 220 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Page
                </Typography>
                <SearchableSelect
                  label=""
                  valueId={pageId}
                  options={pageOptions}
                  onChangeId={(id) => setPageId(id)}
                  placeholder={
                    featureId == null
                      ? "Select feature first"
                      : optionsLoading
                        ? "Loading…"
                        : pageOptions.length === 0
                          ? "No pages available"
                          : "Select page"
                  }
                  disabled={featureId == null || optionsLoading || pageOptions.length === 0}
                />
              </Box>

              <TextField
                label="Working date"
                type="date"
                size="small"
                value={workingDate}
                onChange={(e) => setWorkingDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 180 }}
                required
              />

              <IconButton
                aria-label="Refresh tasks"
                onClick={() => void reloadTasks()}
                disabled={!showGrid || tasksLoading}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </Box>

            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
        </>
      }
    >
      {!showGrid ? (
        <Box sx={{ px: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Choose sprint, feature, and page to view your tasks for this page.
          </Typography>
        </Box>
      ) : tasksLoading ? (
        <Box sx={{ px: 2 }}>
          <Typography variant="body2">Loading tasks…</Typography>
        </Box>
      ) : tasks.length === 0 ? (
        <Box sx={{ px: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No task lines found for this page and sprint. Ensure sprint planning created timesheet rows for your
            assignments.
          </Typography>
        </Box>
      ) : (
        <Paper sx={{ mx: 2, mb: 2, overflow: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Task name</TableCell>
                <TableCell>Subtask name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Effort (hours)</TableCell>
                <TableCell>Save</TableCell>
                <TableCell>Close</TableCell>
                <TableCell align="right">Total effort</TableCell>
                <TableCell>Start date</TableCell>
                <TableCell>End date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((row) => (
                <TableRow key={row.timesheet_id}>
                  <TableCell>{row.task_name}</TableCell>
                  <TableCell>{row.subtask_name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status_label}
                      color={row.is_closed ? "default" : row.status_id === 2 ? "primary" : "default"}
                      variant={row.is_closed ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ minWidth: 120 }}>
                    <TextField
                      type="number"
                      size="small"
                      inputProps={{ min: 0, step: 0.25 }}
                      value={effortDraft[row.timesheet_id] ?? ""}
                      onChange={(e) =>
                        setEffortDraft((d) => ({
                          ...d,
                          [row.timesheet_id]: e.target.value,
                        }))
                      }
                      disabled={row.is_closed || !workingDate}
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={
                        row.is_closed || !workingDate || savingId === row.timesheet_id || closingId != null
                      }
                      onClick={() => void saveEffort(row)}
                    >
                      {savingId === row.timesheet_id ? "Saving…" : "Save"}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      disabled={
                        row.is_closed || !workingDate || closingId === row.timesheet_id || savingId != null
                      }
                      onClick={() => setCloseTarget(row)}
                    >
                      {closingId === row.timesheet_id ? "Closing…" : "Close"}
                    </Button>
                  </TableCell>
                  <TableCell align="right">{formatHours(row.total_effort)}</TableCell>
                  <TableCell>{formatShortDate(row.task_start_date)}</TableCell>
                  <TableCell>{formatShortDate(row.task_end_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <ConfirmDialog
        open={closeTarget != null}
        onClose={() => setCloseTarget(null)}
        onConfirm={() => {
          if (!closeTarget) return;
          void (async () => {
            const ok = await closeTask(closeTarget);
            if (ok) setCloseTarget(null);
          })();
        }}
        title="Close task"
        message={
          closeTarget
            ? `Close “${closeTarget.task_name} — ${closeTarget.subtask_name}” using working date ${workingDate}? You will not be able to log more effort on this task.`
            : undefined
        }
        confirmLabel="Close task"
        loading={closingId != null}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </ListPageLayout>
  );
}
