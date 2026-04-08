import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import BaseForm from "../../components/reusable/BaseForm";
import { SearchableSelect } from "../../components/semantic";
import { useFormManager } from "../../hooks/useFormManager";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import { useReportProjectSelection } from "../../hooks/useReportProjectSelection";
import reportProjectService, { type ReportProjectOption } from "../../api/services/reportProjectService";
import sprintService from "../../api/services/sprintService";
import SprintAssignmentsSection from "./SprintAssignmentsSection";
import {
  createSprintFormConfig,
  type SprintFormData,
  type SprintLifecycleHandlers,
} from "./SprintForm.formConfig";
import type {
  OptionItem,
  SprintAssignmentOptionsResponse,
  SprintFeatureAssignmentWrite,
} from "../../types/sprint";

const emptyForm = (): SprintFormData => ({
  sprint_name: "",
  start_date: "",
  end_date: "",
  is_active: true,
  is_completed: false,
});

export default function SprintForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const { projectId } = useReportProjectSelection();

  const [projects, setProjects] = useState<ReportProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [formProjectId, setFormProjectId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [assignmentOptions, setAssignmentOptions] = useState<SprintAssignmentOptionsResponse>({
    features: [],
    users: [],
  });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [pagesByFeatureId, setPagesByFeatureId] = useState<Record<number, OptionItem[]>>({});
  const [featureAssignments, setFeatureAssignments] = useState<SprintFeatureAssignmentWrite[]>([]);

  const initialValues = useMemo(() => emptyForm(), []);

  const validationConfig = useMemo<FormValidationConfig<SprintFormData>>(
    () => ({
      sprint_name: [
        { type: "required", message: "Required." },
        { type: "minLength", value: 1, message: "Required." },
      ],
      start_date: [
        {
          type: "custom",
          validate: (formData) => {
            if (!formData.start_date?.trim() || !formData.end_date?.trim()) return "";
            if (formData.start_date > formData.end_date) {
              return "Start date must be on or before end date.";
            }
            return "";
          },
        },
      ],
      end_date: [
        {
          type: "custom",
          validate: (formData) => {
            if (!formData.start_date?.trim() || !formData.end_date?.trim()) return "";
            if (formData.start_date > formData.end_date) {
              return "End date must be on or after start date.";
            }
            return "";
          },
        },
      ],
    }),
    []
  );

  const { formData, setFormData, fieldErrors, setFieldErrors, handleChange, handleFieldValueChange, handleSubmit } =
    useFormManager<SprintFormData>({
      initialValues,
      validationConfig,
      dependentFieldPairs: [
        ["start_date", "end_date"],
        ["end_date", "start_date"],
      ],
      onClearError: () => setError(null),
    });

  const lifecycleHandlers = useMemo<SprintLifecycleHandlers>(
    () => ({
      onActiveChange: (value: boolean) => {
        setFormData((p) => ({
          ...p,
          is_active: value,
          ...(value ? { is_completed: false } : {}),
        }));
      },
      onCompletedChange: (value: boolean) => {
        setFormData((p) => ({
          ...p,
          is_completed: value,
          ...(value ? { is_active: false } : {}),
        }));
      },
    }),
    [setFormData]
  );

  const effectiveProjectId = useMemo(() => {
    if (isEditMode) return projectId ?? null;
    if (projects.length === 1) return projects[0].id;
    return formProjectId ?? null;
  }, [formProjectId, isEditMode, projectId, projects]);

  const requestPages = useCallback(
    async (featureId: number) => {
      if (!effectiveProjectId) return;
      if (pagesByFeatureId[featureId]?.length) return;
      try {
        const pages = await sprintService.listFeaturePages(effectiveProjectId, featureId);
        setPagesByFeatureId((p) => ({ ...p, [featureId]: pages }));
      } catch {
        setPagesByFeatureId((p) => ({ ...p, [featureId]: [] }));
      }
    },
    [effectiveProjectId, pagesByFeatureId]
  );

  const assignmentsSection = useMemo(() => {
    return (
      <SprintAssignmentsSection
        disabled={loading || effectiveProjectId == null || optionsLoading}
        features={assignmentOptions.features}
        users={assignmentOptions.users}
        pagesByFeatureId={pagesByFeatureId}
        value={featureAssignments}
        onChange={setFeatureAssignments}
        onRequestPages={requestPages}
      />
    );
  }, [
    assignmentOptions.features,
    assignmentOptions.users,
    effectiveProjectId,
    featureAssignments,
    loading,
    optionsLoading,
    pagesByFeatureId,
    requestPages,
  ]);

  const formConfig = useMemo(
    () => createSprintFormConfig(lifecycleHandlers, { assignmentsSection }),
    [assignmentsSection, lifecycleHandlers]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProjectsLoading(true);
        const items = await reportProjectService.listProjects();
        if (!cancelled) setProjects(items);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isEditMode) return;
    if (projects.length === 1) setFormProjectId(projects[0].id);
  }, [isEditMode, projects]);

  useEffect(() => {
    if (isEditMode) return;
    if (projects.length > 1 && projectId != null) setFormProjectId(projectId);
  }, [isEditMode, projects.length, projectId]);

  const fetchSprint = useCallback(async () => {
    if (!isEditMode || !id) return;
    if (projectId == null) {
      setError("Please select a project first.");
      setFetchLoading(false);
      return;
    }
    try {
      setFetchLoading(true);
      const s = await sprintService.get(projectId, Number(id));
      setFormData({
        sprint_name: s.sprint_name || "",
        start_date: s.start_date || "",
        end_date: s.end_date || "",
        is_active: Boolean(s.is_active),
        is_completed: Boolean(s.is_completed),
      });

      const hydrated: SprintFeatureAssignmentWrite[] = (s.feature_assignments || []).map((f) => ({
        feature_id: f.feature_id,
        pages: (f.pages || []).map((p) => ({
          page_id: p.page_id,
          user_ids: (p.assigned_users || []).map((u) => u.user_id),
        })),
      }));
      setFeatureAssignments(hydrated);

      // Preload page options for features present in the sprint (improves edit UX).
      await Promise.all(hydrated.map((fa) => requestPages(fa.feature_id)));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Failed to load sprint.");
    } finally {
      setFetchLoading(false);
    }
  }, [id, isEditMode, projectId, requestPages, setFormData]);

  useEffect(() => {
    fetchSprint();
  }, [fetchSprint]);

  useEffect(() => {
    if (!effectiveProjectId) return;
    let cancelled = false;
    (async () => {
      try {
        setOptionsLoading(true);
        const opt = await sprintService.getAssignmentOptions(effectiveProjectId);
        if (!cancelled) setAssignmentOptions(opt);
      } catch {
        if (!cancelled) setAssignmentOptions({ features: [], users: [] });
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveProjectId]);

  const handleConfirmSubmit = async () => {
    if (isEditMode) {
      if (projectId == null) {
        setError("Please select a project first.");
        return;
      }
    } else {
      if (projects.length === 0) {
        setError("No projects are available for your account.");
        return;
      }
      if (projects.length > 1 && formProjectId == null) {
        setError("Please select a project for this sprint.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        sprint_name: formData.sprint_name,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        is_completed: formData.is_completed,
        feature_assignments: featureAssignments,
      };
      if (isEditMode && id) {
        await sprintService.update(projectId!, Number(id), payload);
        setSnackbar("Sprint updated successfully!");
      } else {
        await sprintService.create(
          payload,
          projects.length === 1 ? undefined : formProjectId ?? undefined
        );
        setSnackbar("Sprint created successfully!");
      }
      setTimeout(() => navigate("/sprints"), 800);
    } catch (err: unknown) {
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
      setError(message || (isEditMode ? "Failed to update sprint." : "Failed to create sprint."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm<SprintFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleSubmit}
      setFormError={setError}
      onConfirmSubmit={handleConfirmSubmit}
      isEditMode={isEditMode}
      loading={loading}
      fetchLoading={fetchLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Sprints", path: "/sprints" },
          { title: isEditMode ? "Edit Sprint" : "Add Sprint", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Save",
      }}
      onCancelNavigate={() => navigate("/sprints")}
      confirmMessage={(ctx) =>
        ctx.isEditMode ? "Are you sure you want to update this sprint?" : "Are you sure you want to create this sprint?"
      }
      formTopSlot={
        !isEditMode && projects.length > 1 ? (
          <Box sx={{ width: "100%", maxWidth: 560 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Project
            </Typography>
            <SearchableSelect
              label=""
              valueId={formProjectId}
              options={projects}
              onChangeId={(pid) => setFormProjectId(pid)}
              placeholder={projectsLoading ? "Loading…" : "Select project"}
              disabled={projectsLoading}
            />
          </Box>
        ) : null
      }
    />
  );
}
