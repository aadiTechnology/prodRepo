import { useCallback, useEffect, useMemo, useState } from "react";
import reportProjectService, { type ReportProjectOption } from "../api/services/reportProjectService";
import sprintService from "../api/services/sprintService";
import type {
  OptionItem,
  Sprint,
  SprintAssignmentManagementFeatureGridResponse,
  SprintAssignmentOptionsResponse,
  SprintFeatureAssignmentWrite,
} from "../types/sprint";
import { useReportProjectSelection } from "./useReportProjectSelection";

export type PageDraftKey = string;

export type PageAssignmentDraft = {
  developer_ids: number[];
  tester_ids: number[];
};

export function pageKey(featureId: number, pageId: number): PageDraftKey {
  return `${featureId}:${pageId}`;
}

export function draftFromGridPage(p: {
  developers: { user_id: number }[];
  testers: { user_id: number }[];
}): PageAssignmentDraft {
  return {
    developer_ids: p.developers.map((d) => d.user_id),
    tester_ids: p.testers.map((t) => t.user_id),
  };
}

function buildSavePayload(
  featureGrid: SprintAssignmentManagementFeatureGridResponse,
  draftByPage: Map<PageDraftKey, PageAssignmentDraft>
): { feature_assignments: SprintFeatureAssignmentWrite[] } {
  return {
    feature_assignments: [
      {
        feature_id: featureGrid.feature.feature_id,
        pages: featureGrid.feature.pages.map((p) => {
          const k = pageKey(featureGrid.feature.feature_id, p.page_id);
        const d = draftByPage.get(k) ?? draftFromGridPage(p);
        return {
          page_id: p.page_id,
          user_ids: [],
          developer_user_ids: d.developer_ids,
          tester_user_ids: d.tester_ids,
        };
        }),
      },
    ],
  };
}

