import { useCallback, useEffect, useMemo, useState } from "react";
import reportProjectService, { type ReportProjectOption } from "../api/services/reportProjectService";
import sprintService from "../api/services/sprintService";
import type {
  OptionItem,
  Sprint,
  SprintAssignmentOptionsResponse,
  SprintAssignmentsResponse,
  SprintFeatureAssignmentWrite,
} from "../types/sprint";
import { useReportProjectSelection } from "./useReportProjectSelection";

export function useSprintAssignmentsController() {
  const { projectId, setProjectId } = useReportProjectSelection();

  const [projects, setProjects] = useState<ReportProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);

  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  const [assignmentOptions, setAssignmentOptions] = useState<SprintAssignmentOptionsResponse>({
    features: [],
    users: [],
  });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [pagesByFeatureId, setPagesByFeatureId] = useState<Record<number, OptionItem[]>>({});

  const [saved, setSaved] = useState<SprintAssignmentsResponse | null>(null);
  const [draft, setDraft] = useState<SprintFeatureAssignmentWrite[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      const items = await reportProjectService.listProjects();
      setProjects(items);
      if (projectId == null && items.length === 1) setProjectId(items[0].id);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [projectId, setProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchSprints = useCallback(async () => {
    if (projectId == null) {
      setSprints([]);
      setSelectedSprintId(null);
      setSaved(null);
      setDraft([]);
      return;
    }
    try {
      setSprintsLoading(true);
      const data = await sprintService.list(projectId, { page: 1, page_size: 500 });
      setSprints(data.items);
      if (data.items.length && selectedSprintId == null) {
        setSelectedSprintId(data.items[0].sprint_id);
      }
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Failed to load sprints.");
      setSprints([]);
    } finally {
      setSprintsLoading(false);
    }
  }, [projectId, selectedSprintId]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  const fetchOptions = useCallback(async () => {
    if (projectId == null) return;
    try {
      setOptionsLoading(true);
      const opt = await sprintService.getAssignmentOptions(projectId);
      setAssignmentOptions(opt);
    } catch {
      setAssignmentOptions({ features: [], users: [] });
    } finally {
      setOptionsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const requestPages = useCallback(
    async (featureId: number) => {
      if (projectId == null) return;
      if (pagesByFeatureId[featureId]?.length) return;
      try {
        const pages = await sprintService.listFeaturePages(projectId, featureId);
        setPagesByFeatureId((p) => ({ ...p, [featureId]: pages }));
      } catch {
        setPagesByFeatureId((p) => ({ ...p, [featureId]: [] }));
      }
    },
    [pagesByFeatureId, projectId]
  );

  const fetchAssignments = useCallback(async () => {
    if (projectId == null || selectedSprintId == null) {
      setSaved(null);
      setDraft([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await sprintService.getAssignments(projectId, selectedSprintId);
      setSaved(res);
      setDraft(
        res.feature_assignments.map((f) => ({
          feature_id: f.feature_id,
          pages: f.pages.map((p) => ({
            page_id: p.page_id,
            user_ids: p.assigned_users.map((u) => u.user_id),
          })),
        }))
      );
      await Promise.all(res.feature_assignments.map((f) => requestPages(f.feature_id)));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Failed to load assignments.");
      setSaved(null);
      setDraft([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, requestPages, selectedSprintId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const sprintOptions = useMemo<OptionItem[]>(
    () =>
      sprints.map((s) => ({
        id: s.sprint_id,
        label: s.sprint_name ? `${s.sprint_name} (#${s.sprint_id})` : `Sprint #${s.sprint_id}`,
      })),
    [sprints]
  );

  const onSave = useCallback(async () => {
    if (projectId == null || selectedSprintId == null) {
      setError("Select project and sprint first.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await sprintService.saveAssignments(projectId, selectedSprintId, {
        feature_assignments: draft,
      });
      setSaved(res);
      setSnackbar("Assignments saved successfully!");
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Failed to save assignments.");
    } finally {
      setLoading(false);
    }
  }, [draft, projectId, selectedSprintId]);

  const onDeletePage = useCallback(
    async (featureId: number, pageId: number) => {
      if (projectId == null || selectedSprintId == null) return;
      try {
        setLoading(true);
        setError(null);
        await sprintService.deletePageAssignments(projectId, selectedSprintId, featureId, pageId);
        await fetchAssignments();
        setSnackbar("Page assignments deleted.");
      } catch (e: unknown) {
        setError((e as { message?: string })?.message || "Failed to delete page assignments.");
      } finally {
        setLoading(false);
      }
    },
    [fetchAssignments, projectId, selectedSprintId]
  );

  return {
    projectId,
    setProjectId,
    projects,
    projectsLoading,
    sprintsLoading,
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
  };
}