export function useSprintAssignmentsController() {
  const { projectId, setProjectId } = useReportProjectSelection();

  const [projects, setProjects] = useState<ReportProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);

  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  useEffect(() => {
    setSelectedSprintId(null);
  }, [projectId]);

  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);

  const [assignmentOptions, setAssignmentOptions] = useState<SprintAssignmentOptionsResponse>({
    features: [],
    users: [],
  });
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [featureGrid, setFeatureGrid] = useState<SprintAssignmentManagementFeatureGridResponse | null>(null);
  const [draftByPage, setDraftByPage] = useState<Map<PageDraftKey, PageAssignmentDraft>>(new Map());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [pageSearch, setPageSearch] = useState("");
  const [filterDeveloperIds, setFilterDeveloperIds] = useState<number[]>([]);
  const [filterTesterIds, setFilterTesterIds] = useState<number[]>([]);
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

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
      setSelectedFeatureId(null);
      setFeatureGrid(null);
      setDraftByPage(new Map());
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

  useEffect(() => {
    setSelectedFeatureId(null);
  }, [selectedSprintId]);

  useEffect(() => {
    setFeatureGrid(null);
    setDraftByPage(new Map());
  }, [selectedFeatureId]);

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

  const loadFeatureGrid = useCallback(async () => {
    if (projectId == null || selectedSprintId == null || selectedFeatureId == null) {
      setFeatureGrid(null);
      setDraftByPage(new Map());
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await sprintService.getAssignmentManagementFeatureGrid(
        projectId,
        selectedSprintId,
        selectedFeatureId
      );
      setFeatureGrid(res);
      const m = new Map<PageDraftKey, PageAssignmentDraft>();
      for (const p of res.feature.pages) {
        m.set(pageKey(res.feature.feature_id, p.page_id), draftFromGridPage(p));
      }
      setDraftByPage(m);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Failed to load feature pages.");
      setFeatureGrid(null);
      setDraftByPage(new Map());
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSprintId, selectedFeatureId]);

  useEffect(() => {
    loadFeatureGrid();
  }, [loadFeatureGrid]);

  const sprintOptions = useMemo<OptionItem[]>(
    () =>
      sprints.map((s) => ({
        id: s.sprint_id,
        label: s.sprint_name ? `${s.sprint_name} (#${s.sprint_id})` : `Sprint #${s.sprint_id}`,
      })),
    [sprints]
  );

  const dirty = useMemo(() => {
    if (!featureGrid) return false;
    const fid = featureGrid.feature.feature_id;
    for (const p of featureGrid.feature.pages) {
      const k = pageKey(fid, p.page_id);
      const cur = draftByPage.get(k);
      if (!cur) continue;
      const base = draftFromGridPage(p);
      if (
        cur.developer_ids.join(",") !== base.developer_ids.join(",") ||
        cur.tester_ids.join(",") !== base.tester_ids.join(",")
      ) {
        return true;
      }
    }
    return false;
  }, [featureGrid, draftByPage]);

  const setPageDraft = useCallback((featureId: number, pageId: number, next: PageAssignmentDraft) => {
    const k = pageKey(featureId, pageId);
    setDraftByPage((prev) => {
      const copy = new Map(prev);
      copy.set(k, next);
      return copy;
    });
  }, []);

  const setPrimaryDeveloper = useCallback(
    (featureId: number, pageId: number, userId: number | null) => {
      if (!featureGrid || featureGrid.feature.feature_id !== featureId) return;
      const p = featureGrid.feature.pages.find((x) => x.page_id === pageId);
      if (!p) return;
      const k = pageKey(featureId, pageId);
      const cur = draftByPage.get(k) ?? draftFromGridPage(p);
      if (userId == null) {
        setPageDraft(featureId, pageId, { ...cur, developer_ids: [] });
        return;
      }
      const rest = cur.developer_ids.filter((id) => id !== userId);
      setPageDraft(featureId, pageId, { ...cur, developer_ids: [userId, ...rest] });
    },
    [featureGrid, draftByPage, setPageDraft]
  );

  const setPrimaryTester = useCallback(
    (featureId: number, pageId: number, userId: number | null) => {
      if (!featureGrid || featureGrid.feature.feature_id !== featureId) return;
      const p = featureGrid.feature.pages.find((x) => x.page_id === pageId);
      if (!p) return;
      const k = pageKey(featureId, pageId);
      const cur = draftByPage.get(k) ?? draftFromGridPage(p);
      if (userId == null) {
        setPageDraft(featureId, pageId, { ...cur, tester_ids: [] });
        return;
      }
      const rest = cur.tester_ids.filter((id) => id !== userId);
      setPageDraft(featureId, pageId, { ...cur, tester_ids: [userId, ...rest] });
    },
    [featureGrid, draftByPage, setPageDraft]
  );

  const clearPageAssignments = useCallback(
    (featureId: number, pageId: number) => {
      setPageDraft(featureId, pageId, { developer_ids: [], tester_ids: [] });
    },
    [setPageDraft]
  );

  const resetDraftFromGrid = useCallback(() => {
    if (!featureGrid) return;
    const m = new Map<PageDraftKey, PageAssignmentDraft>();
    const fid = featureGrid.feature.feature_id;
    for (const p of featureGrid.feature.pages) {
      m.set(pageKey(fid, p.page_id), draftFromGridPage(p));
    }
    setDraftByPage(m);
  }, [featureGrid]);

  const onSave = useCallback(async () => {
    if (projectId == null || selectedSprintId == null || selectedFeatureId == null || !featureGrid) {
      setError("Select project and sprint first.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const payload = buildSavePayload(featureGrid, draftByPage);
      await sprintService.saveFeatureAssignments(projectId, selectedSprintId, selectedFeatureId, payload);
      await loadFeatureGrid();
      setSnackbar("Assignments saved successfully.");
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Failed to save assignments.");
    } finally {
      setLoading(false);
    }
  }, [draftByPage, featureGrid, loadFeatureGrid, projectId, selectedSprintId, selectedFeatureId]);

  const onDeletePage = useCallback(
    async (featureId: number, pageId: number) => {
      if (projectId == null || selectedSprintId == null) return;
      try {
        setLoading(true);
        setError(null);
        await sprintService.deletePageAssignments(projectId, selectedSprintId, featureId, pageId);
        await loadFeatureGrid();
        setSnackbar("Page assignments removed.");
      } catch (e: unknown) {
        setError((e as { message?: string })?.message || "Failed to delete page assignments.");
      } finally {
        setLoading(false);
      }
    },
    [loadFeatureGrid, projectId, selectedSprintId]
  );

  const filteredFeatures = useMemo(() => {
    if (!featureGrid) return [];
    const ps = pageSearch.trim().toLowerCase();

    if (selectedFeatureId == null) return [];
    const f = featureGrid.feature.feature_id === selectedFeatureId ? featureGrid.feature : null;
    if (!f) return [];

    return [f].flatMap((f) => {
      const pages = f.pages.filter((p) => {
        const pageOk = !ps || (p.page_name ?? "").toLowerCase().includes(ps) || String(p.page_id).includes(ps);
        if (!pageOk) return false;
        const k = pageKey(f.feature_id, p.page_id);
        const d = draftByPage.get(k) ?? draftFromGridPage(p);
        const devSet = new Set(d.developer_ids);
        const tesSet = new Set(d.tester_ids);
        if (filterDeveloperIds.length && !filterDeveloperIds.some((id) => devSet.has(id))) return false;
        if (filterTesterIds.length && !filterTesterIds.some((id) => tesSet.has(id))) return false;
        const assigned = d.developer_ids.length > 0 || d.tester_ids.length > 0;
        if (showAssignedOnly && !assigned) return false;
        if (showUnassignedOnly && assigned) return false;
        return true;
      });
      if (!pages.length) return [];
      return [{ ...f, pages }];
    });
  }, [
    featureGrid,
    draftByPage,
    selectedFeatureId,
    pageSearch,
    filterDeveloperIds,
    filterTesterIds,
    showAssignedOnly,
    showUnassignedOnly,
  ]);

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
    clearPageAssignments,
    resetDraftFromGrid,
    onSave,
    onDeletePage,
    refreshGrid: loadFeatureGrid,
  };
}
